/**
 * Rotas de relatorio. Todas aceitam ?de=&ate= no formato AAAA-MM-DD.
 */
import express from 'express';
import { rota, AppError } from '../http/erros.js';
import { v, validar } from '../http/validate.js';
import { relatorios } from '../repos/relatorios.js';

export const rotasRelatorios = express.Router();

/** Le e valida o periodo, recusando intervalo invertido. */
function lerPeriodo(req) {
  const filtro = validar(req.query, {
    de: v.data({ obrigatorio: false }),
    ate: v.data({ obrigatorio: false }),
  });
  if (filtro.de && filtro.ate && filtro.de > filtro.ate) {
    throw new AppError(400, 'A data inicial é posterior à final.', 'de');
  }
  return filtro;
}

const comPeriodo = (fn) =>
  rota(async (req, res) => {
    res.json(await fn(lerPeriodo(req)));
  });

rotasRelatorios.get('/resumo', comPeriodo((p) => relatorios.resumo(p)));
rotasRelatorios.get('/faturamento-diario', comPeriodo((p) => relatorios.faturamentoDiario(p)));
rotasRelatorios.get('/por-garcom', comPeriodo((p) => relatorios.porGarcom(p)));
rotasRelatorios.get('/por-hora', comPeriodo((p) => relatorios.porHora(p)));

// Estes dois aceitam ainda um limite, com faixa validada
rotasRelatorios.get(
  '/top-produtos',
  rota(async (req, res) => {
    const { limite } = validar(req.query, {
      limite: v.inteiro({ min: 1, max: 50, obrigatorio: false }),
    });
    res.json(await relatorios.topProdutos(lerPeriodo(req), limite ?? 10));
  })
);

rotasRelatorios.get(
  '/ranking-categoria',
  rota(async (req, res) => {
    const { porCategoria } = validar(req.query, {
      porCategoria: v.inteiro({ min: 1, max: 20, obrigatorio: false }),
    });
    res.json(await relatorios.rankingCategoria(lerPeriodo(req), porCategoria ?? 3));
  })
);
