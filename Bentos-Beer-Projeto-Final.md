# Bento's Beer — Projeto Final

> Reescrita orientada do sistema de gerenciamento de bar.
> Disciplina de Banco de Dados — UFPB. Autores: Gabriel, Rivando e Rafael.
> Este documento substitui o `Projeto.md` anterior como especificação de referência.

---

## 1. Diagnóstico em uma página

O sistema atual funciona como **cadastro**, não como **operação de bar**. O código tem virtudes reais
— prepared statements em 100% das queries, injeção de dependência manual, bootstrap que falha rápido
se o banco não sobe — mas o produto entregue não responde à pergunta que um bar faz o tempo todo:
*quanto tem na mesa 7?*

| Camada | Situação | Veredito |
|---|---|---|
| Banco | 4 tabelas, sem CHECK, sem UNIQUE, sem índice explícito, DDL não versionado | Subaproveitado para uma disciplina de BD |
| Backend | 15 rotas CRUD, conexão única, zero validação, credenciais no código | Precisa de camadas e de transação |
| Frontend | SPA de 4 seções, edição via `prompt()`, filtro só client-side | Precisa de identidade e de fluxo |
| Repositório | 3 cópias do mesmo código, `package.json` inválido | Precisa de desentulho |

**A causa raiz do subaproveitamento acadêmico**: `pedido` é a única tabela interessante do esquema
— é a associativa, é onde moram JOIN, GROUP BY, agregação e transação — e é justamente a que não tem
rota nem tela. O relatório atual soma preços de catálogo em JavaScript, o que não é nem faturamento
nem estoque: é um número sem significado de negócio.

### 1.1 As três decisões que mudam o projeto

1. **Introduzir a comanda.** Um bar não vende produto para cliente; vende itens dentro de uma conta
   aberta em uma mesa, atendida por um garçom, que em algum momento fecha. Essa entidade é o que
   transforma quatro tabelas soltas em um modelo relacional com perguntas de verdade.
2. **Empurrar as regras para o banco.** `CHECK`, `ENUM`, `UNIQUE` sobre coluna gerada, `VIEW`,
   `TRIGGER` e uma `PROCEDURE` transacional. Numa disciplina de BD, regra implementada em SQL vale
   mais que regra implementada em `if`. E resolve de vez o bug da mesa duplicada na edição.
3. **Dar cara ao produto.** A interface hoje é o CSS default de qualquer tutorial. A identidade
   proposta (§6) sai do próprio assunto — cervejaria bávara, comanda de papel — e não de um template.

---

## 2. Escopo do projeto final

**Entra:** salão com mesas, comandas abertas/fechadas, itens de comanda com preço congelado,
cardápio com categorias, equipe, clientes, seis relatórios gerenciais, seed de demonstração,
testes de integração.

**Fica de fora (declarado, não esquecido):** autenticação, pagamento, impressão fiscal, estoque,
multiusuário simultâneo, deploy. O escopo é uma estação de trabalho local, e o README diz isso.

---

## 3. Correções obrigatórias herdadas

Ficam resolvidas por construção na nova estrutura, mas listadas para rastreabilidade com o
documento anterior:

| # antigo | Problema | Como morre |
|---|---|---|
| 9.1-1 | Comentário `//` invalida o `package.json` | `package.json` novo |
| 9.1-2 | `Classes/` não executa | Diretório removido; preservado em tag git |
| 9.2-3 | `express.static('.')` expõe o backend | Estáticos só em `public/` |
| 9.2-4 | Senha hardcoded e versionada | `.env` + `.env.example` + `.gitignore` |
| 9.2-6 | Zero validação de entrada | Validador próprio em `src/http/validate.js` |
| 9.3-7 | `createGarcom` não retorna `insertId` | Repositórios com retorno padronizado |
| 9.3-8 | `editarGarcom` duplicada | Frontend modularizado por tela |
| 9.3-9 | Case de tabela divergente | Convenção `snake_case` minúsculo, sem exceção |
| 9.3-10 | Regra da mesa não vale no `UPDATE` | `UNIQUE` sobre coluna gerada no banco |
| 9.3-11 | Busca sem debounce | Helper `debounce()` de 250 ms |
| 9.4-12 | Pedido sem rota e sem UI | Vira o centro do sistema |
| 9.4-13 | Código triplicado | Diretório único |
| 9.4-14 | Sem testes | `node --test` contra banco de teste |

> **Sobre a senha no histórico do Git**: `SouCareca123` continua acessível em commits antigos.
> Remover do HEAD não basta. Ou se reescreve o histórico com `git filter-repo`, ou — mais honesto e
> mais barato — a senha é trocada no MySQL de quem usava, e o README registra que o histórico
> contém credenciais antigas já invalidadas.

---

## 4. Modelo de dados v2

Sete tabelas, duas views, uma procedure, dois triggers. É o coração da entrega acadêmica.

### 4.1 Diagrama

```
categoria ──1:N── produto ──1:N── item_comanda ──N:1── comanda ──N:1── mesa
                                                          │  │
                                                garcom ───┘  └─── cliente
```

- `mesa` **1—N** `comanda`, mas **no máximo uma** comanda `aberta` por mesa (garantido por índice).
- `comanda` **1—N** `item_comanda`; item guarda o preço praticado, não o preço atual do produto.
- `cliente` é **opcional** na comanda: mesa de passagem não exige cadastro.

### 4.2 DDL

```sql
CREATE DATABASE IF NOT EXISTS bentosbeer
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE bentosbeer;

CREATE TABLE mesa (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  numero  SMALLINT     NOT NULL UNIQUE,
  lugares TINYINT      NOT NULL DEFAULT 4,
  CONSTRAINT ck_mesa_numero  CHECK (numero > 0),
  CONSTRAINT ck_mesa_lugares CHECK (lugares BETWEEN 1 AND 20)
) ENGINE=InnoDB;

CREATE TABLE cliente (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  telefone  VARCHAR(20)  NULL,
  criado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE garcom (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(100) NOT NULL,
  apelido VARCHAR(40)  NULL,
  ativo   BOOLEAN      NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE categoria (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(40) NOT NULL UNIQUE,
  ordem TINYINT     NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE produto (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT           NOT NULL,
  nome         VARCHAR(100)  NOT NULL,
  descricao    VARCHAR(255)  NULL,
  preco        DECIMAL(10,2) NOT NULL,
  disponivel   BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_produto_categoria FOREIGN KEY (categoria_id)
    REFERENCES categoria(id) ON DELETE RESTRICT,
  CONSTRAINT ck_produto_preco CHECK (preco >= 0),
  UNIQUE KEY uq_produto_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE comanda (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id    INT NOT NULL,
  garcom_id  INT NOT NULL,
  cliente_id INT NULL,
  status     ENUM('aberta','fechada','cancelada') NOT NULL DEFAULT 'aberta',
  aberta_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechada_em TIMESTAMP NULL,
  observacao VARCHAR(255) NULL,
  -- coluna gerada: só carrega o mesa_id enquanto a comanda está aberta.
  -- com UNIQUE, o banco passa a impedir duas comandas abertas na mesma mesa,
  -- tanto no INSERT quanto no UPDATE — o que a aplicação sozinha não garantia.
  mesa_ocupada INT AS (IF(status = 'aberta', mesa_id, NULL)) STORED,
  UNIQUE KEY uq_mesa_ocupada (mesa_ocupada),
  CONSTRAINT fk_comanda_mesa    FOREIGN KEY (mesa_id)    REFERENCES mesa(id),
  CONSTRAINT fk_comanda_garcom  FOREIGN KEY (garcom_id)  REFERENCES garcom(id),
  CONSTRAINT fk_comanda_cliente FOREIGN KEY (cliente_id) REFERENCES cliente(id)
    ON DELETE SET NULL,
  INDEX idx_comanda_status (status, aberta_em),
  INDEX idx_comanda_fechada (fechada_em)
) ENGINE=InnoDB;

CREATE TABLE item_comanda (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  comanda_id     INT NOT NULL,
  produto_id     INT NOT NULL,
  qtd            SMALLINT      NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,  -- snapshot: reajuste de cardápio não reescreve o passado
  status         ENUM('pendente','entregue','cancelado') NOT NULL DEFAULT 'pendente',
  criado_em      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal       DECIMAL(12,2) AS (IF(status = 'cancelado', 0, qtd * preco_unitario)) STORED,
  CONSTRAINT fk_item_comanda FOREIGN KEY (comanda_id)
    REFERENCES comanda(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_produto FOREIGN KEY (produto_id) REFERENCES produto(id),
  CONSTRAINT ck_item_qtd   CHECK (qtd > 0),
  CONSTRAINT ck_item_preco CHECK (preco_unitario >= 0),
  INDEX idx_item_comanda (comanda_id),
  INDEX idx_item_produto (produto_id)
) ENGINE=InnoDB;
```

### 4.3 Views

```sql
CREATE OR REPLACE VIEW vw_comanda AS
SELECT c.id, c.status, c.aberta_em, c.fechada_em,
       m.numero AS mesa, g.nome AS garcom, cl.nome AS cliente,
       COUNT(i.id)                    AS itens,
       COALESCE(SUM(i.subtotal), 0)   AS total,
       TIMESTAMPDIFF(MINUTE, c.aberta_em, COALESCE(c.fechada_em, NOW())) AS minutos
FROM comanda c
JOIN mesa m           ON m.id  = c.mesa_id
JOIN garcom g         ON g.id  = c.garcom_id
LEFT JOIN cliente cl  ON cl.id = c.cliente_id
LEFT JOIN item_comanda i ON i.comanda_id = c.id
GROUP BY c.id, c.status, c.aberta_em, c.fechada_em, m.numero, g.nome, cl.nome;

CREATE OR REPLACE VIEW vw_salao AS
SELECT m.id AS mesa_id, m.numero, m.lugares,
       c.id AS comanda_id, c.garcom, c.cliente, c.total, c.minutos,
       IF(c.id IS NULL, 'livre', 'ocupada') AS situacao
FROM mesa m
LEFT JOIN vw_comanda c ON c.mesa = m.numero AND c.status = 'aberta';
```

### 4.4 Regras no banco

```sql
DELIMITER //

-- Não se lança item em comanda que não está aberta.
CREATE TRIGGER trg_item_antes_insert BEFORE INSERT ON item_comanda
FOR EACH ROW BEGIN
  DECLARE v_status VARCHAR(10);
  SELECT status INTO v_status FROM comanda WHERE id = NEW.comanda_id;
  IF v_status <> 'aberta' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda não está aberta';
  END IF;
END//

-- Fechamento é transacional: trava a comanda, confere o estado, carimba a hora.
CREATE PROCEDURE sp_fechar_comanda(IN p_comanda_id INT, OUT p_total DECIMAL(12,2))
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
    SELECT status INTO v_status FROM comanda WHERE id = p_comanda_id FOR UPDATE;
    IF v_status IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda inexistente';
    ELSEIF v_status <> 'aberta' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Comanda já foi encerrada';
    END IF;
    UPDATE item_comanda SET status = 'entregue'
      WHERE comanda_id = p_comanda_id AND status = 'pendente';
    SELECT COALESCE(SUM(subtotal), 0) INTO p_total
      FROM item_comanda WHERE comanda_id = p_comanda_id;
    UPDATE comanda SET status = 'fechada', fechada_em = NOW() WHERE id = p_comanda_id;
  COMMIT;
END//

DELIMITER ;
```

### 4.5 Relatórios (o SQL que a disciplina quer ver)

| # | Pergunta de negócio | Recursos SQL demonstrados |
|---|---|---|
| 1 | Faturamento por dia nos últimos 30 dias | `GROUP BY DATE()`, `JOIN`, filtro por status |
| 2 | Os 10 produtos que mais vendem, em receita e em unidades | `JOIN` triplo, `SUM`, `ORDER BY … LIMIT` |
| 3 | Desempenho por garçom: comandas, receita, ticket médio | `GROUP BY`, `AVG`, `HAVING` |
| 4 | Movimento por faixa de horário | `HOUR()`, agregação por expressão |
| 5 | Ranking de produtos dentro de cada categoria | `RANK() OVER (PARTITION BY … ORDER BY …)` |
| 6 | Fotografia do salão agora | `VIEW` sobre `LEFT JOIN` |

```sql
-- 5. Window function: quem lidera dentro da própria categoria
SELECT cat.nome AS categoria, p.nome AS produto,
       SUM(i.subtotal) AS receita,
       RANK() OVER (PARTITION BY cat.id ORDER BY SUM(i.subtotal) DESC) AS posicao
FROM item_comanda i
JOIN produto p    ON p.id = i.produto_id
JOIN categoria cat ON cat.id = p.categoria_id
JOIN comanda c    ON c.id = i.comanda_id AND c.status = 'fechada'
WHERE i.status <> 'cancelado'
GROUP BY cat.id, cat.nome, p.id, p.nome;
```

> **Dinheiro é somado no SQL, nunca em JavaScript.** `DECIMAL` volta do `mysql2` como string
> justamente para não perder precisão; somar com `reduce` desfaz essa proteção. A API converte para
> número só na borda da resposta.

---

## 5. Arquitetura alvo

```
bentos-beer/
├── .env.example  .gitignore  README.md  package.json
├── db/
│   ├── 01_schema.sql          # DDL + views + triggers + procedure
│   ├── 02_seed.sql            # 12 mesas, 6 categorias, ~30 produtos, 3 garçons,
│   │                          # 60 comandas fechadas nos últimos 30 dias
│   └── reset.js               # npm run db:reset — derruba, recria e popula
├── src/
│   ├── server.js              # só bootstrap: env, pool, rotas, estáticos, listen
│   ├── db/pool.js             # mysql.createPool + helpers query/tx
│   ├── http/
│   │   ├── validate.js        # validador próprio (~60 linhas, zero dependência)
│   │   └── erros.js           # AppError + middleware de erro central
│   ├── repos/                 # SQL fica aqui e em nenhum outro lugar
│   │   ├── mesas.js  clientes.js  garcons.js  produtos.js
│   │   ├── comandas.js        # abrir, adicionar item, cancelar item, fechar
│   │   └── relatorios.js
│   └── routes/                # um Router por recurso; sem SQL, sem regra
└── public/                    # e SOMENTE isto é servido estaticamente
    ├── index.html
    ├── css/  tokens.css  base.css  app.css
    ├── js/   api.js  ui.js  telas/{salao,comanda,cardapio,equipe,clientes,relatorios}.js
    └── img/  bento.svg  favicon.svg
```

Dependências: `express`, `cors`, `mysql2`, `dotenv`. Quatro, nenhuma a mais.
Sem bundler, sem framework, sem TypeScript — coerente com a disciplina e com o que já existe.

**Erro tratado em um lugar só.** Repositórios lançam `AppError(404, 'Comanda não encontrada')`;
as rotas não têm `try/catch`; um middleware final traduz para JSON. Erros de banco viram mensagem
de usuário por código: `ER_DUP_ENTRY` em `uq_mesa_ocupada` → *"Essa mesa já tem uma comanda aberta."*

---

## 6. API v2

Base `http://localhost:3000/api`. Sempre JSON. Sem versionamento na URL — é local.

### Operação

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/salao` | Fotografia das mesas: livre/ocupada, total e tempo aberto |
| `POST` | `/comandas` | Abre comanda `{mesaId, garcomId, clienteId?}` → `201` |
| `GET` | `/comandas?status=aberta` | Lista comandas com total e contagem de itens |
| `GET` | `/comandas/:id` | Comanda com todos os itens |
| `POST` | `/comandas/:id/itens` | Lança item `{produtoId, qtd}`; o servidor copia o preço vigente |
| `PATCH` | `/comandas/:id/itens/:itemId` | Muda `qtd` ou `status` (entregue / cancelado) |
| `POST` | `/comandas/:id/fechar` | Chama `sp_fechar_comanda` → `{total}` |
| `POST` | `/comandas/:id/cancelar` | Cancela a comanda inteira |

### Cadastros

`GET POST PUT DELETE` completos e simétricos para `/mesas`, `/clientes`, `/garcons`, `/produtos`
e `/categorias`. Toda listagem aceita `?busca=` (server-side, `LIKE`), toda entidade tem
`GET /:id`. `DELETE` de registro referenciado devolve `409` com explicação, não `500`.

### Relatórios

`GET /relatorios/resumo`, `/faturamento-diario`, `/top-produtos`, `/por-garcom`,
`/por-hora`, `/ranking-categoria` — todos aceitam `?de=&ate=`.

### Contrato de erro

```json
{ "erro": "Essa mesa já tem uma comanda aberta.", "campo": "mesaId" }
```

Status: `400` validação · `404` inexistente · `409` conflito de estado · `500` inesperado.
Detalhe técnico nunca vaza; vai para `console.error` com um id de correlação.

---

## 7. Identidade visual

### 7.1 O conceito

**"A comanda de papel."** Um bar não roda em dashboard; roda em papel amarelado no balcão, com o
pedido rabiscado, riscos no que voltou, e um total escrito embaixo de um traço. A tela imita esse
objeto — e o Papa Bento XVI, bávaro de Marktl am Inn, ancora o resto: cervejaria alemã, chope,
tipografia de rótulo.

Essa é a defesa contra "cara de IA": não é um layout genérico com o nome do bar em cima, é um
objeto do mundo do assunto. Fugimos de propósito do trio gradiente-roxo / card-com-sombra /
ícone-emoji, e também do combo creme-com-serifa-alta-e-terracota que virou default.

### 7.2 O ícone

A foto do Bento XVI com a caneca é a piada que dá nome ao projeto, mas usá-la direto tem dois
problemas práticos: é foto de agência (direito de imagem e de uso) e vira mancha ilegível em 32px
de favicon. A solução mantém a piada e resolve os dois:

> **Uma caneca de chope cuja espuma tem a silhueta de uma mitra papal**, com a faixa horizontal
> da mitra em âmbar atravessando a espuma. Sem rosto, sem foto, 100% vetorial, legível a 16px,
> imediatamente reconhecível para quem sabe a referência — e uma caneca simpática para quem não sabe.

Aplicações: favicon, marca na barra lateral, tela vazia ("Nenhuma comanda aberta"), e a foto
original apenas no `README.md` do repositório, com crédito, como nota de rodapé sobre o nome.

### 7.3 Tokens

```css
:root{
  /* superfícies */
  --stout:  #1B1410;   /* barra lateral, tinta, traço de total   */
  --cream:  #EBDFC6;   /* fundo do salão — papelão de bolacha    */
  --paper:  #F8F1E1;   /* cartões, comanda                       */
  --line:   #D6C4A3;   /* fio impresso                           */
  /* acentos */
  --amber:  #C57F1A;   /* chope: ação primária, comanda aberta   */
  --blue:   #2E5C8A;   /* azul bávaro: informação, conta pedida  */
  --brick:  #8C3A2E;   /* destrutivo, cancelado                  */
  --olive:  #5B6B3A;   /* mesa livre, conta paga                 */
  /* texto */
  --ink:    #2A211A;  --muted: #7C6A52;
}
```

Contraste conferido em AA: `--ink` sobre `--paper` = 11.8:1; `--muted` sobre `--cream` = 4.7:1;
`--stout` sobre `--amber` (botão primário) = 8.1:1.

### 7.4 Tipografia — quatro papéis, quatro vozes

| Papel | Fonte | Uso |
|---|---|---|
| Marca | **UnifrakturCook** | Só o logotipo "Bento's Beer". Fraktur é o que está escrito em rótulo de cervejaria alemã de verdade. Em mais lugares que esse, vira fantasia. |
| Títulos | **Grenze** 600 | Nomes de tela e de mesa. Serifa com DNA gótico: conversa com o logotipo sem ser ilegível. |
| Interface | **Archivo** 400/500/600 | Tudo que é rótulo, botão, formulário e texto corrido. |
| Números | **Courier Prime** | Dinheiro, IDs, quantidades, horas. É o que dá a textura de comanda impressa — e alinha coluna de preço de graça, por ser monoespaçada. |

Escala: 10 / 11 / 13 / 15 / 17 / 22 / 28 px. Rótulos em caixa alta com `letter-spacing: .14em`
apenas nos micro-rótulos de 10px — em nenhum outro lugar.

### 7.5 O elemento assinatura

**A linha de comanda com pontilhado de condução**: quantidade em monoespaçada, nome do item,
pontilhado que preenche o vão, valor alinhado à direita. Item cancelado aparece riscado, em
cinza, com "cancelado" no lugar do valor — o bar não apaga, o bar risca. Abaixo, um traço de 2px
e o total. É a única peça decorativa do sistema, e ela é literalmente o objeto que o software
substitui.

Complemento: **carimbos de status** — `aberta`, `livre`, `a pagar`, `paga` — em caixa alta,
borda de 1.5px na cor do estado, girados 3°, como carimbo de borracha torto. Nunca em cor sólida
de fundo, sempre contorno.

### 7.6 Regras que impedem a "cara de IA"

- Nenhum gradiente. Nenhuma sombra decorativa (só o anel de foco).
- Raio de canto **3px**, uniforme. Nada de `border-radius: 16px` em tudo.
- Zero emoji. Ícones traçados a 1.5px, no mesmo estilo do logotipo.
- Nenhum card genérico com título grande, número gigante e legenda — os números do topo do salão
  são pequenos, tabulares e em linha, como um placar de balcão.
- Copy no imperativo curto e em português de bar: "Abrir comanda", "Lançar item", "Fechar conta",
  "Riscar item". Não "Submeter", não "Cadastro de Entidade Comanda".
- Tela vazia é convite, não desculpa: "Salão vazio. Abra uma comanda para começar o turno."
- Animação: só duas. Realce de 200ms quando um item entra na comanda, e o total contando até o
  novo valor em 300ms. `prefers-reduced-motion` desliga as duas.

### 7.7 Telas

| Tela | Conteúdo |
|---|---|
| **Salão** | Grade de mesas com carimbo de status, garçom e tempo; três números do turno no topo; comanda selecionada expandida abaixo. É a home. |
| **Comanda** | Cabeçalho (mesa, garçom, cliente, tempo), lista de itens, busca de produto por categoria para lançar, ações de fechar/cancelar. |
| **Cardápio** | Produtos agrupados por categoria, com preço em monoespaçada e alternância disponível/esgotado. |
| **Equipe** | Garçons, com contagem de comandas abertas por pessoa. |
| **Clientes** | Cadastro simples com busca. |
| **Relatórios** | Seletor de período, três números-síntese e as seis consultas da §4.5. Gráfico de barras em `<canvas>` puro para o faturamento diário — sem biblioteca. |

Responsivo: abaixo de 900px a barra lateral vira faixa superior; abaixo de 600px a grade de mesas
passa a duas colunas. Navegação inteira por teclado, foco visível em `--amber` com 2px.

---

## 8. Plano de execução

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **0. Desentulho** | Tag `v1-entrega-antiga`, remoção de `Classes/` e `Servidor/`, nova árvore, `.gitignore`, `.env.example` | `git tag` existe; repositório tem um único código-fonte |
| **1. Banco** | `01_schema.sql`, `02_seed.sql`, `db/reset.js` | `npm run db:reset` roda do zero e deixa 60 comandas fechadas com datas espalhadas |
| **2. Fundação** | pool, `AppError`, validador, `server.js` servindo só `public/` | `curl /ConnectionDB.js` devolve 404; queda do MySQL não derruba o processo |
| **3. API cadastros** | mesas, clientes, garçons, produtos, categorias | CRUD simétrico; `DELETE` referenciado devolve 409 |
| **4. API operação** | comandas e itens, fechamento via procedure | Abrir duas comandas na mesma mesa devolve 409 com mensagem legível |
| **5. Relatórios** | seis endpoints com `?de=&ate=` | Somas conferem com consulta manual no banco |
| **6. Interface** | tokens, seis telas, ícone SVG | Roda em 320px de largura; navegável só por teclado |
| **7. Testes e docs** | `node --test`, README, diagrama ER em Mermaid, roteiro de demonstração | `npm test` verde com o banco `bentosbeer_test` |

---

## 9. Entregáveis acadêmicos

1. **README.md** — o que é, como rodar em 4 comandos, print da tela do salão, diagrama ER,
   e a nota de rodapé explicando o nome (com a foto e o crédito).
2. **Diagrama ER versionado em Mermaid**, não como imagem solta — muda junto com o schema.
3. **`db/01_schema.sql` comentado**: cada `CHECK`, `TRIGGER` e coluna gerada com uma linha
   explicando qual regra de negócio ele implementa. É esse arquivo que o professor lê primeiro.
4. **Roteiro de demonstração de 5 minutos**: abrir comanda na mesa 4 → lançar três itens →
   riscar um → tentar abrir outra comanda na mesma mesa (erro tratado) → fechar → mostrar a venda
   aparecendo no relatório do dia.
5. **`docs/consultas.sql`** — as seis consultas dos relatórios isoladas, prontas para rodar no
   Workbench durante a apresentação.
