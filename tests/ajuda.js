/**
 * Apoio dos testes.
 *
 * Sobe o app de verdade em porta efêmera e conversa com ele por fetch. Sem
 * supertest: `criarApp()` já devolve o app sem escutar porta, então o próprio
 * Node resolve — e o limite de quatro dependências continua respeitado.
 *
 * O banco é o `bentosbeer_test`, recriado por `npm test` antes de rodar.
 */
import { criarApp } from '../src/app.js';
import { fecharPool } from '../src/db/pool.js';

let servidor;
let base;

export async function subir() {
  if (base) return base;
  servidor = criarApp().listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://127.0.0.1:${servidor.address().port}/api`;
  return base;
}

export async function derrubar() {
  if (servidor) await new Promise((resolver) => servidor.close(resolver));
  await fecharPool();
}

/** Devolve { status, corpo } — nunca lança por status de erro. */
export async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    /* sem corpo */
  }
  return { status: resposta.status, corpo: dados };
}

export const pegar = (caminho) => chamar('GET', caminho);
export const criar = (caminho, corpo) => chamar('POST', caminho, corpo);
export const alterar = (caminho, corpo) => chamar('PATCH', caminho, corpo);
export const trocar = (caminho, corpo) => chamar('PUT', caminho, corpo);
export const remover = (caminho) => chamar('DELETE', caminho);

/**
 * Cria uma mesa nova, só para o teste que a pediu.
 *
 * Reaproveitar as mesas do seed não funciona: `uq_mesa_ocupada` permite uma
 * comanda aberta por mesa, e a suíte abre mais de vinte comandas — as 7 mesas
 * livres acabavam e os testes falhavam com "sem mesa livre". Pior: `node --test`
 * roda os arquivos em paralelo, então um arquivo ocupava a mesa que o outro ia
 * usar, e a falha era intermitente.
 *
 * Numeração alta, sorteada dentro da faixa que o validador aceita (o número da
 * mesa vai até 9999), para não colidir com o seed nem com outro arquivo de teste.
 */
const FAIXA_INICIO = 2000;
const FAIXA_FIM = 9999;
let proximaMesa = FAIXA_INICIO + Math.floor(Math.random() * (FAIXA_FIM - FAIXA_INICIO - 200));

export async function mesaLivre() {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const numero = proximaMesa++;
    if (proximaMesa > FAIXA_FIM) proximaMesa = FAIXA_INICIO;
    const { status, corpo } = await criar('/mesas', { numero, lugares: 4 });
    // mesa_id além de id: /mesas devolve `id`, /salao devolve `mesa_id`, e os
    // testes comparam com as duas rotas. Expor os dois evita confundir os dois
    // formatos no meio do teste.
    if (status === 201) return { ...corpo, mesa_id: corpo.id };
    // 409 é número já usado por outro arquivo de teste: tenta o seguinte
    if (status !== 409) throw new Error(`Não criei mesa de teste: ${status} ${JSON.stringify(corpo)}`);
  }
  throw new Error('Não consegui um número de mesa livre depois de 40 tentativas');
}

/** Uma mesa que já vem do seed, para os testes que precisam de histórico. */
export async function mesaDoSeed() {
  const { corpo } = await pegar('/mesas');
  const mesa = corpo.find((m) => m.numero < 100);
  return { ...mesa, mesa_id: mesa.id };
}

export async function primeiroGarcom() {
  const { corpo } = await pegar('/garcons?ativo=true');
  return corpo[0];
}

export async function tresProdutos() {
  const { corpo } = await pegar('/produtos?disponivel=true');
  return corpo.slice(0, 3);
}

/** Abre uma comanda em mesa livre e devolve o corpo dela. */
export async function abrirComanda() {
  const mesa = await mesaLivre();
  const garcom = await primeiroGarcom();
  const { status, corpo } = await criar('/comandas', { mesaId: mesa.mesa_id, garcomId: garcom.id });
  if (status !== 201) throw new Error(`Não abriu comanda: ${status} ${JSON.stringify(corpo)}`);
  return { comanda: corpo, mesa, garcom };
}
