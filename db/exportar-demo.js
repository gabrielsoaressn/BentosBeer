/**
 * Exporta um retrato do banco para a demonstração estática.
 *
 *   npm run demo:dados
 *
 * Grava `public/demo/dados.json` com as tabelas-base — e só elas. Views,
 * totais e relatórios NÃO vão no arquivo: são recalculados no navegador a
 * partir destas linhas, exatamente como o SQL faz. É o que permite abrir uma
 * comanda na demonstração e ver o relatório mudar de verdade.
 *
 * Rode depois de `npm run db:reset` para o retrato sair de um banco povoado.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, fecharPool } from '../src/db/pool.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public', 'demo', 'dados.json');

async function principal() {
  const [mesas, categorias, produtos, garcons, clientes, comandas, itens] = await Promise.all([
    query('SELECT id, numero, lugares FROM mesa ORDER BY numero'),
    query('SELECT id, nome, ordem FROM categoria ORDER BY ordem'),
    query(`SELECT id, categoria_id, nome, descricao, preco, disponivel
             FROM produto ORDER BY id`),
    query('SELECT id, nome, apelido, ativo FROM garcom ORDER BY id'),
    query('SELECT id, nome, telefone, criado_em FROM cliente ORDER BY id'),
    query(`SELECT id, mesa_id, garcom_id, cliente_id, status, aberta_em, fechada_em, observacao
             FROM comanda ORDER BY id`),
    query(`SELECT id, comanda_id, produto_id, qtd, preco_unitario, status, criado_em
             FROM item_comanda ORDER BY id`),
  ]);

  // DECIMAL chega como string; aqui pode virar número, porque a demonstração
  // não soma dinheiro no JavaScript por preguiça — soma porque não tem banco.
  const numerico = (linhas, ...campos) =>
    linhas.map((linha) => {
      const copia = { ...linha };
      for (const campo of campos) copia[campo] = Number(copia[campo]);
      return copia;
    });

  const booleano = (linhas, ...campos) =>
    linhas.map((linha) => {
      const copia = { ...linha };
      for (const campo of campos) copia[campo] = Boolean(copia[campo]);
      return copia;
    });

  const retrato = {
    // a data serve para a demonstração avisar quando o retrato ficou velho
    geradoEm: (await query('SELECT DATE(NOW()) AS hoje'))[0].hoje,
    mesas,
    categorias,
    produtos: booleano(numerico(produtos, 'preco'), 'disponivel'),
    garcons: booleano(garcons, 'ativo'),
    clientes,
    comandas,
    itens: numerico(itens, 'preco_unitario'),
  };

  await mkdir(dirname(DESTINO), { recursive: true });
  await writeFile(DESTINO, JSON.stringify(retrato), 'utf8');

  const tamanho = (JSON.stringify(retrato).length / 1024).toFixed(0);
  console.log(`
  retrato gravado em public/demo/dados.json (${tamanho} KB)

  ${mesas.length} mesas · ${categorias.length} categorias · ${produtos.length} produtos
  ${garcons.length} garçons · ${clientes.length} clientes
  ${comandas.length} comandas · ${itens.length} itens
`);
}

principal()
  .catch((erro) => {
    console.error('\n✗ não consegui exportar:', erro.sqlMessage ?? erro.message, '\n');
    process.exitCode = 1;
  })
  .finally(fecharPool);
