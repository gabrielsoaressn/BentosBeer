/**
 * Mesas do salao.
 *
 * A listagem ja diz se a mesa esta livre ou ocupada, porque e a pergunta que se
 * faz sobre uma mesa. O LEFT JOIN e o que mantem a mesa livre na lista: com
 * INNER JOIN so apareceriam as ocupadas.
 */
import { query, executar } from '../db/pool.js';
import { clausulaBusca, where } from '../http/crud.js';
import { listaComDinheiro, comDinheiro } from '../http/formato.js';

const SELECT = `
  SELECT m.id, m.numero, m.lugares,
         IF(c.id IS NULL, 'livre', 'ocupada') AS situacao,
         c.id    AS comanda_id,
         c.total AS total_aberto
    FROM mesa m
    LEFT JOIN vw_comanda c ON c.mesa_id = m.id AND c.status = 'aberta'`;

export const mesas = {
  nome: 'Mesa',
  genero: 'f',

  async listar({ busca } = {}) {
    // CAST porque numero e SMALLINT: procurar "1" tem que achar a mesa 1, 10, 11
    const filtro = clausulaBusca(busca, 'CAST(m.numero AS CHAR)');
    const linhas = await query(
      `${SELECT} ${where(filtro.sql)} ORDER BY m.numero`,
      filtro.params
    );
    return listaComDinheiro(linhas, 'total_aberto');
  },

  async porId(id) {
    const [linha] = await query(`${SELECT} WHERE m.id = ?`, [id]);
    return linha ? comDinheiro(linha, 'total_aberto') : null;
  },

  async criar({ numero, lugares }) {
    const r = await executar('INSERT INTO mesa (numero, lugares) VALUES (?, ?)', [
      numero,
      lugares ?? 4,
    ]);
    return r.insertId;
  },

  async editar(id, { numero, lugares }) {
    const r = await executar('UPDATE mesa SET numero = ?, lugares = ? WHERE id = ?', [
      numero,
      lugares ?? 4,
      id,
    ]);
    return r.affectedRows > 0;
  },

  async excluir(id) {
    // Mesa com comanda no historico e barrada pela FK fk_comanda_mesa, que o
    // middleware traduz em 409 -- apagar a mesa apagaria as vendas dela.
    const r = await executar('DELETE FROM mesa WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },
};
