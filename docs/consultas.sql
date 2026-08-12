-- ============================================================================
--  Bento's Beer -- as seis consultas dos relatorios, isoladas
-- ============================================================================
--
--  Prontas para rodar no Workbench durante a apresentacao. Sao exatamente as
--  mesmas que src/repos/relatorios.js executa, com o periodo fixado nos ultimos
--  30 dias em vez de vir por parametro.
--
--  Recursos de SQL demonstrados, na ordem:
--    1. GROUP BY sobre funcao de data
--    2. JOIN triplo com agregacao e LIMIT
--    3. GROUP BY com media e HAVING
--    4. agregacao por expressao (HOUR)
--    5. window function -- RANK() OVER (PARTITION BY ... ORDER BY ...)
--    6. VIEW sobre LEFT JOIN
--
--  Uma decisao vale ser dita em voz alta: dinheiro e somado sempre em SQL, nunca
--  em JavaScript. DECIMAL chega ao driver como string justamente para nao perder
--  centavo, e somar com reduce desfaz essa protecao.
-- ============================================================================

USE bentosbeer;

-- ----------------------------------------------------------------------------
-- 1. Faturamento por dia nos ultimos 30 dias
--
--    Filtra por fechada_em, e nao por aberta_em: conta aberta ainda nao e
--    receita. O indice idx_comanda_fechada serve exatamente a este filtro.
-- ----------------------------------------------------------------------------
SELECT DATE(c.fechada_em)            AS dia,
       DAYNAME(c.fechada_em)         AS dia_semana,
       COUNT(DISTINCT c.id)          AS comandas,
       COALESCE(SUM(i.subtotal), 0)  AS faturamento
  FROM comanda c
  LEFT JOIN item_comanda i ON i.comanda_id = c.id
 WHERE c.status = 'fechada'
   AND DATE(c.fechada_em) BETWEEN CURDATE() - INTERVAL 29 DAY AND CURDATE()
 GROUP BY DATE(c.fechada_em), DAYNAME(c.fechada_em)
 ORDER BY dia;


-- ----------------------------------------------------------------------------
-- 2. Os 10 produtos que mais vendem, em receita e em unidades
--
--    JOIN triplo: item -> produto -> categoria, mais a comanda para filtrar
--    apenas o que foi efetivamente pago. Item cancelado fica fora.
-- ----------------------------------------------------------------------------
SELECT p.nome                    AS produto,
       cat.nome                  AS categoria,
       CAST(SUM(i.qtd) AS UNSIGNED) AS unidades,
       SUM(i.subtotal)           AS receita,
       COUNT(DISTINCT c.id)      AS comandas
  FROM item_comanda i
  JOIN produto p     ON p.id   = i.produto_id
  JOIN categoria cat ON cat.id = p.categoria_id
  JOIN comanda c     ON c.id   = i.comanda_id
 WHERE c.status = 'fechada'
   AND DATE(c.fechada_em) BETWEEN CURDATE() - INTERVAL 29 DAY AND CURDATE()
   AND i.status <> 'cancelado'
 GROUP BY p.id, p.nome, cat.nome
 ORDER BY receita DESC
 LIMIT 10;


-- ----------------------------------------------------------------------------
-- 3. Desempenho por garcom: comandas, receita, ticket medio e tempo de mesa
--
--    HAVING e nao WHERE: o filtro incide sobre o resultado da agregacao, que
--    ainda nao existe quando o WHERE roda. Garcom cujas comandas foram todas
--    canceladas nao aparece no ranking.
-- ----------------------------------------------------------------------------
SELECT g.nome                                            AS garcom,
       g.apelido,
       COUNT(DISTINCT c.id)                              AS comandas,
       SUM(i.subtotal)                                   AS receita,
       ROUND(SUM(i.subtotal) / COUNT(DISTINCT c.id), 2)  AS ticket_medio,
       CAST(ROUND(AVG(TIMESTAMPDIFF(MINUTE, c.aberta_em, c.fechada_em))) AS SIGNED)
                                                         AS minutos_medios
  FROM garcom g
  JOIN comanda c      ON c.garcom_id  = g.id
  JOIN item_comanda i ON i.comanda_id = c.id
 WHERE c.status = 'fechada'
   AND DATE(c.fechada_em) BETWEEN CURDATE() - INTERVAL 29 DAY AND CURDATE()
 GROUP BY g.id, g.nome, g.apelido
HAVING receita > 0
 ORDER BY receita DESC;


-- ----------------------------------------------------------------------------
-- 4. Movimento por faixa de horario
--
--    Agrupa por uma expressao, HOUR(aberta_em), e nao por coluna. Mostra a
--    curva da noite: enche as 18h, pico entre 20h e 23h, cai depois da meia-noite.
-- ----------------------------------------------------------------------------
SELECT HOUR(c.aberta_em)            AS hora,
       COUNT(DISTINCT c.id)         AS comandas,
       COALESCE(SUM(i.subtotal), 0) AS faturamento
  FROM comanda c
  LEFT JOIN item_comanda i ON i.comanda_id = c.id
 WHERE c.status = 'fechada'
   AND DATE(c.fechada_em) BETWEEN CURDATE() - INTERVAL 29 DAY AND CURDATE()
 GROUP BY HOUR(c.aberta_em)
 ORDER BY hora;


-- ----------------------------------------------------------------------------
-- 5. Ranking de produtos dentro de cada categoria -- window function
--
--    RANK() OVER (PARTITION BY cat.id ORDER BY SUM(...) DESC) resolve em uma
--    passada o que exigiria uma subconsulta correlacionada por categoria.
--
--    O SELECT externo existe porque nao se filtra window function no WHERE: ela
--    e calculada depois dele. Por isso o ranking vira subconsulta e o corte por
--    posicao acontece fora.
-- ----------------------------------------------------------------------------
SELECT categoria, produto, unidades, receita, posicao
  FROM (
        SELECT cat.nome                     AS categoria,
               p.nome                       AS produto,
               CAST(SUM(i.qtd) AS UNSIGNED) AS unidades,
               SUM(i.subtotal)              AS receita,
               RANK() OVER (PARTITION BY cat.id ORDER BY SUM(i.subtotal) DESC) AS posicao
          FROM item_comanda i
          JOIN produto p     ON p.id   = i.produto_id
          JOIN categoria cat ON cat.id = p.categoria_id
          JOIN comanda c     ON c.id   = i.comanda_id
         WHERE c.status = 'fechada'
           AND DATE(c.fechada_em) BETWEEN CURDATE() - INTERVAL 29 DAY AND CURDATE()
           AND i.status <> 'cancelado'
         GROUP BY cat.id, cat.nome, p.id, p.nome
       ) AS ranqueado
 WHERE posicao <= 3
 ORDER BY categoria, posicao;


-- ----------------------------------------------------------------------------
-- 6. Fotografia do salao agora -- VIEW sobre LEFT JOIN
--
--    vw_salao mostra TODA mesa, ocupada ou livre: e o LEFT JOIN que mantem a
--    mesa livre na lista, com comanda_id NULL. Um INNER JOIN devolveria apenas
--    as ocupadas, e a tela precisa desenhar o salao inteiro.
-- ----------------------------------------------------------------------------
SELECT numero, lugares, situacao, garcom, cliente, total, minutos
  FROM vw_salao
 ORDER BY numero;


-- ----------------------------------------------------------------------------
--  Extra: as regras do banco em acao. Cada linha abaixo TEM que dar erro.
--  Util na apresentacao para mostrar que a integridade nao depende da aplicacao.
-- ----------------------------------------------------------------------------

-- duas comandas abertas na mesma mesa -> ER_DUP_ENTRY em uq_mesa_ocupada
-- INSERT INTO comanda (mesa_id, garcom_id, status)
--   SELECT mesa_id, garcom_id, 'aberta' FROM comanda WHERE status='aberta' LIMIT 1;

-- lancar item em comanda fechada -> SIGNAL do trg_item_antes_insert
-- INSERT INTO item_comanda (comanda_id, produto_id, qtd, preco_unitario)
--   SELECT id, 1, 1, 10.00 FROM comanda WHERE status='fechada' LIMIT 1;

-- riscar item de comanda fechada -> SIGNAL do trg_item_antes_update
-- UPDATE item_comanda SET status='cancelado'
--  WHERE comanda_id = (SELECT id FROM comanda WHERE status='fechada' LIMIT 1) LIMIT 1;

-- quantidade zero -> CHECK ck_item_qtd
-- INSERT INTO item_comanda (comanda_id, produto_id, qtd, preco_unitario)
--   SELECT id, 1, 0, 10.00 FROM comanda WHERE status='aberta' LIMIT 1;

-- preco negativo -> CHECK ck_produto_preco
-- INSERT INTO produto (categoria_id, nome, preco) VALUES (1, 'Teste', -5.00);

-- apagar categoria que tem produto -> FK RESTRICT fk_produto_categoria
-- DELETE FROM categoria WHERE id = 1;

-- fechar comanda ja fechada -> SIGNAL da sp_fechar_comanda
-- CALL sp_fechar_comanda((SELECT id FROM comanda WHERE status='fechada' LIMIT 1), @t);
