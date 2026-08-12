/**
 * Os seis relatórios.
 *
 * O teste que mais importa é o de coerência: cinco caminhos independentes de
 * agregação têm que chegar ao mesmo faturamento. Se um deles esquecer de
 * excluir item cancelado, ou de filtrar comanda aberta, a soma denuncia.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { subir, derrubar, pegar } from './ajuda.js';

before(subir);
after(derrubar);

const soma = (lista, campo) => lista.reduce((total, linha) => total + Number(linha[campo]), 0);
const perto = (a, b) => Math.abs(a - b) < 0.005;

describe('resumo', () => {
  test('devolve os números do período e o estado do salão', async () => {
    const { status, corpo } = await pegar('/relatorios/resumo');

    assert.equal(status, 200);
    assert.ok(corpo.comandas > 0, 'o seed deixa comandas fechadas no período');
    assert.ok(corpo.faturamento > 0);
    assert.equal(typeof corpo.faturamento, 'number', 'dinheiro chega convertido na borda');
    assert.equal(typeof corpo.itens_vendidos, 'number', 'contagem não pode vir como string');
    assert.ok(corpo.salao.mesas >= corpo.salao.mesas_livres);
  });

  test('ticket médio é o faturamento dividido pelas comandas', async () => {
    const { corpo } = await pegar('/relatorios/resumo');
    assert.ok(perto(corpo.ticket_medio, Math.round((corpo.faturamento / corpo.comandas) * 100) / 100));
  });
});

describe('coerência entre os relatórios', () => {
  test('cinco agregações independentes chegam ao mesmo faturamento', async () => {
    const [resumo, diario, top, garcons, horas] = await Promise.all([
      pegar('/relatorios/resumo'),
      pegar('/relatorios/faturamento-diario'),
      pegar('/relatorios/top-produtos?limite=50'),
      pegar('/relatorios/por-garcom'),
      pegar('/relatorios/por-hora'),
    ]);

    const referencia = resumo.corpo.faturamento;

    assert.ok(perto(soma(diario.corpo, 'faturamento'), referencia), 'soma por dia');
    assert.ok(perto(soma(garcons.corpo, 'receita'), referencia), 'soma por garçom');
    assert.ok(perto(soma(horas.corpo, 'faturamento'), referencia), 'soma por hora');
    assert.ok(perto(soma(top.corpo, 'receita'), referencia), 'soma por produto');
  });

  test('as comandas do resumo batem com a soma por dia', async () => {
    const [resumo, diario] = await Promise.all([
      pegar('/relatorios/resumo'),
      pegar('/relatorios/faturamento-diario'),
    ]);
    assert.equal(soma(diario.corpo, 'comandas'), resumo.corpo.comandas);
  });
});

describe('faturamento diário', () => {
  test('devolve dias em ordem crescente com o nome do dia da semana', async () => {
    const { corpo } = await pegar('/relatorios/faturamento-diario');

    assert.ok(corpo.length >= 20, `esperava pelo menos 20 dias com movimento, veio ${corpo.length}`);
    const dias = corpo.map((d) => d.dia);
    assert.deepEqual(dias, [...dias].sort(), 'a série precisa vir ordenada para o gráfico');
    assert.ok(corpo[0].dia_semana);
  });

  test('período sem movimento devolve lista vazia, não erro', async () => {
    const { status, corpo } = await pegar('/relatorios/faturamento-diario?de=2019-01-01&ate=2019-01-31');
    assert.equal(status, 200);
    assert.deepEqual(corpo, []);
  });
});

describe('top produtos', () => {
  test('vem ordenado por receita e respeita o limite', async () => {
    const { corpo } = await pegar('/relatorios/top-produtos?limite=5');

    assert.equal(corpo.length, 5);
    const receitas = corpo.map((p) => p.receita);
    assert.deepEqual(receitas, [...receitas].sort((a, b) => b - a));
    assert.equal(typeof corpo[0].unidades, 'number');
  });

  test('limite fora da faixa é recusado com 400', async () => {
    assert.equal((await pegar('/relatorios/top-produtos?limite=999')).status, 400);
    assert.equal((await pegar('/relatorios/top-produtos?limite=0')).status, 400);
  });

  test('limite com SQL injetado é recusado antes de chegar ao banco', async () => {
    // o LIMIT é interpolado (o mysql2 recusa placeholder em LIMIT), então esta
    // é a barreira que impede injeção — precisa continuar de pé
    const { status, corpo } = await pegar('/relatorios/top-produtos?limite=1%3B%20DROP%20TABLE%20mesa');
    assert.equal(status, 400);
    assert.equal(corpo.campo, 'limite');

    const { corpo: mesas } = await pegar('/mesas');
    assert.ok(mesas.length > 0, 'a tabela mesa continua de pé');
  });
});

describe('por garçom', () => {
  test('traz comandas, receita, ticket médio e tempo de mesa', async () => {
    const { corpo } = await pegar('/relatorios/por-garcom');

    assert.ok(corpo.length > 0);
    for (const garcom of corpo) {
      assert.ok(garcom.receita > 0, 'HAVING receita > 0 exclui quem só teve cancelamento');
      assert.ok(perto(garcom.ticket_medio, Math.round((garcom.receita / garcom.comandas) * 100) / 100));
      assert.equal(typeof garcom.minutos_medios, 'number');
    }
  });
});

describe('por hora', () => {
  test('as horas são inteiros de 0 a 23, em ordem', async () => {
    const { corpo } = await pegar('/relatorios/por-hora');
    const horas = corpo.map((h) => h.hora);

    assert.deepEqual(horas, [...horas].sort((a, b) => a - b));
    for (const hora of horas) {
      assert.ok(Number.isInteger(hora) && hora >= 0 && hora <= 23);
    }
  });

  test('o movimento se concentra no horário de bar', async () => {
    const { corpo } = await pegar('/relatorios/por-hora');
    const noite = soma(corpo.filter((h) => h.hora >= 18 || h.hora <= 1), 'comandas');
    const total = soma(corpo, 'comandas');
    assert.ok(noite / total > 0.9, `esperava movimento noturno, veio ${noite}/${total}`);
  });
});

describe('ranking por categoria', () => {
  test('a posição reinicia em cada seção e respeita o corte', async () => {
    const { corpo } = await pegar('/relatorios/ranking-categoria?porCategoria=3');

    const porSecao = new Map();
    for (const linha of corpo) {
      assert.ok(linha.posicao >= 1 && linha.posicao <= 3);
      porSecao.set(linha.categoria, [...(porSecao.get(linha.categoria) ?? []), linha]);
    }

    assert.ok(porSecao.size > 1, 'mais de uma seção no ranking');
    for (const [, linhas] of porSecao) {
      assert.equal(linhas[0].posicao, 1, 'toda seção começa na posição 1');
      const receitas = linhas.map((l) => l.receita);
      assert.deepEqual(receitas, [...receitas].sort((a, b) => b - a));
    }
  });
});

describe('validação de período', () => {
  test('data inicial posterior à final devolve 400', async () => {
    const { status, corpo } = await pegar('/relatorios/resumo?de=2026-08-10&ate=2026-08-01');
    assert.equal(status, 400);
    assert.equal(corpo.campo, 'de');
  });

  test('formato de data inválido devolve 400', async () => {
    assert.equal((await pegar('/relatorios/resumo?de=01/08/2026')).status, 400);
    assert.equal((await pegar('/relatorios/resumo?de=2026-02-30')).status, 400);
  });

  test('o período recorta o resultado', async () => {
    const { corpo: tudo } = await pegar('/relatorios/faturamento-diario');
    const meio = tudo[Math.floor(tudo.length / 2)].dia;
    const { corpo: recortado } = await pegar(`/relatorios/faturamento-diario?de=${meio}`);

    assert.ok(recortado.length < tudo.length);
    assert.ok(recortado.every((d) => d.dia >= meio));
  });
});
