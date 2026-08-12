/**
 * Rotas dos cinco cadastros.
 *
 * Cada recurso declara apenas o que e proprio dele: as regras de validacao de
 * entrada e os filtros de listagem. O desenho das rotas vem de rotasCrud.
 *
 * Nomes de campo em camelCase na API (categoriaId), snake_case no banco
 * (categoria_id) -- a traducao acontece no repositorio.
 */
import { rotasCrud } from '../http/crud.js';
import { v } from '../http/validate.js';
import { mesas } from '../repos/mesas.js';
import { clientes } from '../repos/clientes.js';
import { garcons } from '../repos/garcons.js';
import { categorias } from '../repos/categorias.js';
import { produtos } from '../repos/produtos.js';

// As faixas repetem de proposito o que o banco ja garante por CHECK. A validacao
// existe para o usuario receber 400 com o campo apontado em vez de 400 genérico
// traduzido de um erro de constraint -- o banco continua sendo a ultima palavra.
export const rotasMesas = rotasCrud({
  repo: mesas,
  criar: {
    numero: v.inteiro({ min: 1, max: 9999 }),
    lugares: v.inteiro({ min: 1, max: 20, obrigatorio: false }),
  },
});

export const rotasClientes = rotasCrud({
  repo: clientes,
  criar: {
    nome: v.texto({ min: 2, max: 100 }),
    telefone: v.texto({ max: 20, obrigatorio: false }),
  },
});

export const rotasGarcons = rotasCrud({
  repo: garcons,
  criar: {
    nome: v.texto({ min: 2, max: 100 }),
    apelido: v.texto({ max: 40, obrigatorio: false }),
    ativo: v.booleano({ obrigatorio: false }),
  },
  filtros: {
    ativo: v.booleano({ obrigatorio: false }),
  },
});

export const rotasCategorias = rotasCrud({
  repo: categorias,
  criar: {
    nome: v.texto({ min: 2, max: 40 }),
    ordem: v.inteiro({ min: 0, max: 127, obrigatorio: false }),
  },
});

export const rotasProdutos = rotasCrud({
  repo: produtos,
  criar: {
    categoriaId: v.id(),
    nome: v.texto({ min: 2, max: 100 }),
    descricao: v.texto({ max: 255, obrigatorio: false }),
    preco: v.decimal({ min: 0 }),
    disponivel: v.booleano({ obrigatorio: false }),
  },
  filtros: {
    categoriaId: v.id({ obrigatorio: false }),
    disponivel: v.booleano({ obrigatorio: false }),
  },
});
