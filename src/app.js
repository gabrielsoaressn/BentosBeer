/**
 * Monta o Express e exporta o app, sem escutar porta.
 *
 * A separacao entre montar e escutar (server.js e quem chama listen) e o que
 * permite os testes subirem o sistema inteiro em uma porta efemera, sem precisar
 * de supertest -- e sem estourar o limite de quatro dependencias.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { rota, middlewareErro, middlewareRotaInexistente } from './http/erros.js';
import { ping } from './db/pool.js';
import {
  rotasMesas,
  rotasClientes,
  rotasGarcons,
  rotasCategorias,
  rotasProdutos,
} from './routes/cadastros.js';
import { rotasSalao, rotasComandas } from './routes/comandas.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICO = join(RAIZ, 'public');

export function criarApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // SOMENTE public/ e servido. A versao anterior fazia
  // express.static(path.resolve('.')), o que servia o diretorio inteiro do
  // projeto: GET /ConnectionDB.js devolvia o codigo-fonte com a senha do banco
  // em texto claro (furo 9.2-3). Aqui nao existe caminho por onde um arquivo de
  // src/, db/ ou o .env possam ser baixados.
  app.use(express.static(PUBLICO));

  // -------------------------------------------------------------------------
  //  API
  // -------------------------------------------------------------------------
  const api = express.Router();

  api.get(
    '/status',
    rota(async (_req, res) => {
      await ping();
      res.json({ ok: true, banco: 'conectado' });
    })
  );

  // Operacao
  api.use('/salao', rotasSalao);
  api.use('/comandas', rotasComandas);

  // Cadastros
  api.use('/mesas', rotasMesas);
  api.use('/clientes', rotasClientes);
  api.use('/garcons', rotasGarcons);
  api.use('/categorias', rotasCategorias);
  api.use('/produtos', rotasProdutos);

  app.use('/api', api);

  // 404 de API antes do middleware de erro; fora de /api o static ja respondeu
  app.use('/api', middlewareRotaInexistente);

  // Precisa ser o ultimo de todos
  app.use(middlewareErro);

  return app;
}
