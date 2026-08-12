/**
 * Os seis relatorios da secao 4.5 -- o SQL que a disciplina quer ver.
 *
 * Toda agregacao acontece no banco. Nenhuma soma de dinheiro passa por reduce
 * em JavaScript: DECIMAL chega como string exatamente para nao perder centavo,
 * e somar com reduce desfaz essa protecao. Era o que o relatorio da versao
 * anterior fazia -- e ainda por cima somava preco de catalogo, que nao e
 * faturamento nem estoque, e sim um numero sem significado de negocio.
 *
 * Todos aceitam periodo (de, ate) sobre a data de FECHAMENTO da comanda: uma
 * conta aberta ainda nao e receita.
 */
import { query } from '../db/pool.js';
import { listaComDinheiro, comDinheiro } from '../http/formato.js';

/** Periodo padrao: os ultimos 30 dias, hoje incluido. */
function periodo({ de, ate } = {}) {
  return {
    de: de ?? null,
    ate: ate ?? null,
    // COALESCE resolve o padrao no proprio SQL, entao a consulta e a mesma com
    // ou sem filtro e nao existe versao "sem WHERE" para manter em paralelo.
    clausula: `c.status = 'fechada'
               AND DATE(c.fechada_em) >= COALESCE(?, CURDATE() - INTERVAL 29 DAY)
               AND DATE(c.fechada_em) <= COALESCE(?, CURDATE())`,
  };
}

export const relatorios = {
  /** Tres numeros do periodo, mais o que esta correndo no salao agora. */
  async resumo(filtro) {
    const p = periodo(filtro);
    const [linha] = await query(
      `SELECT COUNT(DISTINCT c.id)                             AS comandas,
              COALESCE(SUM(i.subtotal), 0)                     AS faturamento,
              ROUND(COALESCE(SUM(i.subtotal) / COUNT(DISTINCT c.id), 0), 2) AS ticket_medio,
              -- CAST porque SUM sobre inteiro devolve DECIMAL, que chega como string
              CAST(COALESCE(SUM(IF(i.status <> 'cancelado', i.qtd, 0)), 0) AS UNSIGNED) AS itens_vendidos
         FROM comanda c
         LEFT JOIN item_comanda i ON i.comanda_id = c.id
        WHERE ${p.clausula}`,
      [p.de, p.ate]
    );

    const [agora] = await query(
      `SELECT COUNT(*)                                   AS comandas_abertas,
              COALESCE(SUM(total), 0)                     AS total_aberto,
              (SELECT COUNT(*) FROM vw_salao WHERE situacao = 'livre') AS mesas_livres,
              (SELECT COUNT(*) FROM mesa)                 AS mesas
         FROM vw_comanda WHERE status = 'aberta'`
    );

    return {
      periodo: { de: p.de, ate: p.ate },
      ...comDinheiro(linha, 'faturamento', 'ticket_medio'),
      salao: comDinheiro(agora, 'total_aberto'),
    };
  },

  /** 1. Faturamento por dia. GROUP BY sobre DATE(). */
  async faturamentoDiario(filtro) {
    const p = periodo(filtro);
    const linhas = await query(
      `SELECT DATE(c.fechada_em)                AS dia,
              DAYNAME(c.fechada_em)             AS dia_semana,
              COUNT(DISTINCT c.id)              AS comandas,
              COALESCE(SUM(i.subtotal), 0)      AS faturamento
         FROM comanda c
         LEFT JOIN item_comanda i ON i.comanda_id = c.id
        WHERE ${p.clausula}
        GROUP BY DATE(c.fechada_em), DAYNAME(c.fechada_em)
        ORDER BY dia`,
      [p.de, p.ate]
    );
    return listaComDinheiro(linhas, 'faturamento');
  },

  /** 2. Os que mais vendem, em receita e em unidades. JOIN triplo. */
  async topProdutos(filtro, limite = 10) {
    const p = periodo(filtro);
    const linhas = await query(
      `SELECT p.id, p.nome AS produto, cat.nome AS categoria,
              CAST(SUM(i.qtd) AS UNSIGNED)      AS unidades,
              SUM(i.subtotal)                   AS receita,
              COUNT(DISTINCT c.id)              AS comandas
         FROM item_comanda i
         JOIN produto p     ON p.id  = i.produto_id
         JOIN categoria cat ON cat.id = p.categoria_id
         JOIN comanda c     ON c.id  = i.comanda_id
        WHERE ${p.clausula} AND i.status <> 'cancelado'
        GROUP BY p.id, p.nome, cat.nome
        ORDER BY receita DESC
        -- LIMIT interpolado, e nao como ?: o mysql2 recusa placeholder em LIMIT
        -- dentro de prepared statement ("Incorrect arguments to
        -- mysqld_stmt_execute"). Nao abre brecha de injecao porque o valor passa
        -- por v.inteiro({min:1,max:50}) na rota e por Number() aqui
        LIMIT ${Number(limite)}`,
      [p.de, p.ate]
    );
    return listaComDinheiro(linhas, 'receita');
  },

  /** 3. Desempenho por garcom. GROUP BY, media e HAVING. */
  async porGarcom(filtro) {
    const p = periodo(filtro);
    const linhas = await query(
      `SELECT g.id, g.nome AS garcom, g.apelido,
              COUNT(DISTINCT c.id)                          AS comandas,
              SUM(i.subtotal)                               AS receita,
              ROUND(SUM(i.subtotal) / COUNT(DISTINCT c.id), 2) AS ticket_medio,
              CAST(ROUND(AVG(TIMESTAMPDIFF(MINUTE, c.aberta_em, c.fechada_em))) AS SIGNED) AS minutos_medios
         FROM garcom g
         JOIN comanda c      ON c.garcom_id = g.id
         JOIN item_comanda i ON i.comanda_id = c.id
        WHERE ${p.clausula}
        GROUP BY g.id, g.nome, g.apelido
        -- HAVING e nao WHERE: o filtro e sobre o resultado da agregacao.
        -- Garcom que so atendeu comanda inteiramente cancelada nao entra no ranking
        HAVING receita > 0
        ORDER BY receita DESC`,
      [p.de, p.ate]
    );
    return listaComDinheiro(linhas, 'receita', 'ticket_medio');
  },

  /** 4. Movimento por faixa de horario. Agregacao por expressao, HOUR(). */
  async porHora(filtro) {
    const p = periodo(filtro);
    const linhas = await query(
      `SELECT HOUR(c.aberta_em)             AS hora,
              COUNT(DISTINCT c.id)          AS comandas,
              COALESCE(SUM(i.subtotal), 0)  AS faturamento
         FROM comanda c
         LEFT JOIN item_comanda i ON i.comanda_id = c.id
        WHERE ${p.clausula}
        GROUP BY HOUR(c.aberta_em)
        ORDER BY hora`,
      [p.de, p.ate]
    );
    return listaComDinheiro(linhas, 'faturamento');
  },

  /**
   * 5. Quem lidera dentro da propria categoria. Window function.
   *
   * RANK() OVER (PARTITION BY ...) resolve em uma passada o que exigiria uma
   * subconsulta correlacionada por categoria. O SELECT externo existe porque
   * nao se filtra por window function no WHERE: ela e calculada depois dele.
   */
  async rankingCategoria(filtro, porCategoria = 3) {
    const p = periodo(filtro);
    const linhas = await query(
      `SELECT * FROM (
         SELECT cat.id AS categoria_id, cat.nome AS categoria,
                p.nome AS produto,
                CAST(SUM(i.qtd) AS UNSIGNED) AS unidades,
                SUM(i.subtotal) AS receita,
                RANK() OVER (PARTITION BY cat.id ORDER BY SUM(i.subtotal) DESC) AS posicao
           FROM item_comanda i
           JOIN produto p     ON p.id  = i.produto_id
           JOIN categoria cat ON cat.id = p.categoria_id
           JOIN comanda c     ON c.id  = i.comanda_id
          WHERE ${p.clausula} AND i.status <> 'cancelado'
          GROUP BY cat.id, cat.nome, p.id, p.nome
       ) AS ranqueado
       WHERE posicao <= ?
       ORDER BY categoria, posicao`,
      [p.de, p.ate, porCategoria]
    );
    return listaComDinheiro(linhas, 'receita');
  },

  /** 6. O salao agora. View sobre LEFT JOIN. */
  async salaoAgora() {
    const linhas = await query('SELECT * FROM vw_salao ORDER BY numero');
    return listaComDinheiro(linhas, 'total');
  },
};
