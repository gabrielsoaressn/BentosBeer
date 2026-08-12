/**
 * A comanda de papel — o elemento assinatura da interface.
 *
 * Cabeçalho, lista de itens com pontilhado de condução, traço de 2px e o total
 * embaixo. Item riscado continua na lista, com "cancelado" no lugar do valor:
 * o bar não apaga, o bar risca.
 */
import { api } from '../api.js';
import {
  el, limpar, reais, hora, duracao, carimbo, rotulo,
  contarAte, mostrarErro, confirmar, debounce, vazio,
} from '../ui.js';

export async function montarComanda(raiz, comandaId, { aoMudar } = {}) {
  limpar(raiz);

  let comanda;
  try {
    comanda = await api.comanda(comandaId);
  } catch (erro) {
    return mostrarErro(raiz, erro);
  }

  const aberta = comanda.status === 'aberta';
  const caixa = el('div', { class: 'comanda' });
  raiz.append(caixa);

  const totalNo = el('span', { class: 'valor', dataset: { valor: '0' } }, reais(0));
  const listaItens = el('ul', { class: 'itens' });

  /** Redesenha só os itens e o total, para o realce do item novo aparecer. */
  function desenharItens(destacar) {
    limpar(listaItens);

    if (!comanda.itens.length) {
      listaItens.append(el('li', { class: 'item silenciado' },
        el('span', { class: 'nome' }, 'Nada lançado ainda.')));
    }

    for (const item of comanda.itens) {
      const cancelado = item.status === 'cancelado';
      listaItens.append(
        el('li', {
          class: `item ${item.status}${item.id === destacar ? ' recem-lancado' : ''}`,
        },
          el('span', { class: 'qtd num' }, `${item.qtd}×`),
          el('span', { class: 'nome' }, item.produto),
          el('span', { class: 'conducao', 'aria-hidden': 'true' }),
          el('span', { class: 'valor num' }, cancelado ? 'cancelado' : reais(item.subtotal)),
          aberta && !cancelado
            ? el('span', { class: 'acoes' },
                el('button', {
                  class: 'discreto',
                  title: 'Mudar a quantidade',
                  onclick: () => mudarQuantidade(item),
                }, 'qtd'),
                el('button', {
                  class: 'discreto',
                  title: 'Riscar este item',
                  onclick: () => riscar(item),
                }, 'riscar')
              )
            : null
        )
      );
    }
    contarAte(totalNo, comanda.total);
  }

  async function recarregar(destacar) {
    comanda = await api.comanda(comandaId);
    desenharItens(destacar);
    aoMudar?.();
  }

  async function mudarQuantidade(item) {
    const resposta = window.prompt(`Quantidade de ${item.produto}:`, item.qtd);
    if (resposta === null) return;
    const qtd = Number(resposta);
    if (!Number.isInteger(qtd) || qtd < 1) {
      return mostrarErro(caixa, new Error('Quantidade tem que ser um número inteiro maior que zero.'));
    }
    try {
      await api.alterarItem(comandaId, item.id, { qtd });
      await recarregar(item.id);
    } catch (erro) {
      mostrarErro(caixa, erro);
    }
  }

  async function riscar(item) {
    if (!confirmar(`Riscar ${item.qtd}× ${item.produto}?`)) return;
    try {
      await api.alterarItem(comandaId, item.id, { status: 'cancelado' });
      await recarregar();
    } catch (erro) {
      mostrarErro(caixa, erro);
    }
  }

  // --- cabeçalho ----------------------------------------------------------
  caixa.append(
    el('div', { class: 'cabeca' },
      el('div', {},
        el('div', { class: 'mesa-nome' }, `Mesa ${comanda.mesa}`),
        el('div', { class: 'rotulo' },
          `${comanda.garcom}${comanda.cliente ? ` · ${comanda.cliente}` : ' · mesa de passagem'}`),
        el('div', { class: 'rotulo' },
          `aberta ${hora(comanda.aberta_em)} · ${duracao(comanda.minutos)}` +
          (comanda.fechada_em ? ` · fechada ${hora(comanda.fechada_em)}` : ''))
      ),
      el('div', { class: 'direita' },
        carimbo(comanda.status),
        el('div', { class: 'rotulo', style: 'margin-top:.35rem' }, `comanda ${comanda.id}`)
      )
    ),
    listaItens,
    el('div', { class: 'total-comanda' },
      el('span', { class: 'rotulo' }, aberta ? 'parcial' : 'total'),
      totalNo
    )
  );

  desenharItens();

  // --- ações --------------------------------------------------------------
  if (aberta) {
    caixa.append(
      el('div', { class: 'acoes-comanda' },
        el('button', {
          class: 'primario',
          onclick: async () => {
            if (!confirmar(`Fechar a conta da mesa ${comanda.mesa}?`)) return;
            try {
              const { total } = await api.fecharComanda(comandaId);
              await recarregar();
              caixa.querySelector('.total-comanda .rotulo').textContent = 'total';
              window.alert(`Conta da mesa ${comanda.mesa} fechada. Total ${reais(total)}.`);
            } catch (erro) {
              mostrarErro(caixa, erro);
            }
          },
        }, 'Fechar conta'),
        el('button', {
          class: 'destrutivo',
          onclick: async () => {
            if (!confirmar('Cancelar a comanda inteira? O consumo não será cobrado.')) return;
            try {
              await api.cancelarComanda(comandaId);
              await recarregar();
            } catch (erro) {
              mostrarErro(caixa, erro);
            }
          },
        }, 'Cancelar comanda')
      ),
      await painelLancar()
    );
  }

  /** Busca de produto por categoria, para lançar na comanda. */
  async function painelLancar() {
    const painel = el('div', { class: 'lancar' });
    let categorias = [];
    try {
      categorias = await api.categorias();
    } catch (erro) {
      mostrarErro(painel, erro);
      return painel;
    }

    let categoriaAtiva = null;
    let termo = '';

    const pilulas = el('div', { class: 'pilulas' });
    const resultados = el('ul', { class: 'resultados' });
    const campo = el('input', {
      type: 'search',
      placeholder: 'buscar no cardápio',
      oninput: debounce((evento) => { termo = evento.target.value; buscar(); }),
    });

    function desenharPilulas() {
      limpar(pilulas).append(
        el('button', {
          'aria-pressed': String(categoriaAtiva === null),
          onclick: () => { categoriaAtiva = null; desenharPilulas(); buscar(); },
        }, 'tudo'),
        ...categorias.map((c) =>
          el('button', {
            'aria-pressed': String(categoriaAtiva === c.id),
            onclick: () => { categoriaAtiva = c.id; desenharPilulas(); buscar(); },
          }, c.nome)
        )
      );
    }

    async function buscar() {
      let produtos = [];
      try {
        produtos = await api.produtos({
          busca: termo, categoriaId: categoriaAtiva ?? '', disponivel: true,
        });
      } catch (erro) {
        return mostrarErro(painel, erro);
      }

      limpar(resultados);
      if (!produtos.length) {
        resultados.append(el('li', {}, el('div', { class: 'vazio', style: 'border:none' },
          'Nada no cardápio com esse nome.')));
        return;
      }
      for (const produto of produtos.slice(0, 40)) {
        resultados.append(
          el('li', {},
            el('button', {
              onclick: async () => {
                try {
                  const item = await api.lancarItem(comandaId, { produtoId: produto.id, qtd: 1 });
                  await recarregar(item.id);
                } catch (erro) {
                  mostrarErro(caixa, erro);
                }
              },
            },
              el('span', {}, produto.nome),
              el('span', { class: 'rotulo' }, produto.categoria),
              el('span', { class: 'preco' }, reais(produto.preco))
            )
          )
        );
      }
    }

    painel.append(rotulo('lançar item'), campo, pilulas, resultados);
    desenharPilulas();
    await buscar();
    return painel;
  }

  return { recarregar };
}

/** Tela de comandas: lista com filtro por status; a comanda escolhida abre abaixo. */
export async function montarListaComandas(raiz) {
  limpar(raiz);

  let status = 'aberta';
  raiz.append(el('div', { class: 'cabecalho-tela' }, el('h2', {}, 'Comandas')));

  const filtros = el('div', { class: 'pilulas' });
  const lista = el('div', { class: 'rolagem' });
  const detalhe = el('div', {});
  raiz.append(filtros, lista, detalhe);

  function desenharFiltros() {
    limpar(filtros).append(
      ...[['aberta', 'abertas'], ['fechada', 'fechadas'], ['cancelada', 'canceladas'], ['', 'todas']]
        .map(([valor, texto]) =>
          el('button', {
            'aria-pressed': String(status === valor),
            onclick: () => { status = valor; desenharFiltros(); carregar(); },
          }, texto)
        )
    );
  }

  async function carregar() {
    let comandas = [];
    try {
      comandas = await api.comandas(status ? { status } : {});
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    limpar(lista);
    if (!comandas.length) {
      lista.append(vazio('Nenhuma comanda com esse status.'));
      return;
    }

    const corpo = el('tbody');
    for (const c of comandas) {
      corpo.append(
        el('tr', {},
          el('td', { class: 'num' }, c.id),
          el('td', {}, `Mesa ${c.mesa}`),
          el('td', {}, c.garcom),
          el('td', {}, c.cliente ?? '—'),
          el('td', { class: 'num' }, c.itens_ativos),
          el('td', { class: 'num' }, reais(c.total)),
          el('td', {}, hora(c.aberta_em)),
          el('td', {}, duracao(c.minutos)),
          el('td', {}, carimbo(c.status)),
          el('td', { class: 'direita' },
            el('button', {
              class: 'discreto',
              onclick: async () => {
                limpar(detalhe);
                await montarComanda(detalhe, c.id, { aoMudar: carregar });
                detalhe.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              },
            }, 'abrir')
          )
        )
      );
    }

    lista.append(
      el('table', { class: 'tabela' },
        el('thead', {}, el('tr', {},
          el('th', { class: 'num' }, 'id'), el('th', {}, 'mesa'), el('th', {}, 'garçom'),
          el('th', {}, 'cliente'), el('th', { class: 'num' }, 'itens'),
          el('th', { class: 'num' }, 'total'), el('th', {}, 'abriu'),
          el('th', {}, 'tempo'), el('th', {}, 'status'), el('th', {}, '')
        )),
        corpo
      )
    );
  }

  desenharFiltros();
  await carregar();
}
