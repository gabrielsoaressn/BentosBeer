/**
 * Secoes do cardapio.
 *
 * `ordem` existe porque a ordem de um cardapio nao e alfabetica: chope vem antes
 * de sobremesa. A listagem conta os produtos de cada secao, o que tambem avisa
 * de antemao qual DELETE vai ser barrado.
 */
import { query, executar } from '../db/pool.js';
import { clausulaBusca, where } from '../http/crud.js';

const SELECT = `
  SELECT cat.id, cat.nome, cat.ordem,
         COUNT(p.id)                              AS produtos,
         COUNT(IF(p.disponivel, 1, NULL))         AS produtos_disponiveis
    FROM categoria cat
    LEFT JOIN produto p ON p.categoria_id = cat.id`;

const AGRUPAR = 'GROUP BY cat.id, cat.nome, cat.ordem';

export const categorias = {
  nome: 'Categoria',
  genero: 'f',

  async listar({ busca } = {}) {
    const filtro = clausulaBusca(busca, 'cat.nome');
    return query(
      `${SELECT} ${where(filtro.sql)} ${AGRUPAR} ORDER BY cat.ordem, cat.nome`,
      filtro.params
    );
  },

  async porId(id) {
    const [linha] = await query(`${SELECT} WHERE cat.id = ? ${AGRUPAR}`, [id]);
    return linha ?? null;
  },

  async criar({ nome, ordem }) {
    const r = await executar('INSERT INTO categoria (nome, ordem) VALUES (?, ?)', [
      nome,
      ordem ?? 0,
    ]);
    return r.insertId;
  },

  async editar(id, { nome, ordem }) {
    const r = await executar('UPDATE categoria SET nome = ?, ordem = ? WHERE id = ?', [
      nome,
      ordem ?? 0,
      id,
    ]);
    return r.affectedRows > 0;
  },

  async excluir(id) {
    // fk_produto_categoria e ON DELETE RESTRICT: categoria com produto no
    // cardapio nao sai. O middleware transforma isso em 409 explicando o motivo,
    // em vez do 500 que a versao anterior devolvia.
    const r = await executar('DELETE FROM categoria WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },
};
