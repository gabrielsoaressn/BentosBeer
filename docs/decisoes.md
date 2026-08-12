# Decisões de projeto

Registro das decisões tomadas durante a reconstrução v2, com a justificativa de cada uma.
Quando a especificação (`Bentos-Beer-Projeto-Final.md`) e a realidade divergiram, a divergência
está anotada aqui em vez de resolvida em silêncio.

---

### D1 — A especificação passou a ser versionada

**Situação**: `Bentos-Beer-Projeto-Final.md` era referenciado como fonte da verdade, mas não existia
em disco nem no Git — só no histórico da conversa.

**Decisão**: gravado na raiz, verbatim, e commitado na Fase 0.

**Por quê**: sem o documento versionado, nenhuma fase seguinte tem referência auditável, e o critério
"quando o prompt e o documento divergirem, o documento vence" fica sem árbitro.

---

### D2 — MySQL em container Docker

**Situação**: nenhum servidor MySQL ativo na máquina. Porta 3306 fechada, serviços `mysql`,
`mysqld` e `mariadb` inativos, `/var/lib/mysql` sem permissão de leitura. Existe um `mysqld` 8.4.0
via Anaconda, mas sem diretório de dados inicializado.

**Decisão**: `docker-compose.yml` com `mysql:8.4`, exposto em `npm run db:up`. O Docker já estava
disponível (daemon 29.6.1) e o usuário já pertence ao grupo `docker`, então não precisa de `sudo`.

**Por quê**: reproduz o ambiente em qualquer máquina com um comando, sem privilégio administrativo e
sem sujar o MySQL do sistema. As credenciais continuam vindo só do `.env`, então quem já tem um
MySQL 8 próprio usa o dele mudando quatro linhas e nada mais.

---

### D3 — `vw_comanda` expõe `mesa_id`, e `vw_salao` junta por chave

**Situação**: a §4.3 da especificação junta `vw_salao` com `vw_comanda` por
`c.mesa = m.numero` — ou seja, por rótulo de exibição, porque `vw_comanda` não expunha a chave.

**Decisão**: `vw_comanda` passa a selecionar `c.mesa_id`, e `vw_salao` junta por
`c.mesa_id = m.id`.

**Por quê**: `numero` é `UNIQUE`, então a junção original funcionava — mas junção por chave primária
é mais barata (usa o índice do PK direto) e não quebra se um dia a numeração das mesas mudar. O
campo `mesa` (o número) continua na view, para exibição.

---

### D4 — Correção dos tokens de cor por contraste

**Situação**: os contrastes declarados na §7.3 não se confirmaram no cálculo WCAG 2.x:

| Par | Declarado | Real | Situação |
|---|---|---|---|
| `ink` sobre `paper` | 11.8:1 | **14.02:1** | passa (declaração conservadora) |
| `muted` sobre `cream` | 4.7:1 | **3.94:1** | **falha AA** para texto normal |
| `stout` sobre `amber` | 8.1:1 | **5.57:1** | passa, mas o número estava errado |
| `amber` como texto sobre `cream` | — | **2.48:1** | **falha AA e falha o mínimo 3:1 de componente não-textual** |
| `olive` sobre `cream` | — | **4.41:1** | falha AA por margem estreita |

O caso do âmbar era o mais grave: a §7.5 pede carimbo de status com borda de 1.5px na cor do estado,
e a §7.7 pede anel de foco em `--amber`. Nos dois casos o âmbar original é indistinguível o
suficiente do creme para reprovar até no critério mais frouxo, o de componente não-textual.

**Decisão**, preservando o matiz de cada cor:

- `--muted: #72614B` (4.51 sobre cream)
- `--olive: #5A6939` (4.53 sobre cream)
- novo token `--amber-ink: #8A5912` (4.52 sobre cream) para quando o âmbar é **texto**, **borda** ou
  **anel de foco**
- `--amber: #C57F1A` permanece intacto, mas **só como preenchimento** — com texto `--stout` em cima
  dá 5.57:1

**Por quê**: acessibilidade é critério de aceite declarado na Fase 6 ("navegação completa por teclado
com foco visível"), e um anel de foco com 2.48:1 de contraste não é visível. A separação entre
"âmbar que preenche" e "âmbar que escreve" resolve sem perder o brilho de chope na identidade.

---

### D5 — `sp_fechar_comanda` exige conexão dedicada

**Situação**: a procedure tem parâmetro `OUT`. Recuperá-lo exige duas instruções — o `CALL` e o
`SELECT @variavel` — executadas na **mesma conexão física**, e `pool.execute()` (prepared statement)
não aceita a sintaxe de variável de sessão do jeito esperado.

**Decisão**: `src/repos/comandas.js` usa `pool.getConnection()`, executa
`CALL sp_fechar_comanda(?, @total)` e `SELECT @total AS total` com `conn.query()`, e libera a conexão
no `finally`.

**Por quê**: `pool.query()` pode servir cada instrução por uma conexão diferente, e a variável de
sessão `@total` não existe fora da conexão que a definiu — o `SELECT` voltaria `NULL`
intermitentemente, no pior tipo de bug: o que só aparece sob concorrência.

---

### D6 — `db/reset.js` interpreta `DELIMITER`

**Situação**: `01_schema.sql` usa `DELIMITER //` para declarar trigger e procedure. `DELIMITER` é
diretiva do cliente de linha de comando `mysql`, não é SQL — o driver `mysql2` não a entende.

**Decisão**: o `reset.js` traz um pequeno interpretador de `DELIMITER` que fatia o arquivo em
instruções antes de enviá-las.

**Por quê**: mantém `01_schema.sql` legível e executável também pelo Workbench e pelo cliente
`mysql`, que é como o professor vai abri-lo.

---

### D7 — O movimento do seed é gerado por procedure, não por `INSERT`

**Situação**: as 60 comandas fechadas do seed não podem ser um bloco de `INSERT`. Duas regras do
próprio banco impedem:

1. `trg_item_antes_insert` recusa item lançado em comanda que não está `aberta` — então não se pode
   inserir uma comanda já fechada e depois pendurar itens nela.
2. `uq_mesa_ocupada` permite uma só comanda aberta por mesa a cada instante — então as comandas
   precisam ser abertas e fechadas em sequência, não todas de uma vez.

**Decisão**: `02_seed.sql` traz os dados de referência estáticos (mesas, categorias, produtos,
garçons, clientes) e uma procedure `sp_gerar_movimento()` que percorre os últimos 30 dias fazendo,
por comanda, o ciclo **abrir → lançar itens → fechar com data retroativa**. A procedure é dropada no
fim do arquivo.

**Por quê**: além de ser a única forma de popular respeitando as regras, rende mais SQL para a
avaliação — `WHILE`, variáveis locais, `RAND()` e aritmética de data. As regras do banco provando seu
valor já no próprio seed é o melhor argumento de que elas funcionam.

---

### D8 — Fontes locais, não CDN

**Situação**: as quatro fontes da §7.4 (UnifrakturCook, Grenze, Archivo, Courier Prime) são do
Google Fonts.

**Decisão**: os arquivos `woff2` ficam em `public/fonts/`, declarados com `@font-face` local, com a
licença OFL ao lado.

**Por quê**: apresentação em sala de aula sem Wi-Fi confiável não pode perder a tipografia, que é
metade da identidade visual. Fontes não são dependência npm, então o limite de quatro pacotes
continua respeitado.

---

### D9 — `Projeto.md` virou `docs/diagnostico-v1.md`

**Situação**: a especificação diz que substitui o `Projeto.md`, mas a §3 dela referencia os números
`9.1-1`, `9.2-3`, `9.3-9` etc. daquele documento para rastrear as correções herdadas.

**Decisão**: movido para `docs/diagnostico-v1.md` em vez de apagado.

**Por quê**: a tabela de rastreabilidade fica sem sentido se o documento referenciado desaparecer, e
o diagnóstico do sistema antigo é material de apresentação — mostra o antes e o depois.

---

### D10 — O trabalho v2 vive em uma branch

**Situação**: a reconstrução apaga todo o código-fonte existente.

**Decisão**: `main` ficou parada no commit da entrega antiga (mais a tag `v1-entrega-antiga`,
publicada no GitHub); a reconstrução acontece na branch `v2-reconstrucao`.

**Por quê**: o `main` continua servindo a versão que foi entregue na disciplina até que a v2 esteja
completa e verificada. O merge é uma decisão explícita, não um efeito colateral da primeira fase.

---

### D11 — O segundo trigger é `trg_item_antes_update`

**Situação**: a §4 da especificação anuncia "dois triggers", mas a §4.4 define apenas um
(`trg_item_antes_insert`, que impede lançar item em comanda não aberta).

**Decisão**: o segundo é `trg_item_antes_update`, aplicando a mesma regra no `UPDATE`.

**Por quê**: é exatamente o furo que este projeto existe para corrigir. O bug 9.3-10 da versão antiga
era uma regra validada na criação e esquecida na edição — sem este trigger, daria para riscar ou
reajustar item de uma conta já fechada, e o faturamento de ontem mudaria hoje. A procedure de
fechamento não é afetada: ela marca os itens como entregues **antes** de mudar o status da comanda,
então o trigger a deixa passar.

---

### D12 — Fuso horário fixo em `-03:00` no servidor de banco

**Situação**: a imagem oficial do MySQL roda em UTC. Com o host em BRT, o banco já estava em
`2026-08-12 01:22` enquanto o host marcava `2026-08-11 22:22`. Detectado ao conferir o relatório por
hora do seed, que mostrava comandas nas horas 0 e 1.

**Consequência do bug, se tivesse passado**: entre 21h e meia-noite — o pico de um bar — `CURDATE()`
no banco já é o dia seguinte. A venda fechada às 22h não apareceria no "relatório do dia", que é
literalmente a última cena do roteiro de demonstração.

**Decisão**: `--default-time-zone=-03:00` e `TZ=America/Sao_Paulo` no `docker-compose.yml`. Na Fase 2,
o pool reforça o mesmo fuso por conexão (`pool.on('connection')` → `SET time_zone`), para o sistema
ficar correto mesmo em uma instância MySQL de terceiros configurada em UTC.

**Por quê**: o Brasil não tem mais horário de verão, então `-03:00` vale o ano inteiro e não depende
das tabelas de fuso do MySQL estarem carregadas — que é o problema de usar o nome
`America/Sao_Paulo` no `default-time-zone`.

---

### D13 — Chaves `UNIQUE` nomeadas

**Situação**: a especificação declara `numero SMALLINT NOT NULL UNIQUE` em `mesa` e
`nome VARCHAR(40) NOT NULL UNIQUE` em `categoria`, sem nomear os índices. O MySQL então os nomeia
sozinho, a partir do nome da coluna.

**Decisão**: nomeados como `uq_mesa_numero` e `uq_categoria_nome`.

**Por quê**: o middleware de erro da Fase 2 traduz `ER_DUP_ENTRY` para mensagem de usuário lendo o
**nome do índice** que estourou. Com índice chamado `numero`, a mensagem teria que ser adivinhada;
com `uq_mesa_numero`, o mapeamento é direto e legível. Mesma razão de `uq_produto_nome` e
`uq_mesa_ocupada`, que a especificação já nomeava.

---

### D14 — `reset.js` substitui o nome do banco em vez de usar placeholder

**Situação**: `01_schema.sql` precisa criar e selecionar o banco por conta própria para ser
executável no Workbench (é o arquivo que o professor abre primeiro), mas os testes da Fase 7 precisam
do mesmo schema em `bentosbeer_test`.

**Decisão**: o arquivo traz o nome real `bentosbeer`, e o `reset.js` troca a string pelo alvo quando
ele é diferente.

**Por quê**: um `{{DB_NAME}}` no meio do DDL tornaria o arquivo ilegível e não executável fora do
script — perdendo justamente o que ele precisa ser. A substituição é invisível no caso normal, em que
o alvo já é `bentosbeer`.

---

### D15 — Datas como string, dinheiro como string até a borda

**Decisão**: o pool usa `dateStrings: true` e mantém `decimalNumbers: false` (o padrão).

**Por quê, para as datas**: sem isso, o driver converte `DATETIME` em objeto `Date`, que é um instante
absoluto e volta ao JSON como UTC — a comanda aberta às 20h chegaria na tela como `23:00Z`, e alguém
teria que desconverter. Para um sistema de um bar só, em um fuso só, a hora de parede **é** a
verdade, e string elimina a classe de bug em que o horário muda três vezes no caminho entre o banco e
a tela. Já perdemos uma rodada com fuso nesta fase (D12); duas seria teimosia.

**Por quê, para o dinheiro**: `DECIMAL` chega como string de propósito, para não perder centavo em
ponto flutuante. Toda soma acontece em SQL. A conversão para número mora em `src/http/formato.js` e
roda no último passo antes do JSON — que é o que a especificação chama de "borda da resposta".

---

### D16 — O evento `connection` do pool entrega a conexão sem promise

**Situação**: `pool.on('connection', c => c.query(...).catch(...))` parecia certo, mas derrubou a
primeira requisição do servidor com *"You have tried to call .then() on the result of query that is
not a promise"*. Mesmo importando de `mysql2/promise`, o evento repassa a conexão **crua**, no estilo
callback — o `.catch()` estourava dentro do handler e pendurava o `getConnection`.

**Decisão**: `typeof conexao.promise === 'function' ? conexao.promise() : conexao` antes de consultar.

**Por quê**: funciona nos dois casos e não depende de qual das duas interfaces o mysql2 decide
entregar. Achado ao subir o servidor pela primeira vez, não em revisão de código — que é o argumento
para o critério de aceite de cada fase ser um comando executado, e não uma leitura.

---

### D17 — `dotenv` com caminho explícito para o `.env`

**Situação**: `import 'dotenv/config'` procura o arquivo no **diretório de trabalho**. Rodar qualquer
script de fora da raiz do projeto carregava zero credencial, e o erro que aparece é
`Access denied for user 'root'` — como se a senha estivesse errada, e não ausente.

**Decisão**: `dotenv.config({ path: <raiz>/.env })`, resolvido a partir de `import.meta.url`.

**Por quê**: a mensagem enganosa custaria tempo de quem for corrigir o trabalho depois, e o custo de
evitá-la é uma linha.
