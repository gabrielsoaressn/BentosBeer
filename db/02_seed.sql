-- ============================================================================
--  Bento's Beer -- dados de demonstracao
-- ============================================================================
--
--  Duas partes:
--
--  1. Dados de referencia (mesas, categorias, cardapio, equipe, clientes):
--     INSERT comum, porque nao dependem de nada.
--
--  2. Movimento (60 comandas fechadas nos ultimos 30 dias + 5 abertas agora):
--     gerado por procedure, NAO por INSERT. Duas regras do proprio banco
--     impedem o caminho declarativo, e isso e uma boa noticia -- e a prova de
--     que as regras funcionam:
--
--       - trg_item_antes_insert recusa item lancado em comanda que nao esta
--         aberta, entao nao da para inserir uma comanda ja fechada e depois
--         pendurar itens nela. O ciclo tem que ser abrir -> lancar -> fechar.
--       - uq_mesa_ocupada permite uma so comanda aberta por mesa a cada
--         instante, entao as comandas tem que ser criadas em sequencia, e nao
--         todas de uma vez.
--
--     A procedure tambem rende o SQL que a disciplina quer ver: WHILE,
--     variaveis locais, RAND() e aritmetica de data. Ela e descartada no fim.
-- ============================================================================

USE bentosbeer;

-- ----------------------------------------------------------------------------
--  Salao: 12 mesas de tamanhos diferentes
-- ----------------------------------------------------------------------------
INSERT INTO mesa (numero, lugares) VALUES
  (1, 2), (2, 2), (3, 4), (4, 4), (5, 4), (6, 4),
  (7, 6), (8, 6), (9, 6), (10, 8), (11, 8), (12, 10);

-- ----------------------------------------------------------------------------
--  Cardapio: 6 secoes na ordem em que aparecem na tela
-- ----------------------------------------------------------------------------
INSERT INTO categoria (nome, ordem) VALUES
  ('Chopes',      1),
  ('Cervejas',    2),
  ('Drinks',      3),
  ('Sem alcool',  4),
  ('Porcoes',     5),
  ('Sobremesas',  6);

INSERT INTO produto (categoria_id, nome, descricao, preco) VALUES
  -- Chopes
  ((SELECT id FROM categoria WHERE nome='Chopes'), 'Chope Pilsen 300ml', 'Tulipa gelada, colarinho de dois dedos', 9.00),
  ((SELECT id FROM categoria WHERE nome='Chopes'), 'Chope Pilsen 500ml', 'Caneca', 14.00),
  ((SELECT id FROM categoria WHERE nome='Chopes'), 'Chope Escuro 500ml', 'Malte torrado, corpo medio', 16.00),
  ((SELECT id FROM categoria WHERE nome='Chopes'), 'Chope IPA 500ml',    'Amargor alto, bem lupulado', 18.00),
  -- Cervejas
  ((SELECT id FROM categoria WHERE nome='Cervejas'), 'Heineken Long Neck',  '330ml', 12.00),
  ((SELECT id FROM categoria WHERE nome='Cervejas'), 'Budweiser Long Neck', '330ml', 10.00),
  ((SELECT id FROM categoria WHERE nome='Cervejas'), 'Corona Long Neck',    '330ml com limao', 14.00),
  ((SELECT id FROM categoria WHERE nome='Cervejas'), 'Original 600ml',      'Garrafa para dividir', 16.00),
  ((SELECT id FROM categoria WHERE nome='Cervejas'), 'Brahma Lata',         '350ml', 7.00),
  -- Drinks
  ((SELECT id FROM categoria WHERE nome='Drinks'), 'Caipirinha de Limao',  'Cachaca, limao taiti, acucar', 18.00),
  ((SELECT id FROM categoria WHERE nome='Drinks'), 'Caipiroska de Morango','Vodca e morango fresco', 22.00),
  ((SELECT id FROM categoria WHERE nome='Drinks'), 'Gin Tonica',           'Gin, tonica, zimbro e limao siciliano', 26.00),
  ((SELECT id FROM categoria WHERE nome='Drinks'), 'Batida de Coco',       'Leite de coco e cachaca', 16.00),
  ((SELECT id FROM categoria WHERE nome='Drinks'), 'Aperol Spritz',        'Aperol, prosecco e agua com gas', 28.00),
  ((SELECT id FROM categoria WHERE nome='Drinks'), 'Dose de Whisky',       'Duplo, com gelo', 22.00),
  -- Sem alcool
  ((SELECT id FROM categoria WHERE nome='Sem alcool'), 'Refrigerante Lata',   '350ml', 6.00),
  ((SELECT id FROM categoria WHERE nome='Sem alcool'), 'Agua Mineral',        '500ml sem gas', 4.00),
  ((SELECT id FROM categoria WHERE nome='Sem alcool'), 'Agua com Gas',        '500ml', 5.00),
  ((SELECT id FROM categoria WHERE nome='Sem alcool'), 'Suco Natural',        'Laranja, abacaxi ou maracuja', 9.00),
  ((SELECT id FROM categoria WHERE nome='Sem alcool'), 'Energetico',          '250ml', 12.00),
  ((SELECT id FROM categoria WHERE nome='Sem alcool'), 'Cafe Expresso',       'Para fechar a noite', 6.00),
  -- Porcoes
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Porcao de Calabresa',   'Com cebola e pao de alho', 38.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Isca de Frango',        'Empanada, com molho da casa', 42.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Batata Frita',          'Porcao grande', 32.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Batata com Cheddar',    'Cheddar e bacon', 45.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Torresmo Mineiro',      'Crocante, com limao', 35.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Bolinho de Bacalhau',   '10 unidades', 44.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Tabua de Frios',        'Queijos, salame e azeitona', 58.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Pastel de Queijo',      'Unidade', 8.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Pastel de Carne',       'Unidade', 9.00),
  ((SELECT id FROM categoria WHERE nome='Porcoes'), 'Amendoim Torrado',      'Cortesia da casa em dobro', 12.00),
  -- Sobremesas
  ((SELECT id FROM categoria WHERE nome='Sobremesas'), 'Pudim de Leite',      'Fatia', 14.00),
  ((SELECT id FROM categoria WHERE nome='Sobremesas'), 'Petit Gateau',        'Com sorvete de creme', 18.00),
  ((SELECT id FROM categoria WHERE nome='Sobremesas'), 'Mousse de Maracuja',  'Taca', 12.00);

-- ----------------------------------------------------------------------------
--  Equipe
-- ----------------------------------------------------------------------------
INSERT INTO garcom (nome, apelido, ativo) VALUES
  ('Gabriel Soares',  'Gabi',    TRUE),
  ('Rivando Pereira', 'Rivan',   TRUE),
  ('Rafael Andrade',  'Rafa',    TRUE);

-- ----------------------------------------------------------------------------
--  Clientes -- telefones ficticios
-- ----------------------------------------------------------------------------
INSERT INTO cliente (nome, telefone) VALUES
  ('Ana Beatriz Lima',    '(83) 98800-0001'),
  ('Carlos Eduardo Melo', '(83) 98800-0002'),
  ('Marina Fonseca',      '(83) 98800-0003'),
  ('Joao Vitor Ramos',    '(83) 98800-0004'),
  ('Larissa Cavalcanti',  '(83) 98800-0005'),
  ('Pedro Henrique Sa',   '(83) 98800-0006'),
  ('Juliana Barbosa',     NULL),
  ('Thiago Nobrega',      '(83) 98800-0008'),
  ('Camila Duarte',       '(83) 98800-0009'),
  ('Rodrigo Alencar',     NULL),
  ('Fernanda Vieira',     '(83) 98800-0011'),
  ('Lucas Marinho',       '(83) 98800-0012'),
  ('Patricia Nunes',      '(83) 98800-0013'),
  ('Bruno Tavares',       '(83) 98800-0014'),
  ('Isabela Queiroz',     '(83) 98800-0015');


-- ============================================================================
--  MOVIMENTO
-- ============================================================================

DELIMITER //

-- Cria uma comanda fechada em algum momento de p_dias_atras dias atras,
-- percorrendo o ciclo real: abre, lanca itens, fecha com data retroativa.
CREATE PROCEDURE sp_criar_comanda_historica(IN p_dias_atras INT)
BEGIN
  DECLARE v_mesa      INT;
  DECLARE v_garcom    INT;
  DECLARE v_cliente   INT DEFAULT NULL;
  DECLARE v_comanda   INT;
  DECLARE v_produto   INT;
  DECLARE v_preco     DECIMAL(10,2);
  DECLARE v_abertura  DATETIME;
  DECLARE v_qtd_itens INT;
  DECLARE v_i         INT DEFAULT 0;
  DECLARE v_duracao   INT;

  -- horario plausivel de bar: entre 18h00 e 00h59 do dia escolhido
  SET v_abertura = DATE_ADD(
      DATE_ADD(DATE(NOW() - INTERVAL p_dias_atras DAY), INTERVAL 18 HOUR),
      INTERVAL FLOOR(RAND() * 420) MINUTE);

  SELECT id INTO v_mesa   FROM mesa   ORDER BY RAND() LIMIT 1;
  SELECT id INTO v_garcom FROM garcom WHERE ativo = TRUE ORDER BY RAND() LIMIT 1;

  -- 60% das mesas se identificam; o resto e passagem
  IF RAND() < 0.6 THEN
    SELECT id INTO v_cliente FROM cliente ORDER BY RAND() LIMIT 1;
  END IF;

  INSERT INTO comanda (mesa_id, garcom_id, cliente_id, status, aberta_em)
  VALUES (v_mesa, v_garcom, v_cliente, 'aberta', v_abertura);
  SET v_comanda = LAST_INSERT_ID();

  SET v_qtd_itens = 2 + FLOOR(RAND() * 5);   -- de 2 a 6 itens por comanda
  WHILE v_i < v_qtd_itens DO
    SELECT id, preco INTO v_produto, v_preco
      FROM produto WHERE disponivel = TRUE ORDER BY RAND() LIMIT 1;

    INSERT INTO item_comanda (comanda_id, produto_id, qtd, preco_unitario, status, criado_em)
    VALUES (v_comanda,
            v_produto,
            1 + FLOOR(RAND() * 3),
            v_preco,
            -- 1 em cada 12 itens volta para a cozinha e e riscado
            IF(RAND() < 0.08, 'cancelado', 'entregue'),
            DATE_ADD(v_abertura, INTERVAL FLOOR(RAND() * 50) MINUTE));

    SET v_i = v_i + 1;
  END WHILE;

  -- mesa fica de 35 minutos a duas horas
  SET v_duracao = 35 + FLOOR(RAND() * 90);
  UPDATE comanda
     SET status = 'fechada',
         fechada_em = DATE_ADD(v_abertura, INTERVAL v_duracao MINUTE)
   WHERE id = v_comanda;
END//

-- Cria uma comanda aberta agora, em uma mesa que ainda esta livre.
CREATE PROCEDURE sp_criar_comanda_aberta()
BEGIN
  DECLARE v_mesa      INT;
  DECLARE v_garcom    INT;
  DECLARE v_cliente   INT DEFAULT NULL;
  DECLARE v_comanda   INT;
  DECLARE v_produto   INT;
  DECLARE v_preco     DECIMAL(10,2);
  DECLARE v_abertura  DATETIME;
  DECLARE v_qtd_itens INT;
  DECLARE v_i         INT DEFAULT 0;

  -- so mesa sem comanda aberta: e o que uq_mesa_ocupada exigiria de qualquer jeito
  SELECT m.id INTO v_mesa
    FROM mesa m
   WHERE NOT EXISTS (SELECT 1 FROM comanda c
                      WHERE c.mesa_id = m.id AND c.status = 'aberta')
   ORDER BY RAND() LIMIT 1;

  IF v_mesa IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nao ha mesa livre para abrir comanda';
  END IF;

  SELECT id INTO v_garcom FROM garcom WHERE ativo = TRUE ORDER BY RAND() LIMIT 1;
  IF RAND() < 0.6 THEN
    SELECT id INTO v_cliente FROM cliente ORDER BY RAND() LIMIT 1;
  END IF;

  -- aberta em algum momento da ultima hora e meia
  SET v_abertura = DATE_ADD(NOW(), INTERVAL -FLOOR(RAND() * 90) MINUTE);

  INSERT INTO comanda (mesa_id, garcom_id, cliente_id, status, aberta_em)
  VALUES (v_mesa, v_garcom, v_cliente, 'aberta', v_abertura);
  SET v_comanda = LAST_INSERT_ID();

  SET v_qtd_itens = 1 + FLOOR(RAND() * 4);
  WHILE v_i < v_qtd_itens DO
    SELECT id, preco INTO v_produto, v_preco
      FROM produto WHERE disponivel = TRUE ORDER BY RAND() LIMIT 1;

    INSERT INTO item_comanda (comanda_id, produto_id, qtd, preco_unitario, status, criado_em)
    VALUES (v_comanda,
            v_produto,
            1 + FLOOR(RAND() * 3),
            v_preco,
            -- na mesa que ainda esta bebendo, parte do pedido nao chegou
            IF(RAND() < 0.4, 'pendente', 'entregue'),
            DATE_ADD(v_abertura, INTERVAL FLOOR(RAND() * 20) MINUTE));

    SET v_i = v_i + 1;
  END WHILE;
END//

CREATE PROCEDURE sp_gerar_movimento()
BEGIN
  DECLARE v_fechadas INT DEFAULT 0;
  DECLARE v_abertas  INT DEFAULT 0;
  DECLARE v_dia      INT;
  DECLARE v_voltas   INT DEFAULT 0;

  -- Passe 1: uma comanda em cada um dos 30 dias anteriores. Garante que o
  -- relatorio de faturamento diario nao tenha buraco -- grafico com dia zerado
  -- no meio parece bug de consulta na hora da apresentacao.
  --
  -- O historico vai de ontem (1) para tras, e nao de hoje (0): comanda aberta
  -- as 23h de hoje teria fechamento no futuro, e o dia corrente comecar vazio e
  -- justamente o que faz a venda do roteiro de demonstracao aparecer sozinha no
  -- relatorio do dia.
  SET v_dia = 30;
  WHILE v_dia >= 1 DO
    CALL sp_criar_comanda_historica(v_dia);
    SET v_fechadas = v_fechadas + 1;
    SET v_dia = v_dia - 1;
  END WHILE;

  -- Passe 2: o volume restante vai para quinta, sexta e sabado, que e quando
  -- bar enche. Sem essa concentracao o relatorio por dia da semana fica reto e
  -- sem graca. Roda em voltas ate somar 60, com trava de seguranca.
  WHILE v_fechadas < 60 AND v_voltas < 10 DO
    SET v_dia = 30;
    WHILE v_dia >= 1 AND v_fechadas < 60 DO
      IF DAYOFWEEK(DATE(NOW() - INTERVAL v_dia DAY)) IN (5, 6, 7) THEN
        CALL sp_criar_comanda_historica(v_dia);
        SET v_fechadas = v_fechadas + 1;
      END IF;
      SET v_dia = v_dia - 1;
    END WHILE;
    SET v_voltas = v_voltas + 1;
  END WHILE;

  -- Passe 3: o salao agora. Cinco mesas ocupadas para a tela inicial ter o que
  -- mostrar e para o roteiro de demonstracao ter mesa livre onde abrir a sexta.
  WHILE v_abertas < 5 DO
    CALL sp_criar_comanda_aberta();
    SET v_abertas = v_abertas + 1;
  END WHILE;
END//

DELIMITER ;

CALL sp_gerar_movimento();

-- As procedures de seed nao fazem parte do sistema: sairam de cena depois de
-- popular. As que ficam no banco sao so as de 01_schema.sql.
DROP PROCEDURE sp_gerar_movimento;
DROP PROCEDURE sp_criar_comanda_historica;
DROP PROCEDURE sp_criar_comanda_aberta;
