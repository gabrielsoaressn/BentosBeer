#!/usr/bin/env bash
#
# Regenera a branch gh-pages a partir de public/.
#
#   npm run db:reset && npm run demo:dados && npm run pages
#   git push origin gh-pages
#
# A branch gh-pages é GERADA, nunca editada à mão: ela é uma cópia de public/
# com um .nojekyll. Editar lá dentro perde o trabalho na próxima execução.
#
# O GitHub Pages não executa Node nem MySQL — quem responde no lugar do servidor
# é public/js/demo.js, a partir do retrato em public/demo/dados.json.
#
set -euo pipefail

RAIZ=$(git rev-parse --show-toplevel)
TRABALHO=$(mktemp -d)

cd "$RAIZ"

if [ ! -f public/demo/dados.json ]; then
  echo "✗ public/demo/dados.json não existe. Rode antes: npm run demo:dados" >&2
  exit 1
fi

# uma cópia de trabalho separada, para não mexer na sua árvore atual
git worktree add -q -B gh-pages "$TRABALHO" main
trap 'git worktree remove --force "$TRABALHO" >/dev/null 2>&1 || true' EXIT

cd "$TRABALHO"
git rm -rq --cached .
rm -rf $(ls -A | grep -v '^\.git$')

cp -r "$RAIZ/public/." .

# sem .nojekyll o Pages roda Jekyll e ignora o que começa com underscore
touch .nojekyll

cat > README.md <<'MD'
Esta branch é gerada, não editada à mão.

Ela contém o conteúdo de `public/` da branch `main`, servido pelo GitHub Pages
como demonstração estática. O Pages não executa Node nem MySQL, então
`js/demo.js` responde no lugar do servidor, a partir do retrato em
`demo/dados.json`.

Para atualizar, rode na `main`:

    npm run db:reset && npm run demo:dados && npm run pages

O código do sistema está na `main`.
MD

git add -A
if git diff --cached --quiet; then
  echo "  nada mudou desde a última publicação"
else
  git commit -q -m "Publica a demonstracao estatica (conteudo de public/ da main)"
  echo "  gh-pages regenerada — publique com: git push origin gh-pages"
fi
