/**
 * Salão — a home.
 *
 * Grade de mesas com carimbo de status, quem atende e há quanto tempo. Clicar
 * numa mesa ocupada abre a comanda dela abaixo, na mesma tela; clicar numa
 * livre abre o formulário de abertura. É o fluxo que um garçom faz cem vezes
 * por noite, e não deve custar troca de tela.
 */
import { api } from '../api.js';
import { el, limpar, reais, duracao, carimbo, rotulo, numeroPlacar, mostrarErro, vazio } from '../ui.js';
import { montarComanda } from './comanda.js';

export async function montarSalao(raiz, { comandaSelecionada } = {}) {
  limpar(raiz);

  raiz.append(
    el('div', { class: 'cabecalho-tela' },
      el('h2', {}, 'Salão'),
      el('span', { class: 'rotulo' }, 'clique numa mesa para abrir ou ver a comanda')
    )
  );

  const placar = el('div', { class: 'placar' });
  const grade = el('div', { class: 'salao' });
  const detalhe = el('div', { id: 'detalhe-comanda' });
  raiz.append(placar, grade, detalhe);

  async function recarregar(selecionada = comandaSelecionada) {
    let mesas;
    let resumo;
    try {
      [mesas, resumo] = await Promise.all([api.salao(), api.relatorio('resumo')]);
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    const ocupadas = mesas.filter((m) => m.situacao === 'ocupada');
    const emAberto = ocupadas.reduce((soma, m) => soma + Number(m.total ?? 0), 0);

    limpar(placar).append(
      numeroPlacar('mesas ocupadas', `${ocupadas.length}/${mesas.length}`),
      numeroPlacar('em aberto agora', reais(emAberto)),
      numeroPlacar('comandas em 30 dias', String(resumo.comandas)),
      numeroPlacar('faturamento em 30 dias', reais(resumo.faturamento))
    );

    limpar(grade);
    for (const mesa of mesas) {
      const ocupada = mesa.situacao === 'ocupada';
      grade.append(
        el('button', {
          class: `mesa ${mesa.situacao}`,
          'aria-pressed': String(ocupada && mesa.comanda_id === selecionada),
          onclick: () => (ocupada ? abrirDetalhe(mesa.comanda_id) : formularioAbertura(mesa)),
        },
          el('div', { class: 'topo' },
            el('span', { class: 'numero' }, `Mesa ${mesa.numero}`),
            carimbo(mesa.situacao)
          ),
          ocupada
            ? el('span', { class: 'quem' }, `${mesa.garcom}${mesa.cliente ? ` · ${mesa.cliente}` : ''}`)
            : el('span', { class: 'quem' }, `${mesa.lugares} lugares`),
          ocupada
            ? el('span', { class: 'total num' }, reais(mesa.total))
            : el('span', { class: 'quem silenciado' }, 'abrir comanda'),
          ocupada ? el('span', { class: 'rotulo' }, `há ${duracao(mesa.minutos)}`) : null
        )
      );
    }

    if (selecionada) abrirDetalhe(selecionada, false);
  }

  async function abrirDetalhe(comandaId, rolar = true) {
    limpar(detalhe);
    await montarComanda(detalhe, comandaId, { aoMudar: () => recarregar(comandaId) });
    for (const botao of grade.querySelectorAll('.mesa')) botao.setAttribute('aria-pressed', 'false');
    if (rolar) detalhe.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Abertura de comanda: escolhe garçom, cliente opcional. */
  async function formularioAbertura(mesa) {
    limpar(detalhe);

    let garcons = [];
    let clientes = [];
    try {
      [garcons, clientes] = await Promise.all([api.garcons({ ativo: true }), api.clientes()]);
    } catch (erro) {
      return mostrarErro(detalhe, erro);
    }

    const selGarcom = el('select', {},
      ...garcons.map((g) => el('option', { value: g.id }, g.apelido ? `${g.nome} (${g.apelido})` : g.nome))
    );
    const selCliente = el('select', {},
      el('option', { value: '' }, 'sem cadastro — mesa de passagem'),
      ...clientes.map((c) => el('option', { value: c.id }, c.nome))
    );
    const campoObs = el('input', { type: 'text', placeholder: 'ex.: aniversário, conta dividida' });

    const caixa = el('div', { class: 'comanda' },
      el('div', { class: 'cabeca' },
        el('div', {},
          el('div', { class: 'mesa-nome' }, `Mesa ${mesa.numero}`),
          rotulo(`${mesa.lugares} lugares · livre`)
        ),
        carimbo('livre')
      ),
      el('div', { class: 'linha-controles' },
        el('label', { class: 'cresce' }, rotulo('garçom'), selGarcom),
        el('label', { class: 'cresce' }, rotulo('cliente'), selCliente)
      ),
      el('label', { style: 'margin-top:.5rem' }, rotulo('observação'), campoObs),
      el('div', { class: 'acoes-comanda' },
        el('button', {
          class: 'primario',
          onclick: async () => {
            try {
              const nova = await api.abrirComanda({
                mesaId: mesa.mesa_id,
                garcomId: Number(selGarcom.value),
                clienteId: selCliente.value ? Number(selCliente.value) : undefined,
                observacao: campoObs.value || undefined,
              });
              await recarregar(nova.id);
            } catch (erro) {
              mostrarErro(caixa, erro);
            }
          },
        }, 'Abrir comanda'),
        el('button', { onclick: () => limpar(detalhe) }, 'Deixar para depois')
      )
    );

    if (!garcons.length) {
      limpar(detalhe).append(vazio('Nenhum garçom na escala. Cadastre a equipe antes de abrir comanda.'));
      return;
    }
    detalhe.append(caixa);
    selGarcom.focus();
  }

  await recarregar();
}
