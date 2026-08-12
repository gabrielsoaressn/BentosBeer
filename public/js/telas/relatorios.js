/**
 * Relatórios — seletor de período, três números-síntese e as seis consultas.
 *
 * O gráfico de faturamento diário é canvas puro, desenhado à mão em
 * js/grafico.js. Nenhuma soma acontece aqui: tudo já vem agregado do SQL.
 */
import { api } from '../api.js';
import {
  el, limpar, reais, dia, diaSemana, duracao, rotulo,
  numeroPlacar, mostrarErro, vazio,
} from '../ui.js';
import { barras, acompanharLargura } from '../grafico.js';

export async function montarRelatorios(raiz) {
  limpar(raiz);

  // Período padrão: os últimos 30 dias, que é o que o servidor assume também.
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000);
  const iso = (d) => d.toISOString().slice(0, 10);

  const campoDe = el('input', { type: 'date', value: iso(trintaDiasAtras) });
  const campoAte = el('input', { type: 'date', value: iso(hoje) });

  raiz.append(
    el('div', { class: 'cabecalho-tela' },
      el('h2', {}, 'Relatórios'),
      el('div', { class: 'linha-controles' },
        el('label', {}, rotulo('de'), campoDe),
        el('label', {}, rotulo('até'), campoAte),
        el('button', { class: 'primario', onclick: () => carregar() }, 'Atualizar')
      )
    )
  );

  const placar = el('div', { class: 'placar' });
  const graficoCaixa = el('div', { class: 'painel' });
  const grade = el('div', { class: 'grade-relatorios' });
  raiz.append(placar, graficoCaixa, grade);

  const periodo = () => ({ de: campoDe.value, ate: campoAte.value });

  /** Painel com título, subtítulo e uma tabela pronta. */
  function painel(titulo, subtitulo, colunas, linhas, montarLinha) {
    const corpo = el('tbody');
    for (const linha of linhas) corpo.append(montarLinha(linha));

    return el('section', { class: 'painel' },
      el('h3', {}, titulo),
      rotulo(subtitulo),
      linhas.length
        ? el('div', { class: 'rolagem' },
            el('table', { class: 'tabela' },
              el('thead', {}, el('tr', {},
                ...colunas.map((c) => el('th', { class: c.num ? 'num' : '' }, c.texto))
              )),
              corpo
            )
          )
        : vazio('Sem movimento no período escolhido.')
    );
  }

  async function carregar() {
    if (campoDe.value && campoAte.value && campoDe.value > campoAte.value) {
      return mostrarErro(raiz, new Error('A data inicial é posterior à final.'));
    }

    let resumo, diario, top, porGarcom, porHora, ranking;
    try {
      [resumo, diario, top, porGarcom, porHora, ranking] = await Promise.all([
        api.relatorio('resumo', periodo()),
        api.relatorio('faturamento-diario', periodo()),
        api.relatorio('top-produtos', { ...periodo(), limite: 10 }),
        api.relatorio('por-garcom', periodo()),
        api.relatorio('por-hora', periodo()),
        api.relatorio('ranking-categoria', { ...periodo(), porCategoria: 3 }),
      ]);
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    // --- os três números-síntese, em linha, pequenos e tabulares ----------
    limpar(placar).append(
      numeroPlacar('faturamento', reais(resumo.faturamento)),
      numeroPlacar('comandas', String(resumo.comandas)),
      numeroPlacar('ticket médio', reais(resumo.ticket_medio)),
      numeroPlacar('itens vendidos', String(resumo.itens_vendidos)),
      numeroPlacar('correndo agora', `${resumo.salao.comandas_abertas} mesas · ${reais(resumo.salao.total_aberto)}`)
    );

    // --- 1. gráfico de faturamento diário, canvas puro --------------------
    limpar(graficoCaixa);
    const canvas = el('canvas', { role: 'img', 'aria-label': 'Faturamento por dia no período' });
    graficoCaixa.append(
      el('h3', {}, 'Faturamento por dia'),
      rotulo(`${diario.length} dias com movimento · GROUP BY sobre DATE(fechada_em)`),
      el('div', { class: 'grafico-caixa' }, canvas)
    );

    const dadosGrafico = diario.map((d) => ({
      rotulo: String(d.dia).slice(8, 10),
      sub: diaSemana(d.dia_semana),
      valor: Number(d.faturamento),
    }));
    const desenhar = () => barras(canvas, dadosGrafico);
    desenhar();
    acompanharLargura(canvas, desenhar);

    // --- 2 a 6 ------------------------------------------------------------
    limpar(grade).append(
      painel('Os que mais vendem', 'JOIN triplo com SUM e LIMIT',
        [{ texto: 'produto' }, { texto: 'seção' }, { texto: 'unid.', num: true }, { texto: 'receita', num: true }],
        top,
        (p) => el('tr', {},
          el('td', {}, p.produto),
          el('td', { class: 'silenciado' }, p.categoria),
          el('td', { class: 'num' }, p.unidades),
          el('td', { class: 'num' }, reais(p.receita))
        )
      ),

      painel('Desempenho por garçom', 'GROUP BY com média e HAVING',
        [{ texto: 'garçom' }, { texto: 'comandas', num: true }, { texto: 'receita', num: true },
         { texto: 'ticket', num: true }, { texto: 'mesa', num: true }],
        porGarcom,
        (g) => el('tr', {},
          el('td', {}, g.apelido ?? g.garcom),
          el('td', { class: 'num' }, g.comandas),
          el('td', { class: 'num' }, reais(g.receita)),
          el('td', { class: 'num' }, reais(g.ticket_medio)),
          el('td', { class: 'num' }, duracao(g.minutos_medios))
        )
      ),

      painel('Movimento por horário', 'agregação por expressão, HOUR(aberta_em)',
        [{ texto: 'hora' }, { texto: 'comandas', num: true }, { texto: 'faturamento', num: true }],
        porHora,
        (h) => el('tr', {},
          el('td', { class: 'num' }, `${String(h.hora).padStart(2, '0')}h`),
          el('td', { class: 'num' }, h.comandas),
          el('td', { class: 'num' }, reais(h.faturamento))
        )
      ),

      painel('Líderes de cada seção', 'window function — RANK() OVER (PARTITION BY)',
        [{ texto: 'seção' }, { texto: 'pos.', num: true }, { texto: 'produto' }, { texto: 'receita', num: true }],
        ranking,
        (r) => el('tr', {},
          el('td', { class: 'silenciado' }, r.categoria),
          el('td', { class: 'num' }, r.posicao),
          el('td', {}, r.produto),
          el('td', { class: 'num' }, reais(r.receita))
        )
      ),

      painel('Faturamento dia a dia', 'os mesmos números do gráfico, em tabela',
        [{ texto: 'dia' }, { texto: 'semana' }, { texto: 'comandas', num: true }, { texto: 'faturamento', num: true }],
        [...diario].reverse(),
        (d) => el('tr', {},
          el('td', { class: 'num' }, dia(d.dia)),
          el('td', { class: 'silenciado' }, diaSemana(d.dia_semana)),
          el('td', { class: 'num' }, d.comandas),
          el('td', { class: 'num' }, reais(d.faturamento))
        )
      )
    );
  }

  await carregar();
}
