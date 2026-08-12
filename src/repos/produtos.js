/**
 * Cardapio.
 *
 * Produto esgotado vira `disponivel = FALSE` em vez de ser apagado: o item ja
 * vendido aponta para ele, e a FK fk_item_produto (sem CASCADE) existe justamente
 * para que apagar produto nao apague venda.
 *
 * A ordenacao segue a ordem da categoria, e nao a alfabetica, porque e assim que
 * um cardapio se le.
 */
import { query, executar } from '../db/pool.js';
import { clausulaBusca, where } from '../http/crud.js';
import { comDinheiro, comBooleanos } from '../http/formato.js';

// BOOLEAN do MySQL chega como 1/0; a API devolve booleano de verdade
const apresentar = (linha) => comBooleanos(comDinheiro(linha, 'preco'), 'disponivel');

const SELECT = `
  SELECT p.id, p.nome, p.descricao, p.preco, p.disponivel,
         p.categoria_id, cat.nome AS categoria, cat.ordem AS categoria_ordem
    FROM produto p
    JOIN categoria cat ON cat.id = p.categoria_id`;

export const produtos = {
  nome: 'Produto',
  genero: 'm',

  async listar({ busca, categoriaId, disponivel } = {}) {
    const filtro = clausulaBusca(busca, 'p.nome', 'p.descricao');
    const params = [...filtro.params];

    let porCategoria = '';
    if (categoriaId !== undefined) {
      porCategoria = 'p.categoria_id = ?';
      params.push(categoriaId);
    }

    let porDisponibilidade = '';
    if (disponivel !== undefined) {
      porDisponibilidade = 'p.disponivel = ?';
      params.push(disponivel);
    }

    const linhas = await query(
      `${SELECT} ${where(filtro.sql, porCategoria, porDisponibilidade)}
       ORDER BY cat.ordem, cat.nome, p.nome`,
      params
    );
    return linhas.map(apresentar);
  },

  async porId(id) {
    const [linha] = await query(`${SELECT} WHERE p.id = ?`, [id]);
    return linha ? apresentar(linha) : null;
  },

  async criar({ categoriaId, nome, descricao, preco, disponivel }) {
    const r = await executar(
      `INSERT INTO produto (categoria_id, nome, descricao, preco, disponivel)
       VALUES (?, ?, ?, ?, ?)`,
      [categoriaId, nome, descricao ?? null, preco, disponivel ?? true]
    );
    return r.insertId;
  },

  async editar(id, { categoriaId, nome, descricao, preco, disponivel }) {
    const r = await executar(
      `UPDATE produto
          SET categoria_id = ?, nome = ?, descricao = ?, preco = ?, disponivel = ?
        WHERE id = ?`,
      [categoriaId, nome, descricao ?? null, preco, disponivel ?? true, id]
    );
    return r.affectedRows > 0;
  },

  async excluir(id) {
    // Produto ja vendido e barrado por fk_item_produto -> 409. Reajustar preco
    // aqui nao mexe no passado: item_comanda guardou o preco praticado.
    const r = await executar('DELETE FROM produto WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },
};
