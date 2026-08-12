#!/usr/bin/env bash
#
# Fluxo completo de uma comanda, via curl.
#
#   npm run db:up && npm run db:reset && npm start   (em outro terminal)
#   bash docs/smoke.sh
#
# Percorre a vida inteira de uma conta: abre na mesa livre, lança três itens,
# risca um, tenta abrir outra comanda na mesma mesa (tem que dar 409), fecha,
# confere que o total bate com a soma dos subtotais não cancelados, e tenta
# fechar de novo (tem que dar 409).
#
set -uo pipefail
API=${API:-http://localhost:3000/api}
ok=0; falhas=0

verde() { printf '  \033[32m✓\033[0m %s\n' "$1"; ok=$((ok+1)); }
vermelho() { printf '  \033[31m✗\033[0m %s\n     %s\n' "$1" "${2:-}"; falhas=$((falhas+1)); }

# json <corpo> <caminho-python>
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

# chama <metodo> <caminho> [corpo]  -> imprime "status\ncorpo"
chama() {
  if [ $# -ge 3 ]; then
    curl -s -w '\n%{http_code}' -X "$1" -H 'Content-Type: application/json' -d "$3" "$API$2"
  else
    curl -s -w '\n%{http_code}' -X "$1" "$API$2"
  fi
}
status() { echo "$1" | tail -1; }
corpo()  { echo "$1" | head -n -1; }

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Bento's Beer — fluxo de comanda"
echo "═══════════════════════════════════════════════════════════════"

# ── 0. Cenário: uma mesa livre, um garçom ativo, três produtos ──────────────
MESA=$(curl -s "$API/salao" | json "[m['mesa_id'] for m in d if m['situacao']=='livre'][0]")
NUMERO=$(curl -s "$API/salao" | json "[m['numero'] for m in d if m['situacao']=='livre'][0]")
GARCOM=$(curl -s "$API/garcons?ativo=true" | json "d[0]['id']")
GARCOM_NOME=$(curl -s "$API/garcons?ativo=true" | json "d[0]['nome']")
read -r P1 P2 P3 <<< "$(curl -s "$API/produtos?disponivel=true" | json "' '.join(str(p['id']) for p in d[:3])")"

if [ -z "$MESA" ] || [ -z "$GARCOM" ]; then
  echo "  Sem mesa livre ou sem garçom ativo. Rode: npm run db:reset"
  exit 1
fi
echo
echo "  cenário: mesa $NUMERO livre · garçom $GARCOM_NOME · produtos $P1 $P2 $P3"

# ── 1. Abrir comanda ────────────────────────────────────────────────────────
echo
echo "── 1. abrir comanda na mesa $NUMERO ──"
R=$(chama POST /comandas "{\"mesaId\":$MESA,\"garcomId\":$GARCOM}")
if [ "$(status "$R")" = "201" ]; then
  COMANDA=$(corpo "$R" | json "d['id']")
  verde "comanda $COMANDA aberta (201)"
else
  vermelho "abrir comanda devolveu $(status "$R")" "$(corpo "$R")"; exit 1
fi

# ── 2. Lançar três itens ────────────────────────────────────────────────────
echo
echo "── 2. lançar três itens ──"
for par in "$P1 2" "$P2 1" "$P3 3"; do
  read -r prod qtd <<< "$par"
  R=$(chama POST "/comandas/$COMANDA/itens" "{\"produtoId\":$prod,\"qtd\":$qtd}")
  if [ "$(status "$R")" = "201" ]; then
    verde "$(corpo "$R" | json "f\"{d['qtd']}x {d['produto']} — R\$ {d['subtotal']:.2f} (preço copiado do cardápio: {d['preco_unitario']:.2f})\"")"
  else
    vermelho "lançar item devolveu $(status "$R")" "$(corpo "$R")"
  fi
done

# ── 3. O preço é do servidor, não do cliente ────────────────────────────────
echo
echo "── 3. cliente tentando ditar o preço ──"
R=$(chama POST "/comandas/$COMANDA/itens" "{\"produtoId\":$P1,\"qtd\":1,\"preco_unitario\":0.01,\"preco\":0.01}")
PRECO_REAL=$(curl -s "$API/produtos/$P1" | json "d['preco']")
PRECO_GRAVADO=$(corpo "$R" | json "d['preco_unitario']")
if [ "$PRECO_GRAVADO" = "$PRECO_REAL" ]; then
  verde "preço enviado (0.01) ignorado; gravou R\$ $PRECO_GRAVADO, o do cardápio"
else
  vermelho "preço do cliente foi aceito" "gravado=$PRECO_GRAVADO cardápio=$PRECO_REAL"
fi
# desfaz esse item extra para não sujar a conferência do total
ITEM_EXTRA=$(corpo "$R" | json "d['id']")
chama PATCH "/comandas/$COMANDA/itens/$ITEM_EXTRA" '{"status":"cancelado"}' > /dev/null

# ── 4. Riscar um item ───────────────────────────────────────────────────────
echo
echo "── 4. riscar um item (o bar não apaga, o bar risca) ──"
ITEM=$(curl -s "$API/comandas/$COMANDA" | json "[i['id'] for i in d['itens'] if i['status']!='cancelado'][0]")
R=$(chama PATCH "/comandas/$COMANDA/itens/$ITEM" '{"status":"cancelado"}')
if [ "$(status "$R")" = "200" ] && [ "$(corpo "$R" | json "d['subtotal']")" = "0" ]; then
  verde "item $ITEM cancelado; subtotal zerou pela coluna gerada, e a linha continua no histórico"
else
  vermelho "cancelar item devolveu $(status "$R")" "$(corpo "$R")"
fi

# ── 5. Mudar quantidade ─────────────────────────────────────────────────────
echo
echo "── 5. corrigir a quantidade de um item ──"
ITEM2=$(curl -s "$API/comandas/$COMANDA" | json "[i['id'] for i in d['itens'] if i['status']!='cancelado'][0]")
R=$(chama PATCH "/comandas/$COMANDA/itens/$ITEM2" '{"qtd":5}')
if [ "$(status "$R")" = "200" ] && [ "$(corpo "$R" | json "d['qtd']")" = "5" ]; then
  verde "$(corpo "$R" | json "f\"quantidade virou 5, subtotal recalculado para R\$ {d['subtotal']:.2f}\"")"
else
  vermelho "mudar quantidade devolveu $(status "$R")" "$(corpo "$R")"
fi

# ── 6. Segunda comanda na mesma mesa: o banco recusa ────────────────────────
echo
echo "── 6. tentar abrir outra comanda na mesa $NUMERO ──"
R=$(chama POST /comandas "{\"mesaId\":$MESA,\"garcomId\":$GARCOM}")
if [ "$(status "$R")" = "409" ]; then
  verde "409 — $(corpo "$R" | json "d['erro']")"
else
  vermelho "esperava 409, veio $(status "$R")" "$(corpo "$R")"
fi

# ── 7. Fechar a conta ───────────────────────────────────────────────────────
echo
echo "── 7. fechar a conta ──"
SOMA=$(curl -s "$API/comandas/$COMANDA" | json "sum(i['subtotal'] for i in d['itens'])")
R=$(chama POST "/comandas/$COMANDA/fechar")
if [ "$(status "$R")" = "200" ]; then
  TOTAL=$(corpo "$R" | json "d['total']")
  verde "conta fechada — total R\$ $TOTAL"
  if [ "$TOTAL" = "$SOMA" ]; then
    verde "total confere com a soma dos subtotais não cancelados (R\$ $SOMA)"
  else
    vermelho "total NÃO confere" "procedure=$TOTAL soma dos itens=$SOMA"
  fi
  PENDENTES=$(curl -s "$API/comandas/$COMANDA" | json "len([i for i in d['itens'] if i['status']=='pendente'])")
  [ "$PENDENTES" = "0" ] && verde "nenhum item ficou pendente: a procedure marcou todos como entregues" \
                         || vermelho "sobraram $PENDENTES itens pendentes"
else
  vermelho "fechar devolveu $(status "$R")" "$(corpo "$R")"
fi

# ── 8. Fechar de novo: a procedure recusa ───────────────────────────────────
echo
echo "── 8. tentar fechar de novo ──"
R=$(chama POST "/comandas/$COMANDA/fechar")
if [ "$(status "$R")" = "409" ]; then
  verde "409 — $(corpo "$R" | json "d['erro']")"
else
  vermelho "esperava 409, veio $(status "$R")" "$(corpo "$R")"
fi

# ── 9. Comanda fechada é imutável ───────────────────────────────────────────
echo
echo "── 9. tentar mexer na comanda já fechada ──"
R=$(chama POST "/comandas/$COMANDA/itens" "{\"produtoId\":$P1,\"qtd\":1}")
[ "$(status "$R")" = "409" ] && verde "lançar item: 409 — $(corpo "$R" | json "d['erro']")" \
                             || vermelho "esperava 409 ao lançar item, veio $(status "$R")" "$(corpo "$R")"
R=$(chama PATCH "/comandas/$COMANDA/itens/$ITEM2" '{"qtd":1}')
[ "$(status "$R")" = "409" ] && verde "alterar item: 409 — $(corpo "$R" | json "d['erro']")" \
                             || vermelho "esperava 409 ao alterar item, veio $(status "$R")" "$(corpo "$R")"

# ── 10. A mesa voltou a ficar livre ─────────────────────────────────────────
echo
echo "── 10. a mesa $NUMERO depois do fechamento ──"
SIT=$(curl -s "$API/salao" | json "[m['situacao'] for m in d if m['mesa_id']==$MESA][0]")
[ "$SIT" = "livre" ] && verde "mesa $NUMERO livre de novo — o UNIQUE bloqueia comanda aberta, não histórico" \
                     || vermelho "mesa ficou como '$SIT'"

R=$(chama POST /comandas "{\"mesaId\":$MESA,\"garcomId\":$GARCOM}")
if [ "$(status "$R")" = "201" ]; then
  NOVA=$(corpo "$R" | json "d['id']")
  verde "nova comanda $NOVA aberta na mesma mesa (201)"
  chama POST "/comandas/$NOVA/cancelar" > /dev/null
  verde "e cancelada, para deixar o banco como estava"
else
  vermelho "reabrir na mesa devolveu $(status "$R")" "$(corpo "$R")"
fi

echo
echo "═══════════════════════════════════════════════════════════════"
printf '  %d verificações passaram, %d falharam\n' "$ok" "$falhas"
echo "═══════════════════════════════════════════════════════════════"
echo
[ "$falhas" -eq 0 ]
