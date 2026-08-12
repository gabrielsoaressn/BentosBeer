/**
 * Rotas de operacao: salao, comandas e itens.
 *
 * Sem SQL e sem try/catch, como o resto. O que parece "regra" aqui e so
 * traducao de HTTP: ler parametro, validar, chamar o repositorio, escolher o
 * status. As regras de verdade estao no banco.
 */
import express from 'express';
import { rota, AppError } from '../http/erros.js';
import { v, validar } from '../http/validate.js';
import { comandas, STATUS_ITEM } from '../repos/comandas.js';

export const rotasSalao = express.Router();

// GET /api/salao -- a home do sistema
rotasSalao.get(
  '/',
  rota(async (_req, res) => {
    res.json(await comandas.salao());
  })
);

export const rotasComandas = express.Router();

/** Carrega a comanda ou morre com 404. Usado por todas as rotas de /:id. */
async function exigirComanda(id) {
  const comanda = await comandas.porId(id);
  if (!comanda) throw new AppError(404, 'Comanda não encontrada.');
  return comanda;
}

// GET /api/comandas?status=aberta
rotasComandas.get(
  '/',
  rota(async (req, res) => {
    const filtros = validar(req.query, {
      status: v.enumerado(['aberta', 'fechada', 'cancelada'], { obrigatorio: false }),
      mesaId: v.id({ obrigatorio: false }),
      garcomId: v.id({ obrigatorio: false }),
    });
    res.json(await comandas.listar(filtros));
  })
);

// GET /api/comandas/:id
rotasComandas.get(
  '/:id',
  rota(async (req, res) => {
    res.json(await exigirComanda(v.id()(req.params.id, 'id')));
  })
);

// POST /api/comandas -- abre a conta na mesa
rotasComandas.post(
  '/',
  rota(async (req, res) => {
    const dados = validar(req.body, {
      mesaId: v.id(),
      garcomId: v.id(),
      clienteId: v.id({ obrigatorio: false }),
      observacao: v.texto({ max: 255, obrigatorio: false }),
    });
    const id = await comandas.abrir(dados);
    res.status(201).json(await comandas.porId(id));
  })
);

// POST /api/comandas/:id/itens -- lanca item; o preco vem do cardapio
rotasComandas.post(
  '/:id/itens',
  rota(async (req, res) => {
    const id = v.id()(req.params.id, 'id');
    const dados = validar(req.body, {
      produtoId: v.id(),
      qtd: v.inteiro({ min: 1, max: 999, obrigatorio: false }),
    });

    // Confere a comanda antes para dar 404 de comanda, e nao o 409 do trigger,
    // quando o id nem existe.
    await exigirComanda(id);

    const itemId = await comandas.adicionarItem(id, { ...dados, qtd: dados.qtd ?? 1 });
    res.status(201).json(await comandas.itemPorId(id, itemId));
  })
);

// PATCH /api/comandas/:id/itens/:itemId -- muda quantidade ou risca o item
rotasComandas.patch(
  '/:id/itens/:itemId',
  rota(async (req, res) => {
    const id = v.id()(req.params.id, 'id');
    const itemId = v.id()(req.params.itemId, 'itemId');

    const dados = validar(req.body, {
      qtd: v.inteiro({ min: 1, max: 999, obrigatorio: false }),
      status: v.enumerado(STATUS_ITEM, { obrigatorio: false }),
    });
    if (dados.qtd === undefined && dados.status === undefined) {
      throw new AppError(400, 'Informe qtd ou status para alterar.');
    }

    await exigirComanda(id);
    if (!(await comandas.itemPorId(id, itemId))) {
      throw new AppError(404, 'Item não encontrado nessa comanda.', 'itemId');
    }

    await comandas.atualizarItem(id, itemId, dados);
    res.json(await comandas.itemPorId(id, itemId));
  })
);

// POST /api/comandas/:id/fechar -- delega a sp_fechar_comanda
rotasComandas.post(
  '/:id/fechar',
  rota(async (req, res) => {
    const id = v.id()(req.params.id, 'id');
    // Sem exigirComanda: a propria procedure distingue comanda inexistente de
    // comanda ja encerrada, e os SIGNAL dela viram 404 e 409 no middleware.
    const total = await comandas.fechar(id);
    res.json({ id, total, comanda: await comandas.porId(id) });
  })
);

// POST /api/comandas/:id/cancelar
rotasComandas.post(
  '/:id/cancelar',
  rota(async (req, res) => {
    const id = v.id()(req.params.id, 'id');
    await comandas.cancelar(id);
    res.json(await comandas.porId(id));
  })
);
