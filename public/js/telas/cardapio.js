/**
 * Cardápio — produtos agrupados por seção, na ordem em que um cardápio se lê,
 * que não é a alfabética. Preço em monoespaçada, alinhado à direita.
 *
 * Produto esgotado não é apagado: alterna para indisponível e sai do cardápio
 * sem quebrar o histórico de vendas.
 */
import { api } from '../api.js';
import {
  el, limpar, reais, rotulo, carimbo, campoBusca,
  mostrarErro, confirmar, formulario, vazio,
} from '../ui.js';

export async function montarCardapio(raiz) {
  limpar(raiz);

  let termo = '';
  let categorias = [];

  raiz.append(
    el('div', { class: 'cabecalho-tela' },
      el('h2', {}, 'Cardápio'),
      el('div', { class: 'linha-controles' },
        el('button', { onclick: () => editarCategoria() }, 'Nova seção'),
        el('button', { class: 'primario', onclick: () => editarProduto() }, 'Novo produto')
      )
    ),
    el('div', { class: 'linha-controles', style: 'margin-bottom:1rem' },
      campoBusca('nome ou descrição do produto', (valor) => { termo = valor; carregar(); })
    )
  );

  const corpo = el('div', {});
  raiz.append(corpo);

  async function editarProduto(produto) {
    const valores = await formulario({
      titulo: produto ? `Editar ${produto.nome}` : 'Novo produto',
      acao: produto ? 'Salvar' : 'Adicionar ao cardápio',
      campos: [
        { nome: 'nome', etiqueta: 'nome', valor: produto?.nome, obrigatorio: true },
        {
          nome: 'categoriaId', etiqueta: 'seção', tipo: 'select', valor: produto?.categoria_id,
          opcoes: categorias.map((c) => ({ valor: c.id, texto: c.nome })),
        },
        { nome: 'preco', etiqueta: 'preço', tipo: 'number', passo: '0.01', min: '0', valor: produto?.preco, obrigatorio: true },
        { nome: 'descricao', etiqueta: 'descrição', valor: produto?.descricao ?? '', dica: 'opcional' },
        { nome: 'disponivel', etiqueta: 'no cardápio agora', tipo: 'checkbox', valor: produto ? produto.disponivel : true },
      ],
    });
    if (!valores) return;

    const corpoEnvio = {
      nome: valores.nome,
      categoriaId: Number(valores.categoriaId),
      preco: Number(valores.preco),
      descricao: valores.descricao || undefined,
      disponivel: valores.disponivel,
    };
    try {
      if (produto) await api.put(`/produtos/${produto.id}`, corpoEnvio);
      else await api.post('/produtos', corpoEnvio);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function editarCategoria(categoria) {
    const valores = await formulario({
      titulo: categoria ? `Editar ${categoria.nome}` : 'Nova seção do cardápio',
      campos: [
        { nome: 'nome', etiqueta: 'nome', valor: categoria?.nome, obrigatorio: true },
        { nome: 'ordem', etiqueta: 'ordem no cardápio', tipo: 'number', min: '0', valor: categoria?.ordem ?? 0 },
      ],
    });
    if (!valores) return;
    try {
      const dados = { nome: valores.nome, ordem: Number(valores.ordem) };
      if (categoria) await api.put(`/categorias/${categoria.id}`, dados);
      else await api.post('/categorias', dados);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function alternarDisponivel(produto) {
    try {
      await api.put(`/produtos/${produto.id}`, {
        nome: produto.nome,
        categoriaId: produto.categoria_id,
        preco: produto.preco,
        descricao: produto.descricao ?? undefined,
        disponivel: !produto.disponivel,
      });
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function excluirProduto(produto) {
    if (!confirmar(`Tirar ${produto.nome} do cadastro? Se já foi vendido, o sistema recusa.`)) return;
    try {
      await api.del(`/produtos/${produto.id}`);
      await carregar();
    } catch (erro) {
      mostrarErro(raiz, erro);
    }
  }

  async function carregar() {
    let produtos = [];
    try {
      [categorias, produtos] = await Promise.all([api.categorias(), api.produtos({ busca: termo })]);
    } catch (erro) {
      return mostrarErro(raiz, erro);
    }

    limpar(corpo);
    if (!produtos.length) {
      corpo.append(vazio(termo ? 'Nada no cardápio com esse nome.' : 'Cardápio vazio. Comece pelo chope.'));
      return;
    }

    for (const categoria of categorias) {
      const daSecao = produtos.filter((p) => p.categoria_id === categoria.id);
      if (!daSecao.length) continue;

      const linhas = el('tbody');
      for (const produto of daSecao) {
        linhas.append(
          el('tr', { class: produto.disponivel ? '' : 'esgotado' },
            el('td', {},
              el('div', { class: 'nome-produto' }, produto.nome),
              produto.descricao ? el('div', { class: 'rotulo' }, produto.descricao) : null
            ),
            el('td', { class: 'num' }, reais(produto.preco)),
            el('td', {}, produto.disponivel ? carimbo('livre', 'no cardápio') : carimbo('cancelada', 'esgotado')),
            el('td', {},
              el('div', { class: 'acoes' },
                el('button', { class: 'discreto', onclick: () => alternarDisponivel(produto) },
                  produto.disponivel ? 'marcar esgotado' : 'voltar ao cardápio'),
                el('button', { class: 'discreto', onclick: () => editarProduto(produto) }, 'editar'),
                el('button', { class: 'discreto', onclick: () => excluirProduto(produto) }, 'excluir')
              )
            )
          )
        );
      }

      corpo.append(
        el('section', { class: 'secao-cardapio' },
          el('h3', {},
            categoria.nome,
            el('span', { class: 'rotulo' }, `${daSecao.length} itens`),
            el('button', { class: 'discreto', onclick: () => editarCategoria(categoria) }, 'renomear')
          ),
          el('div', { class: 'rolagem' }, el('table', { class: 'tabela' }, linhas))
        )
      );
    }
  }

  await carregar();
}
