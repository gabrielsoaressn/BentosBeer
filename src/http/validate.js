/**
 * Validador de entrada. Sem dependencia -- sao poucas regras e elas cabem aqui.
 *
 * A versao anterior do sistema nao validava nada: aceitava preco negativo, mesa
 * com letra e nome de 5000 caracteres, e descobria o problema como erro 500.
 *
 * Uso:
 *
 *   const dados = validar(req.body, {
 *     nome:  v.texto({ max: 100 }),
 *     preco: v.decimal({ min: 0 }),
 *     mesaId: v.id(),
 *     observacao: v.texto({ max: 255, obrigatorio: false }),
 *   });
 *
 * Devolve um objeto novo, com os valores ja limpos e convertidos, contendo
 * apenas as chaves declaradas -- o que o cliente mandar a mais e ignorado.
 * Qualquer problema vira AppError 400 apontando o campo.
 */
import { AppError } from './erros.js';

const ausente = (valor) => valor === undefined || valor === null || valor === '';

function exigir(valor, campo, obrigatorio) {
  if (!ausente(valor)) return false;
  if (obrigatorio) throw new AppError(400, `Informe ${campo}.`, campo);
  return true;
}

export const v = {
  texto: ({ min = 1, max = 255, obrigatorio = true } = {}) => (valor, campo) => {
    if (exigir(valor, campo, obrigatorio)) return null;
    const limpo = String(valor).trim();
    if (limpo.length < min) {
      throw new AppError(400, `${campo} precisa de pelo menos ${min} caractere(s).`, campo);
    }
    if (limpo.length > max) {
      throw new AppError(400, `${campo} passa de ${max} caracteres.`, campo);
    }
    return limpo;
  },

  inteiro: ({ min = -Infinity, max = Infinity, obrigatorio = true } = {}) => (valor, campo) => {
    if (exigir(valor, campo, obrigatorio)) return null;
    const numero = Number(valor);
    if (!Number.isInteger(numero)) {
      throw new AppError(400, `${campo} tem que ser um número inteiro.`, campo);
    }
    if (numero < min || numero > max) {
      const faixa = max === Infinity ? `pelo menos ${min}` : `entre ${min} e ${max}`;
      throw new AppError(400, `${campo} tem que ser ${faixa}.`, campo);
    }
    return numero;
  },

  /** Id de registro: inteiro positivo. */
  id: ({ obrigatorio = true } = {}) => (valor, campo) =>
    v.inteiro({ min: 1, max: 2147483647, obrigatorio })(valor, campo),

  decimal: ({ min = 0, max = 99999999.99, obrigatorio = true } = {}) => (valor, campo) => {
    if (exigir(valor, campo, obrigatorio)) return null;
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      throw new AppError(400, `${campo} tem que ser um número.`, campo);
    }
    if (numero < min || numero > max) {
      throw new AppError(400, `${campo} tem que ser entre ${min} e ${max}.`, campo);
    }
    // duas casas: o banco guarda DECIMAL(10,2) e arredondaria de qualquer jeito
    return Math.round(numero * 100) / 100;
  },

  booleano: ({ obrigatorio = true } = {}) => (valor, campo) => {
    if (valor === undefined || valor === null) {
      if (obrigatorio) throw new AppError(400, `Informe ${campo}.`, campo);
      return null;
    }
    if (typeof valor === 'boolean') return valor;
    if (valor === 'true' || valor === 1 || valor === '1') return true;
    if (valor === 'false' || valor === 0 || valor === '0') return false;
    throw new AppError(400, `${campo} tem que ser verdadeiro ou falso.`, campo);
  },

  enumerado: (permitidos, { obrigatorio = true } = {}) => (valor, campo) => {
    if (exigir(valor, campo, obrigatorio)) return null;
    const limpo = String(valor).trim();
    if (!permitidos.includes(limpo)) {
      throw new AppError(400, `${campo} tem que ser um destes: ${permitidos.join(', ')}.`, campo);
    }
    return limpo;
  },

  /** Data no formato AAAA-MM-DD, que e o que os filtros de relatorio usam. */
  data: ({ obrigatorio = true } = {}) => (valor, campo) => {
    if (exigir(valor, campo, obrigatorio)) return null;
    const limpo = String(valor).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
      throw new AppError(400, `${campo} tem que estar no formato AAAA-MM-DD.`, campo);
    }
    const [ano, mes, dia] = limpo.split('-').map(Number);
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
      throw new AppError(400, `${campo} não é uma data que existe.`, campo);
    }
    return limpo;
  },
};

export function validar(origem = {}, regras) {
  const limpo = {};
  for (const [campo, checar] of Object.entries(regras)) {
    const valor = checar(origem?.[campo], campo);
    if (valor !== null) limpo[campo] = valor;
  }
  return limpo;
}
