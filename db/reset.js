/**
 * Derruba, recria e popula o banco.
 *
 *   npm run db:reset                     -> banco de desenvolvimento (DB_NAME do .env)
 *   node db/reset.js --banco-de-teste     -> banco de teste (DB_NAME + "_test")
 *
 * Rodar duas vezes seguidas tem que dar o mesmo resultado, e por isso a primeira
 * coisa que ele faz e um DROP DATABASE.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const AQUI = dirname(fileURLToPath(import.meta.url));

// O nome que os arquivos .sql usam. Trocado por DB_NAME quando o alvo e outro
// (o banco de teste, por exemplo), para que 01_schema.sql continue legivel e
// executavel direto no Workbench, sem placeholder estranho no meio.
const BANCO_PADRAO = 'bentosbeer';

/**
 * Fatia um arquivo .sql em instrucoes, respeitando a diretiva DELIMITER.
 *
 * DELIMITER e comando do cliente de linha de comando mysql, nao e SQL -- o
 * driver mysql2 nao a entende. Como trigger e procedure precisam de ; internos,
 * o arquivo depende dela, e alguem tem que interpretar. E este alguem.
 */
function dividirEmInstrucoes(sql) {
  const instrucoes = [];
  let delimitador = ';';
  let bloco = '';

  for (const linhaBruta of sql.split('\n')) {
    const linha = linhaBruta.trim();

    const troca = /^DELIMITER\s+(\S+)$/i.exec(linha);
    if (troca) {
      if (bloco.trim()) instrucoes.push(bloco.trim());
      bloco = '';
      delimitador = troca[1];
      continue;
    }

    bloco += linhaBruta + '\n';

    // linha de comentario nunca encerra instrucao, mesmo que termine em ;
    const efetiva = linha.startsWith('--') ? '' : linha;
    if (efetiva.endsWith(delimitador)) {
      const inteira = bloco.trim();
      instrucoes.push(inteira.slice(0, inteira.length - delimitador.length).trim());
      bloco = '';
    }
  }
  if (bloco.trim()) instrucoes.push(bloco.trim());

  // descarta o que sobrou vazio ou que e so comentario
  return instrucoes.filter(
    (i) => i && !i.split('\n').every((l) => !l.trim() || l.trim().startsWith('--'))
  );
}

async function rodarArquivo(conexao, caminho, banco) {
  let sql = await readFile(join(AQUI, caminho), 'utf8');
  if (banco !== BANCO_PADRAO) {
    sql = sql.replaceAll(BANCO_PADRAO, banco);
  }

  const instrucoes = dividirEmInstrucoes(sql);
  for (const [i, instrucao] of instrucoes.entries()) {
    try {
      await conexao.query(instrucao);
    } catch (erro) {
      const primeiraLinha = instrucao.split('\n').find((l) => l.trim() && !l.trim().startsWith('--'));
      console.error(`\n✗ ${caminho}: falhou na instrucao ${i + 1}/${instrucoes.length}`);
      console.error(`  ${primeiraLinha?.slice(0, 100)}`);
      console.error(`  ${erro.sqlMessage ?? erro.message}\n`);
      throw erro;
    }
  }
  return instrucoes.length;
}

async function principal() {
  const deTeste = process.argv.includes('--banco-de-teste');
  const base = process.env.DB_NAME ?? BANCO_PADRAO;
  const banco = deTeste ? `${base}_test` : base;

  const conexao = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    // sem `database`: ele ainda nao existe neste ponto
    multipleStatements: true,
  });

  try {
    console.log(`\n  Bento's Beer -- recriando o banco "${banco}"\n`);

    await conexao.query(`DROP DATABASE IF EXISTS \`${banco}\``);
    console.log('  · banco anterior derrubado');

    const nSchema = await rodarArquivo(conexao, '01_schema.sql', banco);
    console.log(`  · 01_schema.sql aplicado (${nSchema} instrucoes)`);

    const nSeed = await rodarArquivo(conexao, '02_seed.sql', banco);
    console.log(`  · 02_seed.sql aplicado (${nSeed} instrucoes)`);

    await conexao.query(`USE \`${banco}\``);
    const [[contagens]] = await conexao.query(`
      SELECT (SELECT COUNT(*) FROM mesa)                                    AS mesas,
             (SELECT COUNT(*) FROM categoria)                               AS categorias,
             (SELECT COUNT(*) FROM produto)                                 AS produtos,
             (SELECT COUNT(*) FROM garcom)                                  AS garcons,
             (SELECT COUNT(*) FROM cliente)                                 AS clientes,
             (SELECT COUNT(*) FROM comanda WHERE status = 'fechada')        AS fechadas,
             (SELECT COUNT(*) FROM comanda WHERE status = 'aberta')         AS abertas,
             (SELECT COUNT(*) FROM item_comanda)                            AS itens,
             (SELECT COUNT(DISTINCT DATE(fechada_em)) FROM comanda
               WHERE status = 'fechada')                                    AS dias_com_venda,
             (SELECT COALESCE(SUM(total), 0) FROM vw_comanda
               WHERE status = 'fechada')                                    AS faturamento
    `);

    console.log(`
  ${contagens.mesas} mesas · ${contagens.categorias} categorias · ${contagens.produtos} produtos
  ${contagens.garcons} garcons · ${contagens.clientes} clientes
  ${contagens.fechadas} comandas fechadas em ${contagens.dias_com_venda} dias distintos
  ${contagens.abertas} comandas abertas agora · ${contagens.itens} itens lancados
  faturamento historico: R$ ${Number(contagens.faturamento).toFixed(2).replace('.', ',')}
`);
  } finally {
    await conexao.end();
  }
}

principal().catch((erro) => {
  if (erro.code === 'ECONNREFUSED') {
    console.error(
      `\n✗ Nao consegui conectar em ${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT ?? 3306}.` +
        '\n  O MySQL esta rodando? Suba com: npm run db:up\n'
    );
  } else if (erro.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('\n✗ Usuario ou senha recusados. Confira DB_USER e DB_PASSWORD no .env\n');
  }
  process.exitCode = 1;
});
