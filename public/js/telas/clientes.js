/**
 * Clientes — cadastro simples com busca por nome ou telefone.
 *
 * Cliente é opcional na comanda: mesa de passagem não exige cadastro. Quem se
 * cadastra ganha histórico — quantas vezes veio, quanto gastou, quando foi a
 * última visita.
 */
import { api } from '../api.js';
import {
  el, limpar, reais, dia, campoBusca, numeroPlacar,
  mostrarErro, confirmar, formulario, vazio,
} from '../ui.js';

export async function montarClientes(raiz) {
  limpar(raiz);

  let termo = '';

  raiz.append(
    el('div', { class: 'cabecalho-tela' },
      el('h2', {}, 'Clientes'),
      el('button', { class: 'primario', onclick: () => editar() }, 'Novo cliente')
    ),
    el('div', { class: 'linha-controles', style: 'margin-bottom:1rem' },
      campoBusca('nome ou telefone', (valor) => { termo = valor; carregar(); })
    )
  );

  const placar = el('div', { class: 'placar' });
  const corpo = el('div', {});
  raiz.append(placar, corpo);

  async function editar(cliente) {
    const valores = await formulario({
      titulo: cliente ? `Editar ${cliente.nome}` : 'Novo cliente',
      campos: [
        { nome: 'nome', etiqueta: 'nome', valor: cliente?.nome, obrigatorio: true },
        { nome: 'telefone', etiqueta: 'telefone', valor: cliente?.telefone ?? '', dica: '(83) 90000-0000' },
      ],
    });
    if (!valores) return;
    try {
      const dados = { nome: valores.nome, telefone: valores.telefone || undefined };
      if (cliente) await api.put(`/clientes/${cliente.id}`, dados);
      else await api.post('/clientes', dados);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function excluir(cliente) {
    const alerta = cliente.comandas > 0
      ? `${cliente.nome} tem ${cliente.comandas} comanda(s) no histórico. As vendas continuam registradas, só ficam sem nome. Excluir?`
      : `Excluir ${cliente.nome}?`;
    if (!confirmar(alerta)) return;
    try {
      await api.del(`/clientes/${cliente.id}`);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function carregar() {
    let clientes = [];
    try {
      clientes = await api.clientes({ busca: termo });
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    limpar(placar).append(
      numeroPlacar('cadastrados', String(clientes.length)),
      numeroPlacar('já vieram', String(clientes.filter((c) => c.comandas > 0).length)),
      numeroPlacar('total consumido', reais(clientes.reduce((s, c) => s + Number(c.total_gasto), 0)))
    );

    limpar(corpo);
    if (!clientes.length) {
      corpo.append(vazio(termo ? 'Nenhum cliente com esse nome.' : 'Nenhum cliente cadastrado ainda.'));
      return;
    }

    const linhas = el('tbody');
    for (const cliente of clientes) {
      linhas.append(
        el('tr', {},
          el('td', {}, cliente.nome),
          el('td', { class: 'num' }, cliente.telefone ?? '—'),
          el('td', { class: 'num' }, cliente.comandas),
          el('td', { class: 'num' }, reais(cliente.total_gasto)),
          el('td', { class: 'num' }, dia(cliente.ultima_visita)),
          el('td', {},
            el('div', { class: 'acoes' },
              el('button', { class: 'discreto', onclick: () => editar(cliente) }, 'editar'),
              el('button', { class: 'discreto', onclick: () => excluir(cliente) }, 'excluir')
            )
          )
        )
      );
    }

    corpo.append(
      el('div', { class: 'rolagem' },
        el('table', { class: 'tabela' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'cliente'), el('th', { class: 'num' }, 'telefone'),
            el('th', { class: 'num' }, 'visitas'), el('th', { class: 'num' }, 'consumo'),
            el('th', { class: 'num' }, 'última'), el('th', {}, '')
          )),
          linhas
        )
      )
    );
  }

  await carregar();
}

/**
 * Mesas — cadastro do salão físico. Fica junto de clientes por ser o outro
 * cadastro pequeno; a operação das mesas acontece na tela de Salão.
 */
export async function montarMesas(raiz) {
  limpar(raiz);

  raiz.append(
    el('div', { class: 'cabecalho-tela' },
      el('h2', {}, 'Mesas'),
      el('button', { class: 'primario', onclick: () => editar() }, 'Nova mesa')
    )
  );

  const corpo = el('div', {});
  raiz.append(corpo);

  async function editar(mesa) {
    const valores = await formulario({
      titulo: mesa ? `Editar mesa ${mesa.numero}` : 'Nova mesa',
      campos: [
        { nome: 'numero', etiqueta: 'número', tipo: 'number', min: '1', valor: mesa?.numero, obrigatorio: true },
        { nome: 'lugares', etiqueta: 'lugares', tipo: 'number', min: '1', max: '20', valor: mesa?.lugares ?? 4 },
      ],
    });
    if (!valores) return;
    try {
      const dados = { numero: Number(valores.numero), lugares: Number(valores.lugares) };
      if (mesa) await api.put(`/mesas/${mesa.id}`, dados);
      else await api.post('/mesas', dados);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function excluir(mesa) {
    if (!confirmar(`Excluir a mesa ${mesa.numero}? Mesa com comanda no histórico não sai.`)) return;
    try {
      await api.del(`/mesas/${mesa.id}`);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function carregar() {
    let mesas = [];
    try {
      mesas = await api.mesas();
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    limpar(corpo);
    const linhas = el('tbody');
    for (const mesa of mesas) {
      linhas.append(
        el('tr', {},
          el('td', { class: 'num' }, mesa.numero),
          el('td', { class: 'num' }, mesa.lugares),
          el('td', {}, mesa.situacao === 'ocupada' ? reais(mesa.total_aberto) : '—'),
          el('td', {},
            el('div', { class: 'acoes' },
              el('button', { class: 'discreto', onclick: () => editar(mesa) }, 'editar'),
              el('button', { class: 'discreto', onclick: () => excluir(mesa) }, 'excluir')
            )
          )
        )
      );
    }

    corpo.append(
      el('div', { class: 'rolagem' },
        el('table', { class: 'tabela' },
          el('thead', {}, el('tr', {},
            el('th', { class: 'num' }, 'mesa'), el('th', { class: 'num' }, 'lugares'),
            el('th', {}, 'em aberto'), el('th', {}, '')
          )),
          linhas
        )
      )
    );
  }

  await carregar();
}
