/**
 * Clientes. Cadastro opcional: comanda de mesa de passagem fica sem cliente.
 *
 * A listagem traz quantas comandas o cliente teve e quanto ja gastou --
 * reaproveitando vw_comanda, que ja resolveu a soma dos itens. Sem a view, esta
 * consulta precisaria de um segundo LEFT JOIN em item_comanda e de
 * COUNT(DISTINCT) para nao contar cada comanda uma vez por item.
 */
import { query, executar } from '../db/pool.js';
import { clausulaBusca, where } from '../http/crud.js';
import { listaComDinheiro, comDinheiro } from '../http/formato.js';

const SELECT = `
  SELECT cl.id, cl.nome, cl.telefone, cl.criado_em,
         COUNT(c.id)                                            AS comandas,
         COALESCE(SUM(IF(c.status = 'fechada', c.total, 0)), 0) AS total_gasto,
         MAX(c.aberta_em)                                       AS ultima_visita
    FROM cliente cl
    LEFT JOIN vw_comanda c ON c.cliente_id = cl.id`;

const AGRUPAR = 'GROUP BY cl.id, cl.nome, cl.telefone, cl.criado_em';

export const clientes = {
  nome: 'Cliente',
  genero: 'm',

  async listar({ busca } = {}) {
    const filtro = clausulaBusca(busca, 'cl.nome', 'cl.telefone');
    const linhas = await query(
      `${SELECT} ${where(filtro.sql)} ${AGRUPAR} ORDER BY cl.nome`,
      filtro.params
    );
    return listaComDinheiro(linhas, 'total_gasto');
  },

  async porId(id) {
    const [linha] = await query(`${SELECT} WHERE cl.id = ? ${AGRUPAR}`, [id]);
    return linha ? comDinheiro(linha, 'total_gasto') : null;
  },

  async criar({ nome, telefone }) {
    const r = await executar('INSERT INTO cliente (nome, telefone) VALUES (?, ?)', [
      nome,
      telefone ?? null,
    ]);
    return r.insertId;
  },

  async editar(id, { nome, telefone }) {
    const r = await executar('UPDATE cliente SET nome = ?, telefone = ? WHERE id = ?', [
      nome,
      telefone ?? null,
      id,
    ]);
    return r.affectedRows > 0;
  },

  async excluir(id) {
    // Este DELETE passa mesmo com comandas no historico: fk_comanda_cliente e
    // ON DELETE SET NULL, entao a venda continua registrada e a comanda apenas
    // fica anonima. Apagar cliente nao pode apagar faturamento.
    const r = await executar('DELETE FROM cliente WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },
};
