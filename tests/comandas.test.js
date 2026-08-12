/**
 * Operação de comanda — o que o sistema faz de mais importante.
 *
 * Cada teste aqui existe por um motivo específico, e vários cobrem bugs que a
 * versão anterior tinha de verdade.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  subir, derrubar, pegar, criar, alterar, trocar,
  abrirComanda, mesaLivre, primeiroGarcom, tresProdutos,
} from './ajuda.js';

before(subir);
after(derrubar);

describe('abrir comanda', () => {
  test('abre em mesa livre e devolve 201 com a comanda montada', async () => {
    const { comanda, mesa, garcom } = await abrirComanda();

    assert.equal(comanda.status, 'aberta');
    assert.equal(comanda.mesa, mesa.numero);
    assert.equal(comanda.garcom, garcom.nome);
    assert.equal(comanda.total, 0);
    assert.deepEqual(comanda.itens, []);
    assert.equal(comanda.fechada_em, null);
  });

  test('a mesa passa a aparecer como ocupada no salão', async () => {
    const { comanda, mesa } = await abrirComanda();
    const { corpo: salao } = await pegar('/salao');
    const depois = salao.find((m) => m.mesa_id === mesa.mesa_id);

    assert.equal(depois.situacao, 'ocupada');
    assert.equal(depois.comanda_id, comanda.id);
  });

  test('segunda comanda na mesma mesa é recusada com 409 pelo banco', async () => {
    const { mesa, garcom } = await abrirComanda();
    const { status, corpo } = await criar('/comandas', { mesaId: mesa.mesa_id, garcomId: garcom.id });

    assert.equal(status, 409);
    assert.match(corpo.erro, /mesa já tem uma comanda aberta/i);
    assert.equal(corpo.campo, 'mesaId');
  });

  test('mesa inexistente devolve 404, não 500', async () => {
    const garcom = await primeiroGarcom();
    const { status, corpo } = await criar('/comandas', { mesaId: 99999, garcomId: garcom.id });

    assert.equal(status, 404);
    assert.equal(corpo.campo, 'mesaId');
  });

  test('cliente é opcional — mesa de passagem não exige cadastro', async () => {
    const { comanda } = await abrirComanda();
    assert.equal(comanda.cliente, null);
  });

  test('comanda sem nenhum item conta zero itens ativos', async () => {
    const { comanda } = await abrirComanda();

    // Regressão: vw_comanda usava COUNT(IF(i.status = 'cancelado', NULL, 1)), e
    // com LEFT JOIN sem itens o i.status vem NULL -- a comparação não é
    // verdadeira, o IF caía no ramo do senão e contava 1. A tela mostrava
    // "1 item" numa comanda vazia.
    // em GET /comandas/:id o campo `itens` e o array; a contagem vem na listagem
    assert.deepEqual(comanda.itens, []);
    assert.equal(comanda.itens_ativos, 0);

    const { corpo: lista } = await pegar('/comandas?status=aberta');
    assert.equal(lista.find((c) => c.id === comanda.id).itens_ativos, 0);
  });
});

describe('lançar e riscar item', () => {
  test('lança item e o subtotal sai da quantidade vezes o preço', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();

    const { status, corpo: item } = await criar(`/comandas/${comanda.id}/itens`, {
      produtoId: produto.id, qtd: 3,
    });

    assert.equal(status, 201);
    assert.equal(item.qtd, 3);
    assert.equal(item.preco_unitario, produto.preco);
    assert.equal(item.subtotal, produto.preco * 3);
    assert.equal(item.status, 'pendente');
  });

  test('o preço vem do cardápio, nunca do cliente', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();

    // um cliente malicioso, ou um front desatualizado, tentando ditar o valor
    const { corpo: item } = await criar(`/comandas/${comanda.id}/itens`, {
      produtoId: produto.id, qtd: 1, preco_unitario: 0.01, preco: 0.01, subtotal: 0.01,
    });

    assert.equal(item.preco_unitario, produto.preco);
    assert.equal(item.subtotal, produto.preco);
  });

  test('reajustar o produto depois NÃO muda o item já lançado', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();

    const { corpo: item } = await criar(`/comandas/${comanda.id}/itens`, {
      produtoId: produto.id, qtd: 2,
    });
    const precoNaVenda = item.preco_unitario;

    // dobra o preço no cardápio
    const novoPreco = Number(produto.preco) * 2 + 1;
    const { status } = await trocar(`/produtos/${produto.id}`, {
      categoriaId: produto.categoria_id,
      nome: produto.nome,
      preco: novoPreco,
      disponivel: true,
    });
    assert.equal(status, 200);

    const { corpo: depois } = await pegar(`/comandas/${comanda.id}`);
    const mesmoItem = depois.itens.find((i) => i.id === item.id);

    assert.equal(mesmoItem.preco_unitario, precoNaVenda,
      'o preço congelado no item não pode acompanhar o cardápio');
    assert.equal(mesmoItem.subtotal, precoNaVenda * 2);

    // devolve o cardápio ao estado anterior
    await trocar(`/produtos/${produto.id}`, {
      categoriaId: produto.categoria_id, nome: produto.nome,
      preco: produto.preco, disponivel: true,
    });
  });

  test('riscar item zera o subtotal e mantém a linha no histórico', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();
    const { corpo: item } = await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 2 });

    const { status, corpo: riscado } = await alterar(
      `/comandas/${comanda.id}/itens/${item.id}`, { status: 'cancelado' }
    );

    assert.equal(status, 200);
    assert.equal(riscado.status, 'cancelado');
    assert.equal(riscado.subtotal, 0);

    const { corpo: atual } = await pegar(`/comandas/${comanda.id}`);
    assert.equal(atual.itens.length, 1, 'a linha continua na comanda');
    assert.equal(atual.total, 0);
  });

  test('mudar a quantidade recalcula o subtotal', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();
    const { corpo: item } = await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 1 });

    const { corpo: mudado } = await alterar(`/comandas/${comanda.id}/itens/${item.id}`, { qtd: 5 });

    assert.equal(mudado.qtd, 5);
    assert.equal(mudado.subtotal, Number(produto.preco) * 5);
  });

  test('quantidade zero é recusada com 400', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();
    const { status, corpo } = await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 0 });

    assert.equal(status, 400);
    assert.equal(corpo.campo, 'qtd');
  });

  test('produto inexistente devolve 404', async () => {
    const { comanda } = await abrirComanda();
    const { status } = await criar(`/comandas/${comanda.id}/itens`, { produtoId: 99999, qtd: 1 });
    assert.equal(status, 404);
  });

  test('comanda inexistente devolve 404', async () => {
    const [produto] = await tresProdutos();
    const { status } = await criar('/comandas/99999/itens', { produtoId: produto.id, qtd: 1 });
    assert.equal(status, 404);
  });
});

describe('fechar conta', () => {
  test('o total da procedure é a soma dos subtotais não cancelados', async () => {
    const { comanda } = await abrirComanda();
    const produtos = await tresProdutos();

    await criar(`/comandas/${comanda.id}/itens`, { produtoId: produtos[0].id, qtd: 2 });
    await criar(`/comandas/${comanda.id}/itens`, { produtoId: produtos[1].id, qtd: 1 });
    const { corpo: aRiscar } = await criar(`/comandas/${comanda.id}/itens`, {
      produtoId: produtos[2].id, qtd: 3,
    });
    await alterar(`/comandas/${comanda.id}/itens/${aRiscar.id}`, { status: 'cancelado' });

    const esperado = Number(produtos[0].preco) * 2 + Number(produtos[1].preco);

    const { status, corpo } = await criar(`/comandas/${comanda.id}/fechar`);

    assert.equal(status, 200);
    assert.equal(corpo.total, esperado);
    assert.equal(corpo.comanda.status, 'fechada');
    assert.notEqual(corpo.comanda.fechada_em, null);
  });

  test('o fechamento marca todo item pendente como entregue', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();
    await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 1 });

    await criar(`/comandas/${comanda.id}/fechar`);

    const { corpo: fechada } = await pegar(`/comandas/${comanda.id}`);
    assert.equal(fechada.itens.filter((i) => i.status === 'pendente').length, 0);
  });

  test('fechar duas vezes é recusado com 409', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();
    await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 1 });

    const primeira = await criar(`/comandas/${comanda.id}/fechar`);
    const segunda = await criar(`/comandas/${comanda.id}/fechar`);

    assert.equal(primeira.status, 200);
    assert.equal(segunda.status, 409);
    assert.match(segunda.corpo.erro, /já foi encerrada/i);
  });

  test('comanda fechada não aceita item novo nem alteração', async () => {
    const { comanda } = await abrirComanda();
    const [produto] = await tresProdutos();
    const { corpo: item } = await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 1 });
    await criar(`/comandas/${comanda.id}/fechar`);

    const lancar = await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 1 });
    const mexer = await alterar(`/comandas/${comanda.id}/itens/${item.id}`, { qtd: 9 });

    assert.equal(lancar.status, 409);
    assert.equal(mexer.status, 409);
  });

  test('fechar comanda inexistente devolve 404', async () => {
    const { status } = await criar('/comandas/99999/fechar');
    assert.equal(status, 404);
  });

  test('a mesa volta a aceitar comanda depois do fechamento', async () => {
    const { comanda, mesa, garcom } = await abrirComanda();
    await criar(`/comandas/${comanda.id}/fechar`);

    const { corpo: salao } = await pegar('/salao');
    assert.equal(salao.find((m) => m.mesa_id === mesa.mesa_id).situacao, 'livre');

    const { status } = await criar('/comandas', { mesaId: mesa.mesa_id, garcomId: garcom.id });
    assert.equal(status, 201, 'o UNIQUE bloqueia comanda aberta, não histórico');
  });
});

describe('cancelar comanda', () => {
  test('cancela, libera a mesa e não conta como receita', async () => {
    const { comanda, mesa } = await abrirComanda();
    const [produto] = await tresProdutos();
    await criar(`/comandas/${comanda.id}/itens`, { produtoId: produto.id, qtd: 2 });

    const { status, corpo } = await criar(`/comandas/${comanda.id}/cancelar`);

    assert.equal(status, 200);
    assert.equal(corpo.status, 'cancelada');

    const { corpo: salao } = await pegar('/salao');
    assert.equal(salao.find((m) => m.mesa_id === mesa.mesa_id).situacao, 'livre');

    const { corpo: fechadas } = await pegar('/comandas?status=fechada');
    assert.equal(fechadas.some((c) => c.id === comanda.id), false);
  });

  test('cancelar comanda já encerrada é recusado com 409', async () => {
    const { comanda } = await abrirComanda();
    await criar(`/comandas/${comanda.id}/cancelar`);
    const { status } = await criar(`/comandas/${comanda.id}/cancelar`);
    assert.equal(status, 409);
  });
});
