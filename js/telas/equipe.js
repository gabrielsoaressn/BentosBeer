/**
 * Equipe — garçons, com quantas comandas cada um tem abertas agora. É o número
 * que interessa no meio do turno: quem está sobrecarregado.
 *
 * Garçom não se apaga, se desativa. O DELETE existe, mas o banco recusa com 409
 * quando há histórico, e a mensagem explica o motivo.
 */
import { api } from '../api.js';
import {
  el, limpar, reais, rotulo, carimbo, campoBusca,
  mostrarErro, confirmar, formulario, vazio, numeroPlacar,
} from '../ui.js';

export async function montarEquipe(raiz) {
  limpar(raiz);

  let termo = '';

  raiz.append(
    el('div', { class: 'cabecalho-tela' },
      el('h2', {}, 'Equipe'),
      el('button', { class: 'primario', onclick: () => editar() }, 'Novo garçom')
    ),
    el('div', { class: 'linha-controles', style: 'margin-bottom:1rem' },
      campoBusca('nome ou apelido', (valor) => { termo = valor; carregar(); })
    )
  );

  const placar = el('div', { class: 'placar' });
  const corpo = el('div', {});
  raiz.append(placar, corpo);

  async function editar(garcom) {
    const valores = await formulario({
      titulo: garcom ? `Editar ${garcom.nome}` : 'Novo garçom',
      campos: [
        { nome: 'nome', etiqueta: 'nome', valor: garcom?.nome, obrigatorio: true },
        { nome: 'apelido', etiqueta: 'apelido', valor: garcom?.apelido ?? '', dica: 'como é chamado no salão' },
        { nome: 'ativo', etiqueta: 'na escala', tipo: 'checkbox', valor: garcom ? garcom.ativo : true },
      ],
    });
    if (!valores) return;
    try {
      const dados = { nome: valores.nome, apelido: valores.apelido || undefined, ativo: valores.ativo };
      if (garcom) await api.put(`/garcons/${garcom.id}`, dados);
      else await api.post('/garcons', dados);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function alternarEscala(garcom) {
    try {
      await api.put(`/garcons/${garcom.id}`, {
        nome: garcom.nome, apelido: garcom.apelido ?? undefined, ativo: !garcom.ativo,
      });
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function excluir(garcom) {
    if (!confirmar(`Excluir ${garcom.nome} do cadastro? Quem já atendeu comanda não sai — o certo é tirar da escala.`)) return;
    try {
      await api.del(`/garcons/${garcom.id}`);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function carregar() {
    let garcons = [];
    try {
      garcons = await api.garcons({ busca: termo });
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    const naEscala = garcons.filter((g) => g.ativo);
    const abertas = garcons.reduce((s, g) => s + Number(g.comandas_abertas), 0);

    limpar(placar).append(
      numeroPlacar('na escala', String(naEscala.length)),
      numeroPlacar('comandas abertas', String(abertas)),
      numeroPlacar('receita histórica', reais(garcons.reduce((s, g) => s + Number(g.receita), 0)))
    );

    limpar(corpo);
    if (!garcons.length) {
      corpo.append(vazio(termo ? 'Ninguém com esse nome.' : 'Nenhum garçom cadastrado. Comece pela escala da noite.'));
      return;
    }

    const linhas = el('tbody');
    for (const garcom of garcons) {
      linhas.append(
        el('tr', {},
          el('td', {},
            el('div', {}, garcom.nome),
            garcom.apelido ? el('div', { class: 'rotulo' }, garcom.apelido) : null
          ),
          el('td', {}, garcom.ativo ? carimbo('livre', 'na escala') : carimbo('cancelada', 'fora')),
          el('td', { class: 'num' }, garcom.comandas_abertas),
          el('td', { class: 'num' }, garcom.comandas_fechadas),
          el('td', { class: 'num' }, reais(garcom.receita)),
          el('td', {},
            el('div', { class: 'acoes' },
              el('button', { class: 'discreto', onclick: () => alternarEscala(garcom) },
                garcom.ativo ? 'tirar da escala' : 'voltar à escala'),
              el('button', { class: 'discreto', onclick: () => editar(garcom) }, 'editar'),
              el('button', { class: 'discreto', onclick: () => excluir(garcom) }, 'excluir')
            )
          )
        )
      );
    }

    corpo.append(
      el('div', { class: 'rolagem' },
        el('table', { class: 'tabela' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'garçom'), el('th', {}, 'escala'),
            el('th', { class: 'num' }, 'abertas'), el('th', { class: 'num' }, 'fechadas'),
            el('th', { class: 'num' }, 'receita'), el('th', {}, '')
          )),
          linhas
        )
      )
    );
  }

  await carregar();
}
