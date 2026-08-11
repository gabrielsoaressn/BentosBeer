# Bento's Beer

Sistema de gerenciamento de bar — trabalho da disciplina de **Banco de Dados**, UFPB.
Autores: **Gabriel, Rivando e Rafael**.

> 🚧 **Reconstrução em andamento (v2).** A especificação está em
> [`Bentos-Beer-Projeto-Final.md`](Bentos-Beer-Projeto-Final.md); as decisões tomadas ao longo do
> caminho, em [`docs/decisoes.md`](docs/decisoes.md). Este README é reescrito na Fase 7 com
> instruções completas, print do salão e diagrama ER.

A versão entregue originalmente na disciplina está preservada na tag
[`v1-entrega-antiga`](../../tree/v1-entrega-antiga), e o diagnóstico do que ela tinha de bom e de
ruim está em [`docs/diagnostico-v1.md`](docs/diagnostico-v1.md).

## Como rodar

```bash
cp .env.example .env     # ajuste se for usar um MySQL próprio
npm install              # 4 dependências: express, cors, mysql2, dotenv
npm run db:up            # sobe MySQL 8.4 em container
npm run db:reset         # cria schema, views, trigger, procedure e popula
npm start                # http://localhost:3000
```

## Nota de segurança sobre o histórico do Git

Os commits anteriores a esta reconstrução contêm **senhas de banco de dados em texto claro**
(`ConnectionDB.js` trazia a credencial hardcoded). O histórico **não foi reescrito** — por decisão
consciente, para não invalidar a tag da entrega original nem os links de commit já compartilhados.

As credenciais expostas **foram invalidadas** e não abrem mais nenhum banco. Da v2 em diante,
credencial só existe em `.env`, que está no `.gitignore` e nunca é commitado; o repositório carrega
apenas `.env.example`, com valores de exemplo.

Se você clonar este repositório e encontrar aquelas senhas em commits antigos: elas são história,
não são segredo ativo.
