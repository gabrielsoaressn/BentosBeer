/**
 * Conversao de tipos na borda da resposta HTTP.
 *
 * DECIMAL chega do mysql2 como string, de proposito: virar float no meio do
 * caminho perde centavo. Toda soma de dinheiro acontece em SQL; aqui, no ultimo
 * passo antes do JSON, a string vira numero para o JavaScript do navegador poder
 * formatar.
 */

/** String de DECIMAL -> numero. Preserva null. */
export const dinheiro = (valor) => (valor === null || valor === undefined ? null : Number(valor));

/** Aplica `dinheiro` nos campos indicados de uma linha. */
export function comDinheiro(linha, ...campos) {
  if (!linha) return linha;
  const copia = { ...linha };
  for (const campo of campos) {
    if (campo in copia) copia[campo] = dinheiro(copia[campo]);
  }
  return copia;
}

/** Idem, para uma lista de linhas. */
export const listaComDinheiro = (linhas, ...campos) =>
  linhas.map((linha) => comDinheiro(linha, ...campos));

/** COUNT() do MySQL tambem chega como string em algumas versoes. */
export const inteiro = (valor) => (valor === null || valor === undefined ? null : Number(valor));

/**
 * BOOLEAN no MySQL e TINYINT(1), entao chega como 1 ou 0. Funcionaria em `if`
 * por coincidencia -- 0 e falsy --, mas o contrato da API diz booleano, e
 * `"ativo": 1` obriga quem consome a saber desse detalhe do banco.
 */
export const booleano = (valor) => (valor === null || valor === undefined ? null : Boolean(valor));

/** Aplica `booleano` nos campos indicados de uma linha. */
export function comBooleanos(linha, ...campos) {
  if (!linha) return linha;
  const copia = { ...linha };
  for (const campo of campos) {
    if (campo in copia) copia[campo] = booleano(copia[campo]);
  }
  return copia;
}
