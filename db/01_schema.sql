-- ============================================================================
--  Bento's Beer -- esquema do banco
--  Trabalho de Banco de Dados, UFPB. Gabriel, Rivando e Rafael.
-- ============================================================================
--
--  Sete tabelas, duas views, dois triggers e uma procedure transacional.
--
--  A ideia central do modelo e a COMANDA: um bar nao vende produto para
--  cliente, vende itens dentro de uma conta aberta em uma mesa, atendida por um
--  garcom, que em algum momento fecha. E a comanda que transforma tabelas
--  soltas em um modelo com perguntas de verdade -- "quanto tem na mesa 7?".
--
--  Regra de negocio mora aqui, no banco, e nao em if de JavaScript. Cada CHECK,
--  cada coluna gerada, cada indice e cada trigger abaixo tem um comentario de
--  uma linha dizendo qual regra implementa.
--
--  Roda tanto por `npm run db:reset` quanto direto no Workbench ou no cliente
--  mysql -- e por isso que o arquivo cria e seleciona o banco por conta propria.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS bentosbeer
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE bentosbeer;


-- ----------------------------------------------------------------------------
--  mesa -- o salao fisico
-- ----------------------------------------------------------------------------
CREATE TABLE mesa (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  numero  SMALLINT NOT NULL,
  lugares TINYINT  NOT NULL DEFAULT 4,
  -- duas mesas nao podem ter o mesmo numero: e por ele que o garcom se orienta
  CONSTRAINT uq_mesa_numero UNIQUE (numero),
  -- nao existe mesa 0 nem mesa negativa
  CONSTRAINT ck_mesa_numero  CHECK (numero > 0),
  -- barra o erro de digitacao: mesa de 0 lugares ou de 200 lugares nao existe
  CONSTRAINT ck_mesa_lugares CHECK (lugares BETWEEN 1 AND 20)
) ENGINE=InnoDB;


-- ----------------------------------------------------------------------------
--  cliente -- cadastro opcional; mesa de passagem nao exige nome
-- ----------------------------------------------------------------------------
CREATE TABLE cliente (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  telefone  VARCHAR(20)  NULL,
  criado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- nome vazio ou so com espacos nao identifica ninguem
  CONSTRAINT ck_cliente_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 2)
) ENGINE=InnoDB;


-- ----------------------------------------------------------------------------
--  garcom -- a equipe
-- ----------------------------------------------------------------------------
CREATE TABLE garcom (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(100) NOT NULL,
  apelido VARCHAR(40)  NULL,
  -- desligar garcom nao apaga o historico de comandas dele: marca como inativo
  ativo   BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_garcom_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 2)
) ENGINE=InnoDB;


-- ----------------------------------------------------------------------------
--  categoria -- as secoes do cardapio
-- ----------------------------------------------------------------------------
CREATE TABLE categoria (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(40) NOT NULL,
  -- define a ordem em que as secoes aparecem no cardapio, que nao e alfabetica
  ordem TINYINT     NOT NULL DEFAULT 0,
  -- duas secoes com o mesmo nome confundiriam o cardapio
  CONSTRAINT uq_categoria_nome UNIQUE (nome)
) ENGINE=InnoDB;


-- ----------------------------------------------------------------------------
--  produto -- o cardapio
-- ----------------------------------------------------------------------------
CREATE TABLE produto (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT           NOT NULL,
  nome         VARCHAR(100)  NOT NULL,
  descricao    VARCHAR(255)  NULL,
  preco        DECIMAL(10,2) NOT NULL,
  -- produto esgotado sai do cardapio sem ser apagado, para nao quebrar historico
  disponivel   BOOLEAN       NOT NULL DEFAULT TRUE,
  -- RESTRICT: apagar categoria que ainda tem produto e erro, nao cascata silenciosa
  CONSTRAINT fk_produto_categoria FOREIGN KEY (categoria_id)
    REFERENCES categoria(id) ON DELETE RESTRICT,
  -- preco negativo nao existe; de graca (zero) existe, entao o limite e >= 0
  CONSTRAINT ck_produto_preco CHECK (preco >= 0),
  -- dois "Chope Pilsen 500ml" no cardapio seria erro de cadastro
  CONSTRAINT uq_produto_nome UNIQUE (nome)
) ENGINE=InnoDB;


-- ----------------------------------------------------------------------------
--  comanda -- a conta aberta na mesa. O centro do modelo.
-- ----------------------------------------------------------------------------
CREATE TABLE comanda (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id    INT NOT NULL,
  garcom_id  INT NOT NULL,
  -- NULL e valido: mesa de passagem nao precisa de cliente cadastrado
  cliente_id INT NULL,
  -- ENUM em vez de VARCHAR livre: o banco recusa qualquer status fora destes tres
  status     ENUM('aberta','fechada','cancelada') NOT NULL DEFAULT 'aberta',
  aberta_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- so recebe valor no fechamento; NULL enquanto a conta esta correndo
  fechada_em TIMESTAMP NULL,
  observacao VARCHAR(255) NULL,

  -- coluna gerada: carrega o mesa_id apenas enquanto a comanda esta aberta,
  -- e NULL em qualquer outro status. Como NULL nao colide em indice UNIQUE, o
  -- par (coluna gerada + UNIQUE) faz o proprio banco impedir duas comandas
  -- abertas na mesma mesa -- no INSERT e tambem no UPDATE, que era exatamente
  -- o furo da versao anterior, onde a checagem existia so na aplicacao e so na
  -- criacao. Uma mesa pode ter cem comandas fechadas no historico e ainda assim
  -- no maximo uma aberta agora.
  mesa_ocupada INT AS (IF(status = 'aberta', mesa_id, NULL)) STORED,
  CONSTRAINT uq_mesa_ocupada UNIQUE (mesa_ocupada),

  -- amarra status e hora de fechamento: conta aberta nao tem hora de fechamento,
  -- e conta fechada obrigatoriamente tem. Um sem o outro seria dado corrompido,
  -- e o relatorio de faturamento filtra justamente por fechada_em
  CONSTRAINT ck_comanda_fechamento CHECK (
    (status = 'aberta'    AND fechada_em IS NULL)     OR
    (status = 'fechada'   AND fechada_em IS NOT NULL) OR
    (status = 'cancelada')
  ),

  CONSTRAINT fk_comanda_mesa    FOREIGN KEY (mesa_id)    REFERENCES mesa(id),
  CONSTRAINT fk_comanda_garcom  FOREIGN KEY (garcom_id)  REFERENCES garcom(id),
  -- cliente apagado nao apaga a venda: a comanda fica anonima
  CONSTRAINT fk_comanda_cliente FOREIGN KEY (cliente_id) REFERENCES cliente(id)
    ON DELETE SET NULL,

  -- serve a consulta mais frequente do sistema: as comandas abertas do salao,
  -- em ordem de abertura (a coluna aberta_em no indice evita ordenar em memoria)
  INDEX idx_comanda_status (status, aberta_em),
  -- serve os relatorios, que filtram faturamento por intervalo de fechamento
  INDEX idx_comanda_fechada (fechada_em)
) ENGINE=InnoDB;


-- ----------------------------------------------------------------------------
--  item_comanda -- o que foi lancado na conta
-- ----------------------------------------------------------------------------
CREATE TABLE item_comanda (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  comanda_id     INT NOT NULL,
  produto_id     INT NOT NULL,
  qtd            SMALLINT      NOT NULL DEFAULT 1,
  -- fotografia do preco no momento do lancamento. Reajuste de cardapio amanha
  -- nao pode reescrever o valor da venda de hoje -- por isso o preco e copiado
  -- para ca em vez de ser lido de produto.preco na hora do relatorio
  preco_unitario DECIMAL(10,2) NOT NULL,
  -- ENUM: o bar nao apaga item, o bar risca. 'cancelado' preserva o rastro
  status         ENUM('pendente','entregue','cancelado') NOT NULL DEFAULT 'pendente',
  criado_em      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- coluna gerada: o subtotal da linha, ja zerado quando o item foi cancelado.
  -- Calcular aqui, uma vez, garante que todo SUM() do sistema -- procedure de
  -- fechamento, views e os seis relatorios -- use exatamente a mesma regra,
  -- em vez de cada consulta repetir o IF e uma delas esquecer
  subtotal       DECIMAL(12,2) AS (IF(status = 'cancelado', 0, qtd * preco_unitario)) STORED,

  -- CASCADE: apagar a comanda apaga os itens dela, que nao existem sozinhos
  CONSTRAINT fk_item_comanda FOREIGN KEY (comanda_id)
    REFERENCES comanda(id) ON DELETE CASCADE,
  -- sem CASCADE: produto vendido nao pode ser apagado e sumir com a venda
  CONSTRAINT fk_item_produto FOREIGN KEY (produto_id) REFERENCES produto(id),
  -- lancar zero unidade, ou quantidade negativa, nao e pedido
  CONSTRAINT ck_item_qtd   CHECK (qtd > 0),
  CONSTRAINT ck_item_preco CHECK (preco_unitario >= 0),

  -- explicito para deixar claro que abrir uma comanda depende dele; a FK
  -- reaproveita este indice em vez de criar um segundo igual
  INDEX idx_item_comanda (comanda_id),
  -- serve os relatorios de produto mais vendido e de ranking por categoria
  INDEX idx_item_produto (produto_id)
) ENGINE=InnoDB;


-- ============================================================================
--  VIEWS
-- ============================================================================

-- Uma comanda com tudo que a tela precisa mostrar, em uma linha: nomes em vez
-- de ids, contagem de itens, total somado em SQL e tempo decorrido. Existe para
-- que nem a aplicacao nem os relatorios repitam esses quatro JOINs.
CREATE OR REPLACE VIEW vw_comanda AS
SELECT c.id,
       c.status,
       c.aberta_em,
       c.fechada_em,
       -- as tres chaves ficam expostas junto com os nomes: quem vai desenhar a
       -- tela quer o nome, e quem vai juntar a view com outra tabela quer a
       -- chave. Sem elas, os repositorios juntariam por nome, que nao e chave
       c.mesa_id,
       c.garcom_id,
       c.cliente_id,
       m.numero  AS mesa,
       g.nome    AS garcom,
       cl.nome   AS cliente,
       COUNT(i.id)                                      AS itens,
       SUM(IF(i.status = 'cancelado', 0, 1))            AS itens_ativos,
       COALESCE(SUM(i.subtotal), 0)                      AS total,
       TIMESTAMPDIFF(MINUTE, c.aberta_em, COALESCE(c.fechada_em, NOW())) AS minutos
FROM comanda c
JOIN mesa m              ON m.id  = c.mesa_id
JOIN garcom g            ON g.id  = c.garcom_id
LEFT JOIN cliente cl     ON cl.id = c.cliente_id
LEFT JOIN item_comanda i ON i.comanda_id = c.id
GROUP BY c.id, c.status, c.aberta_em, c.fechada_em,
         c.mesa_id, c.garcom_id, c.cliente_id, m.numero, g.nome, cl.nome;

-- A fotografia do salao: toda mesa aparece, ocupada ou nao. O LEFT JOIN e o que
-- faz a mesa livre continuar na lista, com comanda_id NULL -- um INNER JOIN
-- mostraria so as ocupadas, e a tela precisa desenhar o salao inteiro.
CREATE OR REPLACE VIEW vw_salao AS
SELECT m.id AS mesa_id,
       m.numero,
       m.lugares,
       c.id AS comanda_id,
       c.garcom,
       c.cliente,
       c.total,
       c.minutos,
       IF(c.id IS NULL, 'livre', 'ocupada') AS situacao
FROM mesa m
LEFT JOIN vw_comanda c ON c.mesa_id = m.id AND c.status = 'aberta';


-- ============================================================================
--  REGRAS NO BANCO -- triggers e procedure
-- ============================================================================

DELIMITER //

-- Nao se lanca item em comanda que nao esta aberta. Sem este trigger, a
-- aplicacao poderia pendurar consumo em conta ja paga -- e o relatorio do dia
-- mudaria depois de fechado.
CREATE TRIGGER trg_item_antes_insert BEFORE INSERT ON item_comanda
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  SELECT status INTO v_status FROM comanda WHERE id = NEW.comanda_id;
  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda inexistente';
  ELSEIF v_status <> 'aberta' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda nao esta aberta';
  END IF;
END//

-- A mesma regra valendo no UPDATE. O bug classico da versao anterior era
-- exatamente este: regra checada na criacao e esquecida na edicao. Sem este
-- trigger, daria para riscar ou reajustar item de uma conta ja fechada.
CREATE TRIGGER trg_item_antes_update BEFORE UPDATE ON item_comanda
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  SELECT status INTO v_status FROM comanda WHERE id = NEW.comanda_id;
  IF v_status <> 'aberta' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda ja foi encerrada';
  END IF;
END//

-- Fechar conta e a unica operacao do sistema que precisa ser atomica: marca os
-- itens como entregues, soma o total e carimba a hora. Se qualquer passo
-- falhasse no meio, a comanda ficaria fechada sem total ou com total errado.
-- O SELECT ... FOR UPDATE trava a linha, entao dois garcons apertando "fechar"
-- ao mesmo tempo nao fecham a mesma conta duas vezes: o segundo espera, ve o
-- status ja mudado e recebe erro.
CREATE PROCEDURE sp_fechar_comanda(IN p_comanda_id INT, OUT p_total DECIMAL(12,2))
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    SELECT status INTO v_status FROM comanda WHERE id = p_comanda_id FOR UPDATE;

    IF v_status IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda inexistente';
    ELSEIF v_status <> 'aberta' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda ja foi encerrada';
    END IF;

    UPDATE item_comanda SET status = 'entregue'
      WHERE comanda_id = p_comanda_id AND status = 'pendente';

    SELECT COALESCE(SUM(subtotal), 0) INTO p_total
      FROM item_comanda WHERE comanda_id = p_comanda_id;

    UPDATE comanda SET status = 'fechada', fechada_em = NOW()
      WHERE id = p_comanda_id;
  COMMIT;
END//

DELIMITER ;
