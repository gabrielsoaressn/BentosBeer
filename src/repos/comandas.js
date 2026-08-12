/**
 * Comandas e itens -- o centro do sistema.
 *
 * Duas regras aqui nao sao implementadas em JavaScript de proposito, porque o
 * banco as implementa melhor:
 *
 *   - uma comanda aberta por mesa: coluna gerada mesa_ocupada + UNIQUE. Vale no
 *     INSERT e no UPDATE, o que a checagem em aplicacao da versao antiga nao
 *     garantia (bug 9.3-10).
 *   - nao se mexe em item de comanda encerrada: os dois triggers.
 *
 * E o fechamento chama sp_fechar_comanda em vez de reimplementar a logica: e
 * transacional, trava a linha com FOR UPDATE e recusa fechamento em dobro.
 */
import { query, executar, comConexao } from '../db/pool.js';
import { AppError } from '../http/erros.js';
import { comDinheiro, listaComDinheiro, dinheiro } from '../http/formato.js';

const STATUS_ITEM = ['pendente', 'entregue', 'cancelado'];

const ITENS = `
  SELECT i.id, i.produto_id, p.nome AS produto, cat.nome AS categoria,
         i.qtd, i.preco_unitario, i.subtotal, i.status, i.criado_em
    FROM item_comanda i
    JOIN produto p      ON p.id = i.produto_id
    JOIN categoria cat  ON cat.id = p.categoria_id
   WHERE i.comanda_id = ?
   ORDER BY i.criado_em, i.id`;

export const comandas = {
  nome: 'Comanda',
  genero: 'f',

  /** Fotografia do salao: toda mesa, ocupada ou livre. */
  async salao() {
    const linhas = await query('SELECT * FROM vw_salao ORDER BY numero');
    return listaComDinheiro(linhas, 'total');
  },

  async listar({ status, mesaId, garcomId } = {}) {
    const condicoes = [];
    const params = [];
    if (status) {
      condicoes.push('status = ?');
      params.push(status);
    }
    if (mesaId !== undefined) {
      condicoes.push('mesa_id = ?');
      params.push(mesaId);
    }
    if (garcomId !== undefined) {
      condicoes.push('garcom_id = ?');
      params.push(garcomId);
    }
    const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const linhas = await query(
      `SELECT * FROM vw_comanda ${onde} ORDER BY aberta_em DESC, id DESC`,
      params
    );
    return listaComDinheiro(linhas, 'total');
  },

  /** A comanda com todos os itens -- o que a tela de comanda precisa. */
  async porId(id) {
    const [cabecalho] = await query('SELECT * FROM vw_comanda WHERE id = ?', [id]);
    if (!cabecalho) return null;

    const itens = await query(ITENS, [id]);
    return {
      ...comDinheiro(cabecalho, 'total'),
      itens: listaComDinheiro(itens, 'preco_unitario', 'subtotal'),
    };
  },

  async abrir({ mesaId, garcomId, clienteId, observacao }) {
    // Se a mesa ja tiver comanda aberta, o UNIQUE uq_mesa_ocupada barra e o
    // middleware traduz para 409 "Essa mesa ja tem uma comanda aberta".
    const r = await executar(
      `INSERT INTO comanda (mesa_id, garcom_id, cliente_id, observacao)
       VALUES (?, ?, ?, ?)`,
      [mesaId, garcomId, clienteId ?? null, observacao ?? null]
    );
    return r.insertId;
  },

  /**
   * Lanca item na comanda.
   *
   * O preco NAO vem do cliente: e copiado do cardapio dentro do proprio INSERT,
   * com INSERT ... SELECT. Assim nao existe janela entre ler o preco e gravar o
   * item, e nao existe caminho por onde um cliente mal-intencionado -- ou um
   * front desatualizado -- lance chope a um centavo.
   */
  async adicionarItem(comandaId, { produtoId, qtd }) {
    const r = await executar(
      `INSERT INTO item_comanda (comanda_id, produto_id, qtd, preco_unitario)
       SELECT ?, p.id, ?, p.preco
         FROM produto p
        WHERE p.id = ? AND p.disponivel = TRUE`,
      [comandaId, qtd, produtoId]
    );

    // Zero linhas inseridas significa que o SELECT nao achou produto disponivel.
    // A consulta extra so roda neste caminho, para dizer qual dos dois motivos.
    if (r.affectedRows === 0) {
      const [produto] = await query('SELECT disponivel FROM produto WHERE id = ?', [produtoId]);
      if (!produto) throw new AppError(404, 'Produto não encontrado.', 'produtoId');
      throw new AppError(409, 'Esse produto está esgotado.', 'produtoId');
    }
    return r.insertId;
  },

  async itemPorId(comandaId, itemId) {
    const [item] = await query(
      `${ITENS.replace('WHERE i.comanda_id = ?', 'WHERE i.comanda_id = ? AND i.id = ?')}`,
      [comandaId, itemId]
    );
    return item ? comDinheiro(item, 'preco_unitario', 'subtotal') : null;
  },

  /**
   * Muda quantidade ou status do item. COALESCE deixa alterar um sem mexer no
   * outro. Se a comanda nao estiver aberta, trg_item_antes_update recusa.
   */
  async atualizarItem(comandaId, itemId, { qtd, status }) {
    const r = await executar(
      `UPDATE item_comanda
          SET qtd = COALESCE(?, qtd), status = COALESCE(?, status)
        WHERE id = ? AND comanda_id = ?`,
      [qtd ?? null, status ?? null, itemId, comandaId]
    );
    return r.affectedRows > 0;
  },

  /**
   * Fecha a conta pela procedure.
   *
   * Conexao dedicada porque o parametro OUT exige as duas instrucoes na mesma
   * conexao fisica: com o pool, o SELECT poderia cair em outra conexao, onde a
   * variavel de sessao @total nao existe, e voltaria NULL de forma intermitente.
   */
  async fechar(id) {
    return comConexao(async (conexao) => {
      await conexao.query('CALL sp_fechar_comanda(?, @total)', [id]);
      const [linhas] = await conexao.query('SELECT @total AS total');
      return dinheiro(linhas[0].total);
    });
  },

  async cancelar(id) {
    const r = await executar(
      `UPDATE comanda SET status = 'cancelada', fechada_em = NOW()
        WHERE id = ? AND status = 'aberta'`,
      [id]
    );
    if (r.affectedRows > 0) return true;

    // Nao mudou nada: ou a comanda nao existe, ou ja estava encerrada.
    const [comanda] = await query('SELECT status FROM comanda WHERE id = ?', [id]);
    if (!comanda) throw new AppError(404, 'Comanda não encontrada.');
    throw new AppError(409, 'Essa comanda já foi encerrada.');
  },
};

export { STATUS_ITEM };
