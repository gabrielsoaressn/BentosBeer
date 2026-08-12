Esta branch é gerada, não editada à mão.

Ela contém o conteúdo de `public/` da branch `main`, servido pelo GitHub Pages
como demonstração estática. O Pages não executa Node nem MySQL, então
`js/demo.js` responde no lugar do servidor, a partir do retrato em
`demo/dados.json`.

Para atualizar, rode na `main`:

    npm run db:reset && npm run demo:dados && npm run pages

O código do sistema está na `main`.
