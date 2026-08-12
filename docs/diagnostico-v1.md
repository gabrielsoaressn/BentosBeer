# Bento's Beer — Documentação do Projeto

> Sistema de gerenciamento de bar desenvolvido como trabalho da disciplina de **Banco de Dados — UFPB 2024.1**.
> Autores: **Gabriel, Rivando e Rafael**.

---

## 1. Visão geral

O **Bento's Beer** é uma aplicação web full-stack, monolítica e local, que expõe um CRUD sobre as
entidades de um bar: **clientes**, **produtos**, **garçons** e **pedidos**, além de um **relatório
agregado**. O objetivo acadêmico é demonstrar modelagem relacional e operações CRUD contra um banco
MySQL a partir de uma aplicação Node.js, com uma interface web simples consumindo uma API REST.

| Aspecto | Valor |
|---|---|
| Domínio | Gestão operacional de bar/restaurante |
| Arquitetura | Monolito em 3 camadas (UI → API REST → acesso a dados → MySQL) |
| Backend | Node.js + Express 4, ES Modules |
| Banco de dados | MySQL (driver `mysql2/promise`) |
| Frontend | HTML + CSS + JavaScript puro (sem framework, sem bundler) |
| Porta padrão | `3000` |
| Tamanho | ~2.900 linhas em 40 arquivos (3 cópias do código-fonte) |
| Escopo de execução | 100% local (`localhost`), sem autenticação |

---

## 2. Estrutura do repositório

O repositório contém **três diretórios com versões distintas do mesmo código**, resultado do
histórico de desenvolvimento (uploads manuais em vez de commits incrementais):

```
BentosBeer/
├── README.md                  # Apresentação curta + link do diagrama ER
├── Projeto.md                 # Este documento
│
├── Servidor_Atualizado/       # ★ VERSÃO CANÔNICA — a mais completa
│   ├── server.js              #   API REST Express (257 linhas)
│   ├── GerenciadorCRUD.js     #   Camada de acesso a dados / repositório (306 linhas)
│   ├── ConnectionDB.js        #   Wrapper de conexão MySQL (31 linhas)
│   ├── Relatorios.js          #   Consultas agregadas (41 linhas)
│   ├── index.html             #   Interface (SPA de 4 seções, 65 linhas)
│   ├── app.js                 #   Lógica do frontend (554 linhas)
│   ├── styles.css             #   Estilos (102 linhas)
│   ├── Cliente.js Produto.js Garcom.js
│   ├── Pedido.js  Mesa.js     Conta.js     # Classes de domínio (POJOs)
│   ├── package.json
│   └── package-lock.json
│
├── Servidor/                  # Versão anterior — idêntica a Servidor_Atualizado
│   └── ...                    #   MENOS o módulo de relatórios
│
└── Classes/                   # Rascunho inicial / protótipo de estudo (não funcional)
    ├── ConnectionDB.cjs       #   Conexão em CommonJS, estilo callback
    ├── GerenciadorCRUD.js     #   Versão incompleta (só Garçom + Produto parcial)
    ├── TesteBackend.js        #   Script de teste manual via console
    ├── Cliente.js Produto.js Garcom.js Pedido.js Mesa.js Conta.js
    └── package.json
```

### 2.1 Relação entre as três pastas

| Pasta | Papel | Estado |
|---|---|---|
| `Classes/` | Primeiro protótipo: classes de domínio e experimentos de conexão. Roda por linha de comando via `TesteBackend.js`, sem servidor web. | **Não funcional** (ver §9) |
| `Servidor/` | Primeira versão completa web: API + frontend com Clientes, Produtos e Garçons. | Funcional, sem relatórios |
| `Servidor_Atualizado/` | Versão atual: `Servidor/` + módulo de **Relatórios** (backend, rota, item de menu, seção na UI). | **Versão de referência** |

O `diff` entre `Servidor/` e `Servidor_Atualizado/` é exatamente: o arquivo novo `Relatorios.js`,
a rota `GET /relatorio`, o item de menu `menuRelatorios`, a seção `relatoriosSection` no HTML,
os dois listeners de relatório no `app.js` e o bump de `mysql2` (`^3.2.0` → `^3.11.0`).

### 2.2 Branches

- `main` — versão atual (as três pastas).
- `origin/BentosBeer` — branch antiga contendo apenas `Classes/` e um `BentosBeer.js` já removido.

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  NAVEGADOR                                                  │
│  index.html + styles.css + app.js                           │
│  • Sidebar com 4 seções (Clientes/Produtos/Garçons/Relatório)│
│  • fetch() → http://localhost:3000                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON (REST)
┌───────────────────────────▼─────────────────────────────────┐
│  server.js — Express                                        │
│  • cors()  • express.json()  • express.static('.')          │
│  • 18 rotas REST                                            │
└───────────┬───────────────────────────────┬─────────────────┘
            │                               │
┌───────────▼──────────────┐   ┌────────────▼────────────────┐
│  GerenciadorCRUD         │   │  Relatorios                 │
│  (padrão Repository)     │   │  (consultas agregadas)      │
└───────────┬──────────────┘   └────────────┬────────────────┘
            └───────────────┬───────────────┘
┌───────────────────────────▼─────────────────────────────────┐
│  ConnectionDB — wrapper sobre mysql2/promise                │
│  connect() / query(sql, params) / close()                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ prepared statements (execute)
┌───────────────────────────▼─────────────────────────────────┐
│  MySQL — schema `BentosBeer`                                │
│  cliente · garcom · produto · pedido                        │
└─────────────────────────────────────────────────────────────┘
```

Pontos de design relevantes:

- **Injeção de dependência manual**: `new GerenciadorCRUD(db)` e `new Relatorios(db)` recebem a
  instância de conexão pelo construtor — o repositório não sabe como a conexão foi criada.
- **Bootstrap assíncrono**: todo o `server.js` está dentro de uma IIFE `async`, de modo que as rotas
  só são registradas **depois** de `await db.connect()`. Se a conexão falhar, o processo encerra com
  `process.exit(1)` em vez de subir um servidor inutilizável.
- **Conexão única e persistente** (não é pool): uma conexão MySQL compartilhada por todas as
  requisições, aberta no boot e nunca fechada.
- **Prepared statements em 100% das queries**: `connection.execute(sql, params)` com placeholders
  `?`, o que elimina injeção de SQL nas rotas existentes.
- **Servidor único para API e estáticos**: o mesmo processo Express serve o `index.html` e a API,
  eliminando a necessidade de um servidor web separado.

---

## 4. Modelo de dados

> **Correção importante, feita depois.** Este diagnóstico foi escrito a partir de uma cópia local
> parada em 16/09/2024, e afirmava que o DDL não estava versionado. **Estava.** O `origin/main`
> seguiu com 35 commits até 07/10/2024 e traz o script real em
> [`Infra/config_bd.sql`](../Infra/config_bd.sql), além de quatro diagramas em
> [`Diagramas/`](../Diagramas). O esquema inferido abaixo continua valendo como retrato do que o
> **código executava**, mas não é o esquema que a equipe havia modelado — e os dois divergiam entre
> si. A comparação está no fim desta seção.

O esquema abaixo é o que está implícito nas queries de `GerenciadorCRUD.js` e `Relatorios.js` — isto
é, o que o código de fato esperava encontrar no banco:

### 4.1 Tabelas e colunas usadas pelo código

| Tabela | Colunas referenciadas nas queries | Observações |
|---|---|---|
| `cliente` | `id`, `nome`, `mesa` | `mesa` é um **atributo escalar** do cliente, não FK — não existe tabela `mesa` no banco |
| `garcom` | `id`, `nome` | |
| `produto` | `id`, `nome`, `preco` | `descricao` aparece nas classes/rascunhos, mas não no CRUD atual |
| `pedido` | `id`, `cliente_id`, `garcom_id`, `produto_id`, `qtd`, `status` | Tabela associativa cliente↔garçom↔produto; `status` default `'Aberto'` |

### 4.2 DDL de referência (reconstruído)

```sql
CREATE DATABASE IF NOT EXISTS BentosBeer
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE BentosBeer;

CREATE TABLE cliente (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(100) NOT NULL,
  mesa  INT NOT NULL
);

CREATE TABLE garcom (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(100) NOT NULL
);

CREATE TABLE produto (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nome   VARCHAR(100)   NOT NULL,
  preco  DECIMAL(10,2)  NOT NULL
);

CREATE TABLE pedido (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id  INT NOT NULL,
  garcom_id   INT NOT NULL,
  produto_id  INT NOT NULL,
  qtd         INT NOT NULL DEFAULT 1,
  status      VARCHAR(20) NOT NULL DEFAULT 'Aberto',
  FOREIGN KEY (cliente_id) REFERENCES cliente(id),
  FOREIGN KEY (garcom_id)  REFERENCES garcom(id),
  FOREIGN KEY (produto_id) REFERENCES produto(id)
);
```

### 4.3 O DDL real, e por que ele não bate com o código

`Infra/config_bd.sql`, do `origin/main`, é o esquema que a equipe modelou:

```sql
CREATE TABLE Mesa       (idMesa INT PRIMARY KEY, numero VARCHAR(45), status VARCHAR(255));
CREATE TABLE Garcom     (idGarcom INT PRIMARY KEY, nome TEXT);
CREATE TABLE Cliente    (idCliente INT PRIMARY KEY, nome VARCHAR(45), status VARCHAR(255));
CREATE TABLE Produto    (idProduto INT PRIMARY KEY, nome VARCHAR(45), preco DECIMAL(10,2));
CREATE TABLE Pedido     (idPedido INT PRIMARY KEY, Cliente_idCliente INT, Garcom_idGarcom INT,
                         Mesa_idMesa INT, /* 3 chaves estrangeiras */);
CREATE TABLE Quantidade (Pedido_idPedido INT, Produto_idProduto INT, quantidade INT,
                         PRIMARY KEY (Pedido_idPedido, Produto_idProduto), /* 2 FKs */);
```

Comparado com o que o código executava:

| | `Infra/config_bd.sql` (modelado) | Queries do `GerenciadorCRUD` (executado) |
|---|---|---|
| Mesa | **tabela própria**, com `status` | coluna `mesa` dentro de `cliente` |
| Item do pedido | **`Quantidade`**, associativa com `quantidade` | `produto_id` e `qtd` direto em `pedido` |
| Chaves estrangeiras | **5 declaradas** | nenhuma referenciada |
| Nomes | `idMesa`, `Cliente_idCliente` | `id`, `cliente_id` |
| Conta | não existe | `INSERT INTO conta` no `Backend/` |

**As duas coisas nunca conversaram.** O modelo previa uma mesa de verdade e uma tabela associativa
entre pedido e produto; o código foi escrito contra um esquema achatado, com a mesa virando atributo
do cliente e o produto pendurado direto no pedido. Nenhum dos dois lados estava errado sozinho — o
que faltou foi o encontro.

Vale registrar para a apresentação: a v2 não inventou o modelo. `mesa` como tabela e `item_comanda`
como associativa são exatamente o que `Infra/config_bd.sql` já desenhava. A reconstrução terminou o
que o diagrama da equipe previa, e acrescentou o que faltava — `CHECK`, `ENUM`, coluna gerada com
`UNIQUE`, `VIEW`, `TRIGGER` e a procedure transacional.

### 4.4 Cardinalidades

- `cliente` **1 — N** `pedido`
- `garcom` **1 — N** `pedido`
- `produto` **1 — N** `pedido`
- `cliente` **1 — 1** mesa (garantido em nível de aplicação por `verificarMesaOcupada`, não por
  constraint `UNIQUE` no banco)

### 4.5 Classes de domínio (POJOs)

São classes anêmicas — apenas construtores atribuindo campos, sem comportamento, sem validação e
sem mapeamento ORM. As rotas trabalham diretamente com os *row objects* do `mysql2`, então essas
classes **não são instanciadas em nenhum ponto do fluxo web**; servem como documentação do modelo
e vestígio do protótipo em `Classes/`.

| Classe | Construtor | Usada na API? | Existe no banco? |
|---|---|---|---|
| `Cliente` | `(id, nome, mesa, pedido = [])` | ✗ | ✓ |
| `Produto` | `(id, nome, preco, descricao)` — `descricao` é recebido e **descartado** | ✗ | ✓ |
| `Garcom` | `(id, nome)` | ✗ | ✓ |
| `Pedido` | `(cliente, garcom, produtos, qtd, status = 'Aberto')` — sem `id` | ✗ | ✓ |
| `Mesa` | `(id, numero, status, garcom)` — `status`: Livre/Ocupada/Reservada | ✗ | ✗ (planejada) |
| `Conta` | `(id, idMesa, idGarcom, total, status)` — `status`: Aberta/Fechada | ✗ | ✗ (planejada) |

`Mesa` e `Conta` são entidades **projetadas mas não implementadas** — não têm tabela, métodos de
CRUD, rotas ou interface.

---

## 5. Camada de acesso a dados

### 5.1 `ConnectionDB.js`

Wrapper fino sobre `mysql2/promise`:

| Método | Comportamento |
|---|---|
| `connect()` | Cria a conexão com `host: localhost`, `user: root`, `password` e `database: BentosBeer` **hardcoded** |
| `query(sql, params)` | Lança `Error('Connection not established')` se não houver conexão; senão delega para `connection.execute()` (prepared statement) |
| `close()` | `connection.end()` — **nunca é chamado pelo servidor** |

### 5.2 `GerenciadorCRUD.js` — inventário de métodos

Padrão Repository, 22 métodos organizados por entidade. Duas convenções de retorno coexistem:
os métodos usados pela API **retornam dados** (`insertId`, arrays, booleanos de `affectedRows > 0`),
enquanto os herdados do protótipo apenas **imprimem no console** e retornam `undefined`.

#### Cliente
| Método | SQL | Retorno |
|---|---|---|
| `createCliente(nome, mesa)` | `INSERT INTO cliente` | `insertId` |
| `listarClientes()` | `SELECT * FROM cliente` | array de rows |
| `listarClientePorId(id)` | `SELECT ... WHERE id = ?` | row ou `null` |
| `editarCliente(id, nome, mesa)` | `UPDATE cliente SET ...` | `boolean` |
| `excluirCliente(id)` | `DELETE FROM cliente WHERE id = ?` | `boolean` |
| `verificarMesaOcupada(mesa)` | `SELECT * FROM cliente WHERE mesa = ?` | `boolean` |

#### Garçom
| Método | SQL | Retorno |
|---|---|---|
| `createGarcom(nome)` | `INSERT INTO garcom` | ⚠ nada (só `console.log`) |
| `listarGarcom()` | `SELECT * FROM garcom` | array de rows |
| `listarGarcomPorNome(nome)` | `SELECT ... WHERE nome = ?` | ⚠ nada (só console) |
| `listarGarcomPorId(id)` | `SELECT ... WHERE id = ?` | ⚠ nada (só console) |
| `editarGarcom(id, novoNome)` | `UPDATE garcom SET nome = ?` | `boolean` |
| `excluirGarcom(id)` | `DELETE FROM garcom WHERE id = ?` | `boolean` |

#### Produto
| Método | SQL | Retorno |
|---|---|---|
| `createProduto(nome, preco)` | `INSERT INTO produto` | `insertId` |
| `listarProdutos()` | `SELECT * FROM produto` | array de rows |
| `listarProdutoPorId(id)` | `SELECT ... WHERE id = ?` | row ou `null` |
| `editarProduto(id, nome, preco)` | `UPDATE produto SET ...` | `boolean` |
| `excluirProduto(id)` | `DELETE FROM produto WHERE id = ?` | `boolean` |

#### Pedido — implementado no backend, **sem rota HTTP e sem UI**
| Método | SQL | Retorno |
|---|---|---|
| `createPedido(cliente, garcom, produtos, qtd, status = 'Aberto')` | `INSERT INTO pedido` | só console |
| `listarPedidos()` | `SELECT * FROM pedido` | só console |
| `listarPedidosPorClienteID(clienteID)` | `SELECT ... WHERE cliente_id = ?` | só console |
| `atualizarPedido(id, clienteId, garcomId, produtoId, qtd, status)` | `UPDATE pedido SET ...` | só console |
| `excluirPedido(id)` | `DELETE FROM pedido WHERE id = ?` | só console |

### 5.3 `Relatorios.js`

Um único método, `gerarRelatorio()`, que executa duas queries:

1. Três subconsultas escalares em uma só ida ao banco:
   ```sql
   SELECT (SELECT COUNT(*) FROM Cliente) AS totalClientes,
          (SELECT COUNT(*) FROM Produto) AS totalProdutos,
          (SELECT COUNT(*) FROM Garcom)  AS totalGarcons
   ```
2. `SELECT preco FROM Produto`, somando os preços em JavaScript com `reduce` e coerção via
   `Number()` (necessária porque `DECIMAL` volta do `mysql2` como string).

Retorna `{ totalClientes, totalProdutos, totalGarcons, valorTotalProdutos }`.

> **Semântica**: `valorTotalProdutos` é a soma dos **preços unitários do catálogo** — não o valor de
> estoque nem o faturamento. Um catálogo com 10 itens de R$ 5,00 resulta em R$ 50,00,
> independentemente de vendas.

---

## 6. API REST

Base: `http://localhost:3000`. Todas as respostas são JSON. Não há autenticação nem versionamento.

| # | Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|---|
| 1 | `GET` | `/relatorio` | — | `200` objeto do relatório | `500` |
| 2 | `POST` | `/produto` | `{nome, preco}` | `201 {id}` | `500` |
| 3 | `GET` | `/produto` | — | `200 [...]` | `500` |
| 4 | `GET` | `/produto/:id` | — | `200 {produto}` | `404`, `500` |
| 5 | `PUT` | `/produto/:id` | `{nome, preco}` | `200 {message}` | `404`, `500` |
| 6 | `DELETE` | `/produto/:id` | — | `200 {message}` | `404`, `500` |
| 7 | `POST` | `/cliente` | `{nome, mesa}` | `201 {id}` | `400` mesa ocupada, `500` |
| 8 | `GET` | `/cliente` | — | `200 [...]` | `500` |
| 9 | `GET` | `/cliente/:id` | — | `200 {cliente}` | `404`, `500` |
| 10 | `PUT` | `/cliente/:id` | `{nome, mesa}` | `200 {message}` | `404`, `500` |
| 11 | `DELETE` | `/cliente/:id` | — | `200 {message}` | `404`, `500` |
| 12 | `POST` | `/garcom` | `{nome}` | `201 {id: undefined}` ⚠ | `500` |
| 13 | `GET` | `/garcom` | — | `200 [...]` | `500` |
| 14 | `PUT` | `/garcom/:id` | `{nome}` | `200 {message}` | `404`, `500` |
| 15 | `DELETE` | `/garcom/:id` | — | `200 {message}` | `404`, `500` |

Não existem rotas para **pedido**, **mesa** ou **conta**. `GET /garcom/:id` também não existe
(assimetria em relação a cliente e produto).

Padrão de tratamento de erro, repetido em todas as rotas: `try/catch` → `console.error` no servidor
→ `res.status(5xx).json({ error: 'mensagem em português' })`. Mensagens internas nunca vazam para o
cliente.

### 6.1 Regra de negócio no servidor

A única validação de domínio real do sistema está em `POST /cliente`: antes de inserir, chama
`verificarMesaOcupada(mesa)` e devolve `400 { error: 'Mesa já está ocupada por outro cliente.' }` se
já houver cliente naquela mesa. É a única mensagem de erro que o frontend exibe ao usuário via
`alert()`. A regra **não é aplicada** em `PUT /cliente/:id`, ou seja, uma edição pode colocar dois
clientes na mesma mesa.

---

## 7. Frontend

### 7.1 `index.html`

SPA rudimentar: uma `<nav class="sidebar">` com 4 links e quatro `<div class="section">` no
conteúdo. Todas as seções exceto Clientes começam com `style="display:none"`; a navegação alterna a
propriedade `display` via JS. Nenhum framework, nenhum build — o `app.js` é carregado com uma tag
`<script>` simples no fim do `<body>`.

| Seção | Controles |
|---|---|
| Clientes | inputs nome/mesa, botão Adicionar, busca por nome, busca por ID, `<ul>` de resultados |
| Produtos | inputs nome/preço, botão Adicionar, busca por nome, busca por ID, `<ul>` |
| Garçons | input nome, botão Adicionar, busca por nome, `<ul>` |
| Relatórios | botão Gerar Relatório, `<div>` de resultado |

### 7.2 `app.js`

Organizado em blocos comentados, com listeners registrados em nível de módulo:

- **CRUD por entidade** — `listarClientes/Produtos/Garcons`, `editar*`, `remover*`. Cada listagem
  reconstrói o `<ul>` com `createElement` e injeta um `.button-group` com Editar/Remover por linha.
- **Edição via `prompt()`** — não há formulário de edição; `editar*` abre `prompt()` nativos
  pré-preenchidos com os valores atuais, e a lista é recarregada em caso de sucesso.
- **Filtro por nome — client-side**: `filtrarClientes/Produtos/Garcons` percorrem os `<li>` já
  renderizados e alternam `style.display` conforme `textContent.includes(...)`. Não há requisição ao
  servidor; o filtro só alcança o que já está na tela.
- **Busca por ID — server-side**: os inputs `clienteIdInput`/`produtoIdInput` disparam um `fetch`
  a cada tecla digitada (evento `input`, sem *debounce*), substituindo a lista pelo item único.
  Campo vazio recarrega a listagem completa.
- **Nomes de identificadores acentuados**: `mostrarSeção(seçãoId)` — JS aceita, mas é atípico.
- **Relatório**: `menuRelatorios` só mostra a seção; a geração exige clicar em `Gerar Relatório`,
  que faz `fetch('/relatorio')` (URL relativa, ao contrário do resto do arquivo, que usa
  `http://localhost:3000` absoluto) e injeta 4 parágrafos formatados em `pt-BR`
  (`toFixed(2).replace('.', ',')`).

### 7.3 `styles.css`

CSS puro, ~100 linhas: layout flex com sidebar fixa de 250px em fundo `#333`, conteúdo fluido,
inputs e botões com 50% de largura, botões verdes (`#28a745` com hover `#218838`), itens de lista
como cartões flex com `justify-content: space-between` para empurrar os botões à direita.
Não é responsivo (sem media queries) e não tem tema escuro.

---

## 8. Como executar

### 8.1 Pré-requisitos
- Node.js 18+ (o código usa ES Modules e `fetch` nativo do navegador)
- MySQL 8 em execução em `localhost`

### 8.2 Passos

```bash
# 1. Criar o banco e as tabelas (use o DDL da §4.2)
mysql -u root -p < schema.sql

# 2. Ajustar as credenciais em Servidor_Atualizado/ConnectionDB.js
#    (host, user, password, database estão hardcoded)

# 3. Corrigir o package.json — ver §9.1: há um comentário `//` que invalida o JSON

# 4. Instalar e subir
cd Servidor_Atualizado
npm install
npm start          # equivalente a: node server.js
```

Acesse **http://localhost:3000** — o Express serve o `index.html` do diretório de trabalho.

### 8.3 Dependências

| Pacote | Versão | Papel |
|---|---|---|
| `express` | `^4.19.2` | Servidor HTTP, roteamento, estáticos, parse de JSON |
| `cors` | `^2.8.5` | Libera requisições cross-origin (todas as origens) |
| `mysql2` | `^3.11.0` | Driver MySQL com API de Promises e prepared statements |

Sem dependências de desenvolvimento: não há linter, formatador, framework de testes, TypeScript ou
bundler. Também não existe `.gitignore` — `package-lock.json` está versionado, `node_modules/` não
está presente no repositório.

---

## 9. Estado atual e problemas conhecidos

Esta seção documenta o que está quebrado ou incompleto, em ordem de impacto.

### 9.1 Bloqueadores

**1. `package.json` inválido — impede `npm start`**
`Servidor_Atualizado/package.json:7` contém um comentário de linha:
```json
"start": "node server.js" //se der errado coloca "start": "node index.js"
```
JSON não admite comentários, então o `npm` falha ao ler o arquivo. Os dois últimos commits
("Possível correção para abrir o servidor") atacavam justamente o problema de inicialização — este
resíduo é provavelmente a causa remanescente. **Correção**: remover o comentário. (Alternativa
imediata: `node server.js` direto, que não lê o `package.json`.) O `Servidor/package.json` é JSON
válido, mas aponta `start` para `index.js`, arquivo que não existe.

**2. `Classes/` não executa**
O protótipo acumulou vários defeitos:
- `TesteBackend.js:14` e `:35` usam uma variável `connection` que nunca é declarada nem importada.
- `TesteBackend.js:2` faz `import ConnectionDB from './ConnectionDB.cjs'`, mas o `.cjs` não exporta
  nada (o `module.exports` está dentro de um bloco comentado).
- `connection.disconnect()` não existe na API do `mysql2` (o correto é `end()`).
- `GerenciadorCRUD.js:147` usa `db.connection.query` e `:162` usa `connection.query` — nenhum dos
  dois identificadores existe no escopo.
- `GerenciadorCRUD.js:144`: `createProduto` insere em `pedido`, não em `produto`.
- `GerenciadorCRUD.js:169`: interpola `pedido.id` dentro do loop de produtos.
- `GerenciadorCRUD.js:23`: a nova `createGarcom` mistura callback com `async` — o `throw` dentro do
  callback não é capturado pelo `try/catch` externo.

Esse diretório deve ser tratado como histórico, não como código ativo.

### 9.2 Segurança

**3. Credenciais do banco expostas pelo servidor de estáticos**
`server.js:16` faz `app.use(express.static(path.resolve('.')))`, servindo **todo o diretório de
trabalho**. Como `ConnectionDB.js` está nesse diretório, `GET /ConnectionDB.js` devolve o
código-fonte com a senha do MySQL em texto claro. O mesmo vale para todos os arquivos de backend.
**Correção**: mover os estáticos para uma pasta `public/` e servir apenas ela.

**4. Senhas hardcoded e versionadas**
`Servidor_Atualizado/ConnectionDB.js:12` traz `password: '1234'`;
`Classes/ConnectionDB.cjs:5` traz `password: 'SouCareca123'`, senha que também está no histórico do
Git (commit `31f7ec4 "Alter password"` e no blob de `Classes/ConnectionDB.js`). Removê-las agora não
as apaga do histórico. **Correção**: migrar para variáveis de ambiente (`process.env.DB_PASSWORD`)
com um `.env` fora do controle de versão.

**5. Sem autenticação, autorização ou rate limiting**
Qualquer pessoa com acesso à porta 3000 pode ler e apagar todos os registros. `cors()` sem opções
libera todas as origens. Aceitável para um trabalho local; inviável em rede.

**6. Ausência de validação de entrada**
Nenhuma rota valida tipo, presença ou faixa dos campos. `POST /produto` aceita `preco` negativo ou
string; `POST /cliente` aceita `mesa` não numérica; strings não têm limite de tamanho. Injeção de
SQL **não** é um risco (todas as queries são parametrizadas), mas dados inconsistentes são.

### 9.3 Bugs funcionais

**7. `POST /garcom` retorna `{}`**
`GerenciadorCRUD.createGarcom` faz `console.log` do `insertId` mas não o retorna, então a rota
responde `201 {"id": undefined}` → serializado como `{}`. O frontend não usa o ID, por isso o efeito
passa desapercebido. **Correção**: `return results.insertId`.

**8. `editarGarcom` definida duas vezes em `app.js`**
As linhas 333 e 385 declaram a mesma função; a segunda sobrescreve a primeira. Como a segunda tem
assinatura `(id)` em vez de `(id, nomeAtual)`, o `prompt()` de edição de garçom aparece **vazio**,
sem o nome atual pré-preenchido — ao contrário do que ocorre com clientes e produtos.

**9. Case das tabelas divergente entre módulos**
`Relatorios.js` consulta `Cliente`, `Produto`, `Garcom` (maiúsculas), enquanto `GerenciadorCRUD.js`
usa `cliente`, `produto`, `garcom` (minúsculas). No Windows/macOS o MySQL costuma ser
case-insensitive para nomes de tabela e ambos funcionam; **no Linux (default
`lower_case_table_names=0`) o relatório falha com "table doesn't exist"**. Padronizar em minúsculas.

**10. Regra da mesa única não vale na edição**
`PUT /cliente/:id` não chama `verificarMesaOcupada`, permitindo alocar dois clientes à mesma mesa
por edição. A ausência de constraint `UNIQUE(mesa)` no banco significa que a integridade depende
inteiramente da checagem da aplicação.

**11. Busca por ID sem debounce**
Cada tecla digitada em `clienteIdInput`/`produtoIdInput` dispara uma requisição HTTP. Digitar "123"
gera 3 requisições, das quais 2 provavelmente resultam em 404 no console.

### 9.4 Lacunas de escopo

**12. Pedidos, Mesas e Contas não são acessíveis**
`Pedido` tem CRUD completo em `GerenciadorCRUD` (5 métodos), mas nenhuma rota HTTP e nenhuma UI — é
código morto pela perspectiva do usuário. `Mesa` e `Conta` existem só como classes vazias. O
sistema entregue cobre, na prática, **cadastro** (clientes, produtos, garçons) e não **operação**
(lançar pedido, fechar conta).

**13. Código triplicado**
Três cópias do mesmo código significam que qualquer correção precisa ser replicada. `Servidor/` e
`Classes/` deveriam ser removidos (o histórico do Git os preserva) ou movidos para um diretório
`legado/`.

**14. Sem testes automatizados**
A única verificação existente é o `TesteBackend.js` — um script manual de console, atualmente
quebrado, com todas as chamadas comentadas exceto `createGarcom`.

---

## 10. Roadmap sugerido

Ordenado por relação custo/benefício:

| Prioridade | Ação |
|---|---|
| 🔴 Imediata | Remover o comentário do `package.json` (§9.1-1) |
| 🔴 Imediata | Mover estáticos para `public/` e parar de servir o backend (§9.2-3) |
| 🔴 Imediata | Extrair credenciais para `.env` + criar `.gitignore` (§9.2-4) |
| 🟠 Alta | Padronizar o case das tabelas em `Relatorios.js` (§9.3-9) |
| 🟠 Alta | Deduplicar `editarGarcom` e retornar `insertId` em `createGarcom` (§9.3-7, 8) |
| 🟠 Alta | Versionar o DDL como `schema.sql` no repositório |
| 🟡 Média | Expor as rotas de **Pedido** e construir a UI de lançamento de pedidos (§9.4-12) |
| 🟡 Média | Validar entrada nas rotas (biblioteca ou checagens manuais) |
| 🟡 Média | Trocar a conexão única por `mysql.createPool` (robustez e concorrência) |
| 🟡 Média | Aplicar a regra da mesa no `PUT` e adicionar `UNIQUE(mesa)` no banco |
| 🟢 Baixa | Consolidar em um único diretório e apagar `Servidor/` e `Classes/` |
| 🟢 Baixa | Substituir `prompt()` por modais de edição |
| 🟢 Baixa | Debounce nas buscas por ID |
| 🟢 Baixa | Implementar `Mesa` e `Conta`; relatórios de faturamento com `JOIN` em `pedido` |

---

## 11. Mapa rápido de arquivos

| Arquivo | Linhas | Responsabilidade |
|---|---:|---|
| `Servidor_Atualizado/app.js` | 554 | Toda a lógica do frontend: CRUD, filtros, navegação, relatório |
| `Servidor_Atualizado/GerenciadorCRUD.js` | 306 | 22 métodos de acesso a dados para as 4 entidades |
| `Servidor_Atualizado/server.js` | 257 | Bootstrap do Express, 15 rotas REST, tratamento de erros |
| `Servidor_Atualizado/styles.css` | 102 | Layout sidebar + cartões de lista |
| `Servidor_Atualizado/index.html` | 65 | Estrutura das 4 seções da interface |
| `Servidor_Atualizado/Relatorios.js` | 41 | Consultas agregadas (contagens + soma de preços) |
| `Servidor_Atualizado/ConnectionDB.js` | 31 | Wrapper de conexão MySQL |
| `Servidor_Atualizado/{Cliente,Produto,Garcom,Pedido,Mesa,Conta}.js` | 6–10 | Classes de domínio (não instanciadas) |
| `Classes/*` | ~290 | Protótipo inicial, não funcional |
| `Servidor/*` | ~1.150 | Versão anterior, sem relatórios |
