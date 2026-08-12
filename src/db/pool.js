/**
 * Acesso ao banco.
 *
 * Pool, e nao conexao unica: a versao anterior abria uma conexao no boot e a
 * compartilhava entre todas as requisicoes, o que serializa o sistema inteiro e
 * derruba tudo junto quando aquela conexao cai.
 *
 * Tres formas de falar com o banco, em ordem de preferencia:
 *
 *   query(sql, params)  -- o caso comum, prepared statement, uma instrucao
 *   tx(fn)              -- varias instrucoes que precisam ser atomicas
 *   comConexao(fn)      -- quando as instrucoes precisam da MESMA conexao
 *                          fisica (o CALL ... OUT do fechamento de comanda)
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Caminho explicito para o .env, e nao `import 'dotenv/config'`: aquele procura
// o arquivo no diretorio de trabalho, entao rodar um script de fora da raiz do
// projeto carregaria zero credencial e o erro que aparece e um "Access denied"
// enigmatico, como se a senha estivesse errada.
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env'), quiet: true });

// Fuso do bar. Fixo, e nao herdado do servidor: uma instancia MySQL em UTC faria
// o dia virar as 21h locais, e a venda do horario de pico cairia no relatorio do
// dia seguinte. O Brasil nao tem mais horario de verao, entao -03:00 vale sempre.
const FUSO = '-03:00';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'bentosbeer',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Datas voltam como string, exatamente como estao gravadas, sem conversao
  // para objeto Date. Para um sistema de um bar so, em um fuso so, a hora de
  // parede e a verdade -- e isso elimina de uma vez a classe de bug em que o
  // horario muda tres vezes no caminho entre o banco e a tela.
  dateStrings: true,

  // DECIMAL continua chegando como string, que e o default e o que preserva a
  // precisao do centavo. Virar numero e trabalho da borda da resposta HTTP.
  decimalNumbers: false,
});

// Reforca o fuso em cada conexao nova do pool, para o sistema ficar correto
// mesmo apontado para uma instancia MySQL de terceiros configurada em UTC.
//
// O comando entra na fila daquela conexao antes de qualquer consulta da
// aplicacao -- o mysql2 serializa os comandos por conexao -- entao nenhuma
// consulta corre com o fuso errado.
//
// O `.promise()` no meio nao e enfeite: mesmo usando mysql2/promise, este
// evento entrega a conexao crua, no estilo callback. Chamar `.query().catch()`
// direto nela lanca "result of query that is not a promise" e pendura a
// primeira requisicao do servidor.
pool.on('connection', (conexao) => {
  const comPromise = typeof conexao.promise === 'function' ? conexao.promise() : conexao;
  Promise.resolve(comPromise.query(`SET time_zone = '${FUSO}'`)).catch(() => {
    // Se falhar, o erro reaparece na primeira consulta de verdade, com mensagem
    // melhor. Engolir aqui evita derrubar o processo por unhandled rejection
    // dentro de um event handler.
  });
});

/** Uma instrucao, com prepared statement. Devolve as linhas. */
export async function query(sql, params = []) {
  const [linhas] = await pool.execute(sql, params);
  return linhas;
}

/** Uma instrucao que devolve metadados (insertId, affectedRows). */
export async function executar(sql, params = []) {
  const [resultado] = await pool.execute(sql, params);
  return resultado;
}

/**
 * Roda fn dentro de uma transacao. Commit no fim, rollback em qualquer erro.
 * fn recebe a conexao e deve usa-la para tudo -- usar `query` de fora dela
 * pegaria outra conexao do pool, fora da transacao.
 */
export async function tx(fn) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await fn(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

/**
 * Empresta uma conexao do pool sem abrir transacao.
 *
 * Existe por causa do fechamento de comanda: sp_fechar_comanda tem parametro
 * OUT, e ler esse parametro exige duas instrucoes -- o CALL e o SELECT @var --
 * na MESMA conexao fisica. Com `query` cada uma poderia cair em uma conexao
 * diferente, e a variavel de sessao nao existe fora da conexao que a definiu:
 * o SELECT voltaria NULL de forma intermitente, sob carga.
 */
export async function comConexao(fn) {
  const conexao = await pool.getConnection();
  try {
    return await fn(conexao);
  } finally {
    conexao.release();
  }
}

/** Confere se o banco responde. Usado por GET /api/status e pelos testes. */
export async function ping() {
  const [linha] = await query('SELECT 1 AS ok');
  return linha?.ok === 1;
}

export async function fecharPool() {
  await pool.end();
}
