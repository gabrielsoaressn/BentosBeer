/**
 * Modo demonstração — o sistema funcionando sem servidor.
 *
 * O GitHub Pages entrega arquivo estático: não executa Node nem MySQL. Sem esta
 * camada, a página abriria e as dezessete chamadas de API dariam 404.
 *
 * O que ela faz: intercepta `fetch` para `/api/*` e responde a partir de um
 * retrato do banco real (`demo/dados.json`, gerado por `npm run demo:dados`),
 * mantendo o estado em memória. Abrir comanda, lançar item, riscar e fechar
 * funcionam de verdade — e o relatório muda, porque os totais são recalculados
 * a cada pedido, não vêm congelados no JSON.
 *
 * As regras do banco estão reimplementadas aqui, com as MESMAS mensagens de
 * erro: uma comanda aberta por mesa, item só em comanda aberta, sem fechar duas
 * vezes, preço vindo do cardápio. Uma demonstração que aceita o que o sistema
 * recusa engana mais do que ajuda.
 *
 * IMPORTANTE, e o motivo de este arquivo existir separado: isto é uma SEGUNDA
 * implementação do contrato da API, e pode divergir da primeira. A fonte da
 * verdade é `src/`, coberta por 69 testes. Aqui não há teste — é vitrine.
 *
 * Só liga em github.io ou com ?demo=1 na URL. Em localhost com servidor de pé,
 * este arquivo não faz nada.
 */

const LIGADO = location.hostname.endsWith('github.io') || new URLSearchParams(location.search).has('demo');

export const modoDemo = LIGADO;

if (LIGADO) await instalar();

async function instalar() {
  const dados = await (await fetch('demo/dados.json')).json();

  // cópia mutável: o que o visitante fizer vale só na aba dele, e some ao recarregar
  const bd = {
    mesas: [...dados.mesas],
    categorias: [...dados.categorias],
    produtos: dados.produtos.map((p) => ({ ...p })),
    garcons: dados.garcons.map((g) => ({ ...g })),
    clientes: dados.clientes.map((c) => ({ ...c })),
    comandas: dados.comandas.map((c) => ({ ...c })),
    itens: dados.itens.map((i) => ({ ...i })),
  };
  let proximoId = 100000;
  const novoId = () => ++proximoId;

  // ---------------------------------------------------------------- utilidades
  const agora = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const soData = (carimbo) => String(carimbo).slice(0, 10);
  const minutosEntre = (de, ate) =>
    Math.max(0, Math.round((new Date(ate.replace(' ', 'T')) - new Date(de.replace(' ', 'T'))) / 60000));

  const erro = (status, mensagem, campo) => ({ status, corpo: campo ? { erro: mensagem, campo } : { erro: mensagem } });
  const ok = (corpo, status = 200) => ({ status, corpo });

  // coluna gerada `subtotal`: zero quando cancelado
  const subtotal = (item) => (item.status === 'cancelado' ? 0 : item.qtd * item.preco_unitario);
  const itensDe = (comandaId) => bd.itens.filter((i) => i.comanda_id === comandaId);

  /** vw_comanda */
  function vwComanda(comanda) {
    const itens = itensDe(comanda.id);
    const mesa = bd.mesas.find((m) => m.id === comanda.mesa_id);
    const garcom = bd.garcons.find((g) => g.id === comanda.garcom_id);
    const cliente = bd.clientes.find((c) => c.id === comanda.cliente_id);
    return {
      id: comanda.id,
      status: comanda.status,
      aberta_em: comanda.aberta_em,
      fechada_em: comanda.fechada_em,
      mesa_id: comanda.mesa_id,
      garcom_id: comanda.garcom_id,
      cliente_id: comanda.cliente_id,
      mesa: mesa?.numero,
      garcom: garcom?.nome ?? null,
      cliente: cliente?.nome ?? null,
      itens: itens.length,
      itens_ativos: itens.filter((i) => i.status !== 'cancelado').length,
      total: arredonda(itens.reduce((s, i) => s + subtotal(i), 0)),
      minutos: minutosEntre(comanda.aberta_em, comanda.fechada_em ?? agora()),
    };
  }

  const arredonda = (n) => Math.round(n * 100) / 100;
  const abertaDaMesa = (mesaId) => bd.comandas.find((c) => c.mesa_id === mesaId && c.status === 'aberta');

  function itemDetalhado(item) {
    const produto = bd.produtos.find((p) => p.id === item.produto_id);
    const categoria = bd.categorias.find((c) => c.id === produto?.categoria_id);
    return {
      id: item.id,
      produto_id: item.produto_id,
      produto: produto?.nome,
      categoria: categoria?.nome,
      qtd: item.qtd,
      preco_unitario: item.preco_unitario,
      subtotal: arredonda(subtotal(item)),
      status: item.status,
      criado_em: item.criado_em,
    };
  }

  const contem = (texto, termo) => String(texto ?? '').toLowerCase().includes(termo.toLowerCase());

  // ------------------------------------------------------------------ rotas
  const rotas = [
    // ---- salão ----
    ['GET', /^\/salao$/, () =>
      ok(bd.mesas.map((mesa) => {
        const aberta = abertaDaMesa(mesa.id);
        const v = aberta ? vwComanda(aberta) : null;
        return {
          mesa_id: mesa.id, numero: mesa.numero, lugares: mesa.lugares,
          comanda_id: v?.id ?? null, garcom: v?.garcom ?? null, cliente: v?.cliente ?? null,
          total: v?.total ?? null, minutos: v?.minutos ?? null,
          situacao: v ? 'ocupada' : 'livre',
        };
      }).sort((a, b) => a.numero - b.numero))],

    // ---- comandas ----
    ['GET', /^\/comandas$/, (_, busca) => {
      let lista = bd.comandas.map(vwComanda);
      const status = busca.get('status');
      if (status) lista = lista.filter((c) => c.status === status);
      return ok(lista.sort((a, b) => (a.aberta_em < b.aberta_em ? 1 : -1)));
    }],

    ['GET', /^\/comandas\/(\d+)$/, ([id]) => {
      const comanda = bd.comandas.find((c) => c.id === Number(id));
      if (!comanda) return erro(404, 'Comanda não encontrada.');
      return ok({ ...vwComanda(comanda), itens: itensDe(comanda.id).map(itemDetalhado) });
    }],

    ['POST', /^\/comandas$/, (_, __, corpo) => {
      const mesaId = Number(corpo?.mesaId);
      const garcomId = Number(corpo?.garcomId);
      if (!mesaId) return erro(400, 'Informe mesaId.', 'mesaId');
      if (!bd.mesas.some((m) => m.id === mesaId)) return erro(404, 'Mesa não encontrada.', 'mesaId');
      if (!bd.garcons.some((g) => g.id === garcomId)) return erro(404, 'Garçom não encontrado.', 'garcomId');
      // uq_mesa_ocupada
      if (abertaDaMesa(mesaId)) return erro(409, 'Essa mesa já tem uma comanda aberta.', 'mesaId');

      const nova = {
        id: novoId(), mesa_id: mesaId, garcom_id: garcomId,
        cliente_id: corpo.clienteId ? Number(corpo.clienteId) : null,
        status: 'aberta', aberta_em: agora(), fechada_em: null,
        observacao: corpo.observacao ?? null,
      };
      bd.comandas.push(nova);
      return ok({ ...vwComanda(nova), itens: [] }, 201);
    }],

    ['POST', /^\/comandas\/(\d+)\/itens$/, ([id], _, corpo) => {
      const comanda = bd.comandas.find((c) => c.id === Number(id));
      if (!comanda) return erro(404, 'Comanda não encontrada.');
      // trg_item_antes_insert
      if (comanda.status !== 'aberta') return erro(409, 'Essa comanda não está aberta.');

      const produto = bd.produtos.find((p) => p.id === Number(corpo?.produtoId));
      if (!produto) return erro(404, 'Produto não encontrado.', 'produtoId');
      if (!produto.disponivel) return erro(409, 'Esse produto está esgotado.', 'produtoId');

      const qtd = corpo?.qtd === undefined ? 1 : Number(corpo.qtd);
      if (!Number.isInteger(qtd) || qtd < 1) return erro(400, 'qtd tem que ser entre 1 e 999.', 'qtd');

      const item = {
        id: novoId(), comanda_id: comanda.id, produto_id: produto.id, qtd,
        // o preço vem do cardápio, nunca do corpo da requisição
        preco_unitario: produto.preco, status: 'pendente', criado_em: agora(),
      };
      bd.itens.push(item);
      return ok(itemDetalhado(item), 201);
    }],

    ['PATCH', /^\/comandas\/(\d+)\/itens\/(\d+)$/, ([id, itemId], _, corpo) => {
      const comanda = bd.comandas.find((c) => c.id === Number(id));
      if (!comanda) return erro(404, 'Comanda não encontrada.');
      const item = bd.itens.find((i) => i.id === Number(itemId) && i.comanda_id === comanda.id);
      if (!item) return erro(404, 'Item não encontrado nessa comanda.', 'itemId');
      // trg_item_antes_update
      if (comanda.status !== 'aberta') return erro(409, 'Essa comanda já foi encerrada.');

      if (corpo?.qtd !== undefined) {
        const qtd = Number(corpo.qtd);
        if (!Number.isInteger(qtd) || qtd < 1) return erro(400, 'qtd tem que ser entre 1 e 999.', 'qtd');
        item.qtd = qtd;
      }
      if (corpo?.status !== undefined) {
        if (!['pendente', 'entregue', 'cancelado'].includes(corpo.status)) {
          return erro(400, 'status tem que ser um destes: pendente, entregue, cancelado.', 'status');
        }
        item.status = corpo.status;
      }
      return ok(itemDetalhado(item));
    }],

    // sp_fechar_comanda
    ['POST', /^\/comandas\/(\d+)\/fechar$/, ([id]) => {
      const comanda = bd.comandas.find((c) => c.id === Number(id));
      if (!comanda) return erro(404, 'Comanda não encontrada.');
      if (comanda.status !== 'aberta') return erro(409, 'Essa comanda já foi encerrada.');

      for (const item of itensDe(comanda.id)) {
        if (item.status === 'pendente') item.status = 'entregue';
      }
      const total = arredonda(itensDe(comanda.id).reduce((s, i) => s + subtotal(i), 0));
      comanda.status = 'fechada';
      comanda.fechada_em = agora();

      return ok({ id: comanda.id, total, comanda: { ...vwComanda(comanda), itens: itensDe(comanda.id).map(itemDetalhado) } });
    }],

    ['POST', /^\/comandas\/(\d+)\/cancelar$/, ([id]) => {
      const comanda = bd.comandas.find((c) => c.id === Number(id));
      if (!comanda) return erro(404, 'Comanda não encontrada.');
      if (comanda.status !== 'aberta') return erro(409, 'Essa comanda já foi encerrada.');
      comanda.status = 'cancelada';
      comanda.fechada_em = agora();
      return ok({ ...vwComanda(comanda), itens: itensDe(comanda.id).map(itemDetalhado) });
    }],

    // ---- cadastros ----
    ['GET', /^\/mesas$/, (_, busca) => {
      const termo = busca.get('busca') ?? '';
      return ok(bd.mesas
        .filter((m) => !termo || contem(m.numero, termo))
        .map((m) => {
          const aberta = abertaDaMesa(m.id);
          return {
            id: m.id, numero: m.numero, lugares: m.lugares,
            situacao: aberta ? 'ocupada' : 'livre',
            comanda_id: aberta?.id ?? null,
            total_aberto: aberta ? vwComanda(aberta).total : null,
          };
        })
        .sort((a, b) => a.numero - b.numero));
    }],

    ['GET', /^\/categorias$/, (_, busca) => {
      const termo = busca.get('busca') ?? '';
      return ok(bd.categorias
        .filter((c) => !termo || contem(c.nome, termo))
        .map((c) => {
          const seus = bd.produtos.filter((p) => p.categoria_id === c.id);
          return { ...c, produtos: seus.length, produtos_disponiveis: seus.filter((p) => p.disponivel).length };
        })
        .sort((a, b) => a.ordem - b.ordem));
    }],

    ['GET', /^\/produtos$/, (_, busca) => {
      const termo = busca.get('busca') ?? '';
      const categoriaId = busca.get('categoriaId');
      const disponivel = busca.get('disponivel');
      return ok(bd.produtos
        .filter((p) => !termo || contem(p.nome, termo) || contem(p.descricao, termo))
        .filter((p) => !categoriaId || p.categoria_id === Number(categoriaId))
        .filter((p) => disponivel === null || p.disponivel === (disponivel === 'true'))
        .map((p) => {
          const cat = bd.categorias.find((c) => c.id === p.categoria_id);
          return { ...p, categoria: cat?.nome, categoria_ordem: cat?.ordem };
        })
        .sort((a, b) => a.categoria_ordem - b.categoria_ordem || a.nome.localeCompare(b.nome, 'pt-BR')));
    }],

    ['GET', /^\/produtos\/(\d+)$/, ([id]) => {
      const p = bd.produtos.find((x) => x.id === Number(id));
      if (!p) return erro(404, 'Produto não encontrado.');
      const cat = bd.categorias.find((c) => c.id === p.categoria_id);
      return ok({ ...p, categoria: cat?.nome, categoria_ordem: cat?.ordem });
    }],

    ['GET', /^\/garcons$/, (_, busca) => {
      const termo = busca.get('busca') ?? '';
      const ativo = busca.get('ativo');
      return ok(bd.garcons
        .filter((g) => !termo || contem(g.nome, termo) || contem(g.apelido, termo))
        .filter((g) => ativo === null || g.ativo === (ativo === 'true'))
        .map((g) => {
          const suas = bd.comandas.filter((c) => c.garcom_id === g.id).map(vwComanda);
          return {
            ...g,
            comandas_abertas: suas.filter((c) => c.status === 'aberta').length,
            comandas_fechadas: suas.filter((c) => c.status === 'fechada').length,
            receita: arredonda(suas.filter((c) => c.status === 'fechada').reduce((s, c) => s + c.total, 0)),
          };
        })
        .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR')));
    }],

    ['GET', /^\/clientes$/, (_, busca) => {
      const termo = busca.get('busca') ?? '';
      return ok(bd.clientes
        .filter((c) => !termo || contem(c.nome, termo) || contem(c.telefone, termo))
        .map((cl) => {
          const suas = bd.comandas.filter((c) => c.cliente_id === cl.id).map(vwComanda);
          return {
            ...cl,
            comandas: suas.length,
            total_gasto: arredonda(suas.filter((c) => c.status === 'fechada').reduce((s, c) => s + c.total, 0)),
            ultima_visita: suas.length ? suas.map((c) => c.aberta_em).sort().at(-1) : null,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    }],

    // ---- relatórios: recalculados, não congelados ----
    ['GET', /^\/relatorios\/(.+)$/, ([nome], busca) => relatorio(nome, busca)],
  ];

  /** Comandas fechadas dentro do período, com os itens não cancelados. */
  function fechadasNoPeriodo(busca) {
    const hoje = soData(agora());
    const trintaAtras = soData(new Date(Date.now() - 29 * 864e5).toISOString());
    const de = busca.get('de') || trintaAtras;
    const ate = busca.get('ate') || hoje;
    return {
      de, ate,
      lista: bd.comandas.filter((c) =>
        c.status === 'fechada' && soData(c.fechada_em) >= de && soData(c.fechada_em) <= ate),
    };
  }

  function relatorio(nome, busca) {
    const de = busca.get('de');
    const ate = busca.get('ate');
    if (de && ate && de > ate) return erro(400, 'A data inicial é posterior à final.', 'de');

    const { lista, de: dePeriodo, ate: atePeriodo } = fechadasNoPeriodo(busca);
    const comTotais = lista.map(vwComanda);
    const faturamento = arredonda(comTotais.reduce((s, c) => s + c.total, 0));

    if (nome === 'resumo') {
      const abertas = bd.comandas.filter((c) => c.status === 'aberta').map(vwComanda);
      const vendidos = lista.flatMap((c) => itensDe(c.id))
        .filter((i) => i.status !== 'cancelado').reduce((s, i) => s + i.qtd, 0);
      return ok({
        periodo: { de: de ?? null, ate: ate ?? null },
        comandas: lista.length,
        faturamento,
        ticket_medio: lista.length ? arredonda(faturamento / lista.length) : 0,
        itens_vendidos: vendidos,
        salao: {
          comandas_abertas: abertas.length,
          total_aberto: arredonda(abertas.reduce((s, c) => s + c.total, 0)),
          mesas_livres: bd.mesas.filter((m) => !abertaDaMesa(m.id)).length,
          mesas: bd.mesas.length,
        },
      });
    }

    if (nome === 'faturamento-diario') {
      const porDia = new Map();
      for (const comanda of comTotais) {
        const dia = soData(comanda.fechada_em);
        const atual = porDia.get(dia) ?? { dia, comandas: 0, faturamento: 0 };
        atual.comandas += 1;
        atual.faturamento += comanda.total;
        porDia.set(dia, atual);
      }
      const SEMANA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return ok([...porDia.values()]
        .map((d) => ({ ...d, faturamento: arredonda(d.faturamento), dia_semana: SEMANA[new Date(`${d.dia}T12:00`).getDay()] }))
        .sort((a, b) => (a.dia < b.dia ? -1 : 1)));
    }

    if (nome === 'top-produtos' || nome === 'ranking-categoria') {
      const porProduto = new Map();
      for (const comanda of lista) {
        for (const item of itensDe(comanda.id)) {
          if (item.status === 'cancelado') continue;
          const atual = porProduto.get(item.produto_id) ?? { unidades: 0, receita: 0, comandas: new Set() };
          atual.unidades += item.qtd;
          atual.receita += subtotal(item);
          atual.comandas.add(comanda.id);
          porProduto.set(item.produto_id, atual);
        }
      }
      const linhas = [...porProduto.entries()].map(([produtoId, agregado]) => {
        const produto = bd.produtos.find((p) => p.id === produtoId);
        const categoria = bd.categorias.find((c) => c.id === produto?.categoria_id);
        return {
          id: produtoId, produto: produto?.nome,
          categoria: categoria?.nome, categoria_id: categoria?.id,
          unidades: agregado.unidades, receita: arredonda(agregado.receita),
          comandas: agregado.comandas.size,
          // top-produtos e ranking-categoria devolvem colunas diferentes; o
          // recorte fica em cada um, para nao mandar campo que a API real nao tem
        };
      });

      if (nome === 'top-produtos') {
        const limite = Number(busca.get('limite') ?? 10);
        if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
          return erro(400, 'limite tem que ser entre 1 e 50.', 'limite');
        }
        return ok(linhas
          .sort((a, b) => b.receita - a.receita)
          .slice(0, limite)
          .map(({ id, produto, categoria, unidades, receita, comandas }) =>
            ({ id, produto, categoria, unidades, receita, comandas })));
      }

      // RANK() OVER (PARTITION BY categoria ORDER BY receita DESC)
      const corte = Number(busca.get('porCategoria') ?? 3);
      const porCategoria = new Map();
      for (const linha of linhas.sort((a, b) => b.receita - a.receita)) {
        const jaTem = porCategoria.get(linha.categoria) ?? [];
        if (jaTem.length < corte) {
          jaTem.push({
            categoria_id: linha.categoria_id, categoria: linha.categoria,
            produto: linha.produto, unidades: linha.unidades, receita: linha.receita,
            posicao: jaTem.length + 1,
          });
          porCategoria.set(linha.categoria, jaTem);
        }
      }
      return ok([...porCategoria.values()].flat()
        .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.posicao - b.posicao));
    }

    if (nome === 'por-garcom') {
      const porGarcom = new Map();
      for (const comanda of comTotais) {
        const atual = porGarcom.get(comanda.garcom_id) ?? { comandas: 0, receita: 0, minutos: 0 };
        atual.comandas += 1;
        atual.receita += comanda.total;
        atual.minutos += comanda.minutos;
        porGarcom.set(comanda.garcom_id, atual);
      }
      return ok([...porGarcom.entries()]
        .map(([garcomId, a]) => {
          const g = bd.garcons.find((x) => x.id === garcomId);
          return {
            id: garcomId, garcom: g?.nome, apelido: g?.apelido,
            comandas: a.comandas, receita: arredonda(a.receita),
            ticket_medio: arredonda(a.receita / a.comandas),
            minutos_medios: Math.round(a.minutos / a.comandas),
          };
        })
        .filter((g) => g.receita > 0)   // HAVING receita > 0
        .sort((a, b) => b.receita - a.receita));
    }

    if (nome === 'por-hora') {
      const porHora = new Map();
      for (const comanda of comTotais) {
        const hora = Number(String(comanda.aberta_em).slice(11, 13));
        const atual = porHora.get(hora) ?? { hora, comandas: 0, faturamento: 0 };
        atual.comandas += 1;
        atual.faturamento += comanda.total;
        porHora.set(hora, atual);
      }
      return ok([...porHora.values()]
        .map((h) => ({ ...h, faturamento: arredonda(h.faturamento) }))
        .sort((a, b) => a.hora - b.hora));
    }

    return erro(404, `Relatório não encontrado: ${nome}`);
  }

  // ------------------------------------------------------- intercepta o fetch
  const fetchOriginal = window.fetch.bind(window);

  window.fetch = async (recurso, opcoes = {}) => {
    const url = typeof recurso === 'string' ? recurso : recurso.url;
    if (!url.startsWith('/api')) return fetchOriginal(recurso, opcoes);

    const endereco = new URL(url, location.origin);
    const caminho = endereco.pathname.replace(/^\/api/, '');
    const metodo = (opcoes.method ?? 'GET').toUpperCase();

    let corpo = null;
    if (opcoes.body) {
      try {
        corpo = JSON.parse(opcoes.body);
      } catch {
        return resposta(erro(400, 'O corpo da requisição não é um JSON válido.'));
      }
    }

    // latência de mentirinha: sem ela a interface pisca de um jeito que não
    // acontece com servidor de verdade, e a demonstração fica irreal
    await new Promise((r) => setTimeout(r, 60));

    for (const [metodoRota, padrao, tratar] of rotas) {
      if (metodo !== metodoRota) continue;
      const casou = padrao.exec(caminho);
      if (!casou) continue;
      try {
        return resposta(tratar(casou.slice(1), endereco.searchParams, corpo));
      } catch (falha) {
        console.error('[demo]', falha);
        return resposta(erro(500, 'Erro inesperado na demonstração.'));
      }
    }

    // cadastros de escrita não existem na demonstração: melhor dizer isso do
    // que fingir que salvou
    if (metodo !== 'GET') {
      return resposta(erro(
        501,
        'Esta é uma demonstração estática: cadastrar, editar e excluir só funcionam rodando o sistema com o banco. Abrir comanda, lançar item, riscar e fechar funcionam aqui.'
      ));
    }
    return resposta(erro(404, `Rota não encontrada: ${metodo} ${url}`));
  };

  const resposta = ({ status, corpo }) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  faixaDeAviso(dados.geradoEm);
}

/** Faixa fixa no topo dizendo o que isto é. Sem ela, a página mente. */
function faixaDeAviso(geradoEm) {
  const faixa = document.createElement('div');
  faixa.className = 'faixa-demo';
  faixa.innerHTML =
    '<strong>Demonstração</strong> — sem servidor e sem banco: os dados vivem no seu navegador e voltam ao início ao recarregar. ' +
    'Abrir comanda, lançar item, riscar e fechar funcionam; cadastros, não. ' +
    `<span>Retrato de ${geradoEm.split('-').reverse().join('/')} · ` +
    '<a href="https://github.com/gabrielsoaressn/BentosBeer">código no GitHub</a></span>';
  document.body.prepend(faixa);
  document.body.classList.add('com-faixa-demo');
}
