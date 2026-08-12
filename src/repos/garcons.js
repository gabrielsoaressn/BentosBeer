/**
 * Equipe.
 *
 * A listagem traz quantas comandas cada garcom tem abertas agora -- e o numero
 * que interessa no meio do turno, para saber quem esta sobrecarregado -- alem do
 * historico fechado e da receita.
 *
 * Garcom nao se apaga, se desativa: o campo `ativo` existe para desligar alguem
 * da escala sem apagar as vendas dele. O DELETE continua existindo e o banco o
 * barra com 409 quando ha historico.
 */
import { query, executar } from '../db/pool.js';
import { clausulaBusca, where } from '../http/crud.js';
import { comDinheiro, comBooleanos } from '../http/formato.js';

// BOOLEAN do MySQL chega como 1/0; a API devolve booleano de verdade
const apresentar = (linha) => comBooleanos(comDinheiro(linha, 'receita'), 'ativo');

const SELECT = `
  SELECT g.id, g.nome, g.apelido, g.ativo,
         COUNT(IF(c.status = 'aberta',  1, NULL))               AS comandas_abertas,
         COUNT(IF(c.status = 'fechada', 1, NULL))               AS comandas_fechadas,
         COALESCE(SUM(IF(c.status = 'fechada', c.total, 0)), 0) AS receita
    FROM garcom g
    LEFT JOIN vw_comanda c ON c.garcom_id = g.id`;

const AGRUPAR = 'GROUP BY g.id, g.nome, g.apelido, g.ativo';

export const garcons = {
  nome: 'Garçom',
  genero: 'm',

  async listar({ busca, ativo } = {}) {
    const filtro = clausulaBusca(busca, 'g.nome', 'g.apelido');
    const params = [...filtro.params];

    let filtroAtivo = '';
    if (ativo !== undefined) {
      filtroAtivo = 'g.ativo = ?';
      params.push(ativo);
    }

    const linhas = await query(
      // quem esta na escala primeiro; inativo desce para o fim da lista
      `${SELECT} ${where(filtro.sql, filtroAtivo)} ${AGRUPAR} ORDER BY g.ativo DESC, g.nome`,
      params
    );
    return linhas.map(apresentar);
  },

  async porId(id) {
    const [linha] = await query(`${SELECT} WHERE g.id = ? ${AGRUPAR}`, [id]);
    return linha ? apresentar(linha) : null;
  },

  async criar({ nome, apelido, ativo }) {
    const r = await executar('INSERT INTO garcom (nome, apelido, ativo) VALUES (?, ?, ?)', [
      nome,
      apelido ?? null,
      ativo ?? true,
    ]);
    return r.insertId;
  },

  async editar(id, { nome, apelido, ativo }) {
    const r = await executar(
      'UPDATE garcom SET nome = ?, apelido = ?, ativo = ? WHERE id = ?',
      [nome, apelido ?? null, ativo ?? true, id]
    );
    return r.affectedRows > 0;
  },

  async excluir(id) {
    // Barrado por fk_comanda_garcom quando ha comandas: o middleware devolve
    // 409 dizendo que o garcom tem historico. O caminho certo e desativar.
    const r = await executar('DELETE FROM garcom WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },
};
