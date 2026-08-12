/**
 * Cadastros e as barreiras de integridade.
 *
 * Boa parte destes testes é regressão de bug que a versão anterior tinha: o PUT
 * que devolvia 404 em registro existente, o DELETE que virava 500, a busca que
 * só filtrava o que estava na tela, o backend baixável por HTTP.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { subir, derrubar, pegar, criar, trocar, remover, mesaDoSeed } from './ajuda.js';

before(subir);
after(derrubar);

describe('CRUD simétrico', () => {
  for (const [recurso, corpoCriar, corpoEditar] of [
    ['categorias', { nome: 'Seção de Teste', ordem: 90 }, { nome: 'Seção Editada', ordem: 91 }],
    ['clientes', { nome: 'Cliente de Teste' }, { nome: 'Cliente Editado', telefone: '(83) 90000-0000' }],
    ['garcons', { nome: 'Garçom de Teste', apelido: 'GT' }, { nome: 'Garçom Editado', ativo: false }],
    ['mesas', { numero: 991, lugares: 4 }, { numero: 992, lugares: 6 }],
  ]) {
    test(`${recurso}: cria, lê, edita e remove`, async () => {
      const criado = await criar(`/${recurso}`, corpoCriar);
      assert.equal(criado.status, 201, JSON.stringify(criado.corpo));
      const id = criado.corpo.id;

      const lido = await pegar(`/${recurso}/${id}`);
      assert.equal(lido.status, 200);

      const editado = await trocar(`/${recurso}/${id}`, corpoEditar);
      assert.equal(editado.status, 200);

      const removido = await remover(`/${recurso}/${id}`);
      assert.equal(removido.status, 200);

      assert.equal((await pegar(`/${recurso}/${id}`)).status, 404);
    });
  }

  test('produtos: cria, lê, edita e remove', async () => {
    const { corpo: categorias } = await pegar('/categorias');

    const criado = await criar('/produtos', {
      categoriaId: categorias[0].id, nome: 'Produto de Teste', preco: 13.5,
    });
    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.preco, 13.5);
    assert.equal(criado.corpo.disponivel, true, 'booleano, não 1');

    const editado = await trocar(`/produtos/${criado.corpo.id}`, {
      categoriaId: categorias[1].id, nome: 'Produto de Teste', preco: 15, disponivel: false,
    });
    assert.equal(editado.corpo.disponivel, false);
    assert.equal(editado.corpo.categoria, categorias[1].nome);

    assert.equal((await remover(`/produtos/${criado.corpo.id}`)).status, 200);
  });

  test('PUT sem mudar nada não devolve 404 (regressão do affectedRows)', async () => {
    const { corpo: categorias } = await pegar('/categorias');
    const alvo = categorias[0];

    const { status } = await trocar(`/categorias/${alvo.id}`, { nome: alvo.nome, ordem: alvo.ordem });

    assert.equal(status, 200, 'sem FOUND_ROWS o MySQL conta linhas alteradas, e daria zero aqui');
  });
});

describe('integridade referencial devolve 409, não 500', () => {
  test('categoria com produto no cardápio', async () => {
    const { corpo } = await pegar('/categorias');
    const comProduto = corpo.find((c) => c.produtos > 0);
    const { status, corpo: erro } = await remover(`/categorias/${comProduto.id}`);

    assert.equal(status, 409);
    assert.match(erro.erro, /produtos no cardápio/i);
  });

  test('mesa com comanda no histórico', async () => {
    // uma mesa do seed, que tem comandas; as mesas criadas pelos testes são
    // novas e podem ser apagadas sem problema
    const mesa = await mesaDoSeed();
    const { status } = await remover(`/mesas/${mesa.id}`);
    assert.equal(status, 409);
  });

  test('garçom com comanda no histórico', async () => {
    const { corpo } = await pegar('/garcons');
    const comHistorico = corpo.find((g) => g.comandas_fechadas > 0 || g.comandas_abertas > 0);
    const { status } = await remover(`/garcons/${comHistorico.id}`);
    assert.equal(status, 409);
  });

  test('produto já vendido', async () => {
    const { corpo } = await pegar('/relatorios/top-produtos?limite=1');
    const { status, corpo: erro } = await remover(`/produtos/${corpo[0].id}`);

    assert.equal(status, 409);
    assert.match(erro.erro, /já foi vendido/i);
  });

  test('apagar cliente com histórico é permitido e anonimiza a venda', async () => {
    // ON DELETE SET NULL: a venda continua registrada, a comanda fica sem nome
    const { corpo: clientes } = await pegar('/clientes');
    const comVisita = clientes.find((c) => c.comandas > 0);

    const antes = (await pegar('/relatorios/resumo')).corpo.faturamento;
    assert.equal((await remover(`/clientes/${comVisita.id}`)).status, 200);
    const depois = (await pegar('/relatorios/resumo')).corpo.faturamento;

    assert.equal(depois, antes, 'apagar cliente não pode apagar faturamento');
  });
});

describe('unicidade devolve 409 com o campo', () => {
  test('mesa com número repetido', async () => {
    const mesa = await mesaDoSeed();
    const { status, corpo } = await criar('/mesas', { numero: mesa.numero, lugares: 4 });

    assert.equal(status, 409);
    assert.equal(corpo.campo, 'numero');
  });

  test('produto com nome repetido', async () => {
    const { corpo: produtos } = await pegar('/produtos');
    const { status, corpo } = await criar('/produtos', {
      categoriaId: produtos[0].categoria_id, nome: produtos[0].nome, preco: 9,
    });

    assert.equal(status, 409);
    assert.equal(corpo.campo, 'nome');
  });
});

describe('validação de entrada', () => {
  const casos = [
    ['preço negativo', 'produtos', { categoriaId: 1, nome: 'Teste Preço', preco: -5 }, 'preco'],
    ['preço não numérico', 'produtos', { categoriaId: 1, nome: 'Teste Preço', preco: 'caro' }, 'preco'],
    ['sem nome', 'produtos', { categoriaId: 1, preco: 9 }, 'nome'],
    ['mesa número zero', 'mesas', { numero: 0 }, 'numero'],
    ['mesa com 30 lugares', 'mesas', { numero: 995, lugares: 30 }, 'lugares'],
    ['nome de uma letra', 'clientes', { nome: 'A' }, 'nome'],
    ['booleano inválido', 'garcons', { nome: 'Teste', ativo: 'talvez' }, 'ativo'],
  ];

  for (const [descricao, recurso, corpoEnvio, campo] of casos) {
    test(`${descricao} → 400 apontando "${campo}"`, async () => {
      const { status, corpo } = await criar(`/${recurso}`, corpoEnvio);
      assert.equal(status, 400);
      assert.equal(corpo.campo, campo);
    });
  }

  test('id não numérico na URL → 400', async () => {
    const { status, corpo } = await pegar('/produtos/abc');
    assert.equal(status, 400);
    assert.equal(corpo.campo, 'id');
  });

  test('campo não declarado é ignorado, não gravado', async () => {
    const { status, corpo } = await criar('/clientes', {
      nome: 'Cliente Extra', invasor: 'DROP TABLE mesa',
    });
    assert.equal(status, 201);
    assert.equal(corpo.invasor, undefined);
    await remover(`/clientes/${corpo.id}`);
  });

  test('JSON quebrado → 400, não 500', async () => {
    const resposta = await fetch(`${await subir()}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"nome": ',
    });
    assert.equal(resposta.status, 400);
  });
});

describe('busca server-side', () => {
  test('filtra no banco, e não só o que está na tela', async () => {
    const { corpo: todos } = await pegar('/produtos');
    const { corpo: filtrados } = await pegar('/produtos?busca=chope');

    assert.ok(filtrados.length > 0);
    assert.ok(filtrados.length < todos.length);
    assert.ok(filtrados.every((p) => /chope/i.test(`${p.nome} ${p.descricao ?? ''}`)));
  });

  test('a busca é case-insensitive e alcança a descrição', async () => {
    const maiuscula = await pegar('/produtos?busca=CHOPE');
    const minuscula = await pegar('/produtos?busca=chope');
    assert.equal(maiuscula.corpo.length, minuscula.corpo.length);

    const { corpo: porDescricao } = await pegar('/produtos?busca=torrado');
    assert.ok(porDescricao.length > 0);
  });

  test('SQL injetado na busca não faz nada — a query é parametrizada', async () => {
    const { status, corpo } = await pegar("/produtos?busca=' OR 1=1 --");
    assert.equal(status, 200);
    assert.deepEqual(corpo, [], 'a string entrou como texto, não como SQL');

    assert.ok((await pegar('/produtos')).corpo.length > 0, 'a tabela continua de pé');
  });
});

describe('o backend não é baixável por HTTP', () => {
  for (const caminho of [
    '/src/db/pool.js', '/src/server.js', '/.env', '/db/01_schema.sql', '/package.json',
  ]) {
    test(`GET ${caminho} → 404`, async () => {
      const base = (await subir()).replace('/api', '');
      const resposta = await fetch(base + caminho);
      assert.equal(resposta.status, 404, 'furo 9.2-3: o servidor servia o projeto inteiro');
    });
  }

  test('rota de API inexistente → 404 com o contrato de erro', async () => {
    const { status, corpo } = await pegar('/nao-existe');
    assert.equal(status, 404);
    assert.ok(corpo.erro);
  });
});
