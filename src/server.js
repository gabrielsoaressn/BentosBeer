/**
 * Ponto de entrada: sobe o servidor.
 *
 * Diferente da versao anterior, o servidor NAO morre se o banco estiver fora.
 * Antes, uma falha de conexao no boot chamava process.exit(1) e o processo
 * inteiro caia -- inclusive a pagina, que nem depende do banco para carregar.
 * Agora o servidor sobe, avisa no log, e cada rota que precisa do banco
 * responde 503 com mensagem clara. Quando o banco volta, o pool reconecta
 * sozinho e nao e preciso reiniciar nada.
 */
import 'dotenv/config';
import { criarApp } from './app.js';
import { ping } from './db/pool.js';

const porta = Number(process.env.PORT ?? 3000);
const app = criarApp();

const servidor = app.listen(porta, async () => {
  console.log(`\n  Bento's Beer rodando em http://localhost:${porta}`);

  try {
    await ping();
    console.log(`  banco "${process.env.DB_NAME ?? 'bentosbeer'}" conectado\n`);
  } catch (erro) {
    console.warn(`\n  ⚠ banco inacessível (${erro.code ?? erro.message}).`);
    console.warn('    A página carrega, mas as rotas de dados vão responder 503.');
    console.warn('    Suba o banco com: npm run db:up && npm run db:reset\n');
  }
});

// Ctrl+C fecha a escuta e o pool antes de sair, em vez de derrubar conexoes
// no meio de uma transacao.
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    console.log('\n  encerrando…');
    servidor.close(() => process.exit(0));
  });
}
