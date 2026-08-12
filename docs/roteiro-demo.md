# Roteiro de demonstração — 5 minutos

Sequência ensaiada para a apresentação. Cada passo tem o que dizer e o que
aparece na tela. O tempo total é de 5 minutos falando com calma.

## Antes de começar (fora do cronômetro)

```bash
npm run db:up      # container do MySQL, se já não estiver no ar
npm run db:reset   # 12 mesas, 34 produtos, 60 comandas fechadas, 5 abertas
npm start          # http://localhost:3000
```

Abra **duas** abas: a aplicação em `localhost:3000` e o Workbench conectado em
`bentosbeer`, com `docs/consultas.sql` já carregado. A troca entre elas é o que
dá o ritmo da apresentação: a tela mostra o produto, o Workbench mostra o SQL.

Confira antes: o salão tem **5 mesas ocupadas e 7 livres**. Se estiver diferente,
rode `npm run db:reset` de novo.

---

## 1. O problema (30s) — tela de Salão

> "O sistema anterior era um cadastro: dava para listar clientes, produtos e
> garçons. Mas não respondia a pergunta que um bar faz o tempo todo — **quanto
> tem na mesa 7?** A tabela de pedido, que é a única interessante do esquema,
> não tinha rota nem tela."

Aponte o salão: 12 mesas, 5 ocupadas com valor e tempo de mesa, 7 livres.

> "Agora o centro do sistema é a comanda."

---

## 2. Abrir comanda e lançar itens (60s)

1. Clique numa **mesa livre** — abre o formulário.
2. Escolha um garçom, deixe o cliente em branco.

   > "Cliente é opcional: mesa de passagem não exige cadastro. Isso é uma FK que
   > aceita NULL."

3. **Abrir comanda.**
4. Na busca do cardápio, digite `chope`, clique em **Chope Escuro 500ml**.
5. Lance mais dois: um da seção **Porções** e um **Drink**.

   > "O preço não vem da tela. Vem do cardápio, copiado dentro do próprio
   > INSERT. Se eu mandasse `preco: 0.01` no corpo da requisição, o servidor
   > ignoraria — tem teste para isso."

Mostre a comanda: pontilhado de condução, valores em monoespaçada, total embaixo
do traço.

---

## 3. Riscar um item (30s)

Clique em **riscar** no item do meio, confirme.

> "O bar não apaga, o bar risca. A linha fica na comanda, aparece cortada, com
> 'cancelado' no lugar do valor. E o subtotal dela virou zero — não porque o
> JavaScript zerou, mas porque a coluna `subtotal` é **gerada** no banco:
> `IF(status='cancelado', 0, qtd * preco_unitario)`. Todo `SUM` do sistema usa a
> mesma regra, sem cada consulta repetir o `IF` e uma delas esquecer."

O total no rodapé conta até o novo valor.

---

## 4. A regra da mesa ocupada (45s)

Volte ao **Salão**, clique na **mesma mesa** que acabou de ocupar — ela agora
mostra a comanda. Para provocar o erro, vá ao Workbench:

```sql
INSERT INTO comanda (mesa_id, garcom_id, status)
  SELECT mesa_id, garcom_id, 'aberta' FROM comanda WHERE status='aberta' LIMIT 1;
```

> `ERROR 1062: Duplicate entry for key 'comanda.uq_mesa_ocupada'`

> "Duas comandas abertas na mesma mesa: o banco recusa. E o mais importante — a
> versão anterior tinha essa checagem, mas só no `INSERT` e só na aplicação.
> Editar uma comanda escapava da regra.
>
> Aqui a solução é uma coluna gerada: `mesa_ocupada` carrega o `mesa_id`
> **enquanto a comanda está aberta** e NULL em qualquer outro status. Como NULL
> não colide em índice único, a mesa pode ter cem comandas no histórico e no
> máximo uma aberta agora. Vale no INSERT, no UPDATE, e para qualquer cliente que
> se conecte ao banco — não só para a nossa aplicação."

Na aplicação, mostre o mesmo erro tratado: a API devolveria
*"Essa mesa já tem uma comanda aberta."*

---

## 5. Fechar a conta (45s)

Na comanda, **Fechar conta** → confirme.

> "Fechar é a única operação que precisa ser atômica: marca os itens como
> entregues, soma o total e carimba a hora. Está numa `PROCEDURE` com
> `START TRANSACTION` e `SELECT ... FOR UPDATE`."

No Workbench:

```sql
CALL sp_fechar_comanda(<id da comanda que acabou de fechar>, @t);
```

> `ERROR 1644: Comanda ja foi encerrada`

> "O `FOR UPDATE` trava a linha, então dois garçons apertando 'fechar' ao mesmo
> tempo não fecham a mesma conta duas vezes: o segundo espera, vê o status já
> mudado e recebe erro."

Volte ao Salão: a mesa está **livre** outra vez.

---

## 6. A venda aparece no relatório (60s) — tela de Relatórios

> "E a venda que acabamos de fechar já está no faturamento de hoje."

Aponte a **última barra** do gráfico — é o dia corrente, e o seed deixa o dia de
hoje vazio de propósito, então essa barra é a venda da demonstração.

> "O gráfico é `<canvas>` desenhado à mão, sem biblioteca. E nenhuma soma de
> dinheiro passa por JavaScript: `DECIMAL` chega do driver como string
> justamente para não perder centavo. A versão anterior somava com `reduce` —
> e ainda somava preço de catálogo, que não é faturamento nem estoque."

Desça até **Líderes de cada seção**:

> "Esse é o recurso que a disciplina pede: `RANK() OVER (PARTITION BY categoria
> ORDER BY receita DESC)`. Resolve em uma passada o que exigiria uma subconsulta
> correlacionada por categoria."

Mostre a consulta 5 no Workbench, lado a lado com a tabela na tela.

---

## 7. Fechamento (30s)

> "Sete tabelas, duas views, dois triggers e uma procedure. A regra de negócio
> mora no banco: `CHECK`, `ENUM`, coluna gerada com `UNIQUE`, chave estrangeira
> com `RESTRICT` onde apagar destruiria histórico e `SET NULL` onde não destrói.
>
> São 69 testes de integração rodando contra um banco `bentosbeer_test` recriado
> a cada execução, e `docs/smoke.sh` percorre o fluxo inteiro de uma comanda por
> curl."

Se sobrar tempo, rode ao vivo:

```bash
npm test            # 69 testes
bash docs/smoke.sh  # 17 verificações do fluxo de comanda
```

---

## Perguntas prováveis, e a resposta curta

**"Por que o preço fica repetido em `item_comanda` se já está em `produto`?"**
Porque não é repetição, é fotografia. Reajuste de cardápio amanhã não pode
reescrever o valor da venda de hoje. Tem teste: muda o preço do produto e
confirma que o item não muda.

**"Por que não deletar o item cancelado?"**
Porque o bar não apaga, risca. A linha é rastro de que algo foi pedido e voltou.
O `subtotal` zerado tira o item da conta sem tirar da história.

**"E se o banco cair com o servidor no ar?"**
As rotas de dados respondem 503 com mensagem clara e o processo continua vivo. A
versão anterior fazia `process.exit(1)` no boot. Dá para demonstrar: `npm run
db:down` com a aplicação aberta, recarregar, e `npm run db:up` de volta — sem
reiniciar o servidor.

**"Cadê o `mesa` como tabela? O modelo antigo tinha mesa como coluna do cliente."**
Virou tabela, com `numero` único e `lugares`. Cliente não tem mais mesa: quem
tem mesa é a comanda, que é onde a relação realmente vive.

**"Por que MySQL em Docker?"**
Só conveniência de ambiente. As credenciais vêm do `.env`; apontar para uma
instância própria não muda uma linha de código.
