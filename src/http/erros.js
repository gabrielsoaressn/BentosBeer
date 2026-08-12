/**
 * Erro em um lugar so.
 *
 * Repositorio e rota apenas lancam: `throw new AppError(404, 'Comanda nao
 * encontrada')`. Nenhum dos dois tem try/catch. O middleware do fim da cadeia
 * traduz qualquer coisa que chegue nele para o contrato de erro da API:
 *
 *     { "erro": "Essa mesa ja tem uma comanda aberta.", "campo": "mesaId" }
 *
 * Detalhe tecnico nunca vaza para o cliente: vai para o console com um id de
 * correlacao, e o cliente recebe o mesmo id para citar quando for reclamar.
 */
import { randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(status, mensagem, campo) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.campo = campo;
  }
}

/** Envolve handler async para que a rejeicao chegue ao middleware de erro. */
export function rota(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// ---------------------------------------------------------------------------
//  Traducao de erro do MySQL para mensagem de gente
// ---------------------------------------------------------------------------

// Chave UNIQUE que estourou -> o que dizer ao usuario.
const POR_INDICE_UNICO = {
  uq_mesa_ocupada:   [409, 'Essa mesa já tem uma comanda aberta.', 'mesaId'],
  uq_mesa_numero:    [409, 'Já existe uma mesa com esse número.', 'numero'],
  uq_produto_nome:   [409, 'Já existe um produto com esse nome.', 'nome'],
  uq_categoria_nome: [409, 'Já existe uma categoria com esse nome.', 'nome'],
};

// Chave estrangeira que impediu o DELETE -> quem ainda referencia o registro.
const POR_FK_REFERENCIADA = {
  fk_produto_categoria: 'Essa categoria ainda tem produtos no cardápio.',
  fk_comanda_mesa:      'Essa mesa já tem comandas no histórico.',
  fk_comanda_garcom:    'Esse garçom já tem comandas no histórico.',
  fk_comanda_cliente:   'Esse cliente já tem comandas no histórico.',
  fk_item_produto:      'Esse produto já foi vendido em alguma comanda.',
  fk_item_comanda:      'Essa comanda ainda tem itens lançados.',
};

// Chave estrangeira apontando para pai inexistente -> o que faltou.
const POR_FK_ORFA = {
  fk_comanda_mesa:      ['Mesa não encontrada.', 'mesaId'],
  fk_comanda_garcom:    ['Garçom não encontrado.', 'garcomId'],
  fk_comanda_cliente:   ['Cliente não encontrado.', 'clienteId'],
  fk_item_produto:      ['Produto não encontrado.', 'produtoId'],
  fk_item_comanda:      ['Comanda não encontrada.', 'comandaId'],
  fk_produto_categoria: ['Categoria não encontrada.', 'categoriaId'],
};

// CHECK violado -> qual regra o usuario furou.
const POR_CHECK = {
  ck_item_qtd:           [400, 'Quantidade tem que ser maior que zero.', 'qtd'],
  ck_item_preco:         [400, 'Preço não pode ser negativo.', 'preco'],
  ck_produto_preco:      [400, 'Preço não pode ser negativo.', 'preco'],
  ck_mesa_numero:        [400, 'Número da mesa tem que ser maior que zero.', 'numero'],
  ck_mesa_lugares:       [400, 'Mesa tem de 1 a 20 lugares.', 'lugares'],
  ck_cliente_nome:       [400, 'Nome precisa de pelo menos duas letras.', 'nome'],
  ck_garcom_nome:        [400, 'Nome precisa de pelo menos duas letras.', 'nome'],
  ck_comanda_fechamento: [409, 'Estado da comanda não combina com a hora de fechamento.'],
};

// Mensagens dos SIGNAL do banco (trigger e procedure). Chegam sem acento, para
// o arquivo .sql rodar igual em qualquer cliente; a versao apresentavel e aqui.
const POR_SIGNAL = {
  'Comanda inexistente':                    [404, 'Comanda não encontrada.'],
  'Comanda nao esta aberta':                [409, 'Essa comanda não está aberta.'],
  'Comanda ja foi encerrada':               [409, 'Essa comanda já foi encerrada.'],
  'Nao ha mesa livre para abrir comanda':   [409, 'Não há mesa livre no salão.'],
};

// Banco fora do ar, em qualquer das formas que isso aparece.
const BANCO_INDISPONIVEL = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH',
  'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ER_ACCESS_DENIED_ERROR',
]);

/** Extrai o nome do indice de: Duplicate entry '8' for key 'comanda.uq_mesa_ocupada' */
function indiceDoErro(mensagem = '') {
  const achado = /for key '(?:.*\.)?([^']+)'/.exec(mensagem);
  return achado?.[1];
}

/** Extrai o nome da constraint de: CONSTRAINT `fk_produto_categoria` FOREIGN KEY */
function fkDoErro(mensagem = '') {
  const achado = /CONSTRAINT `([^`]+)`/.exec(mensagem);
  return achado?.[1];
}

/** Extrai o nome da constraint de: Check constraint 'ck_item_qtd' is violated. */
function checkDoErro(mensagem = '') {
  const achado = /Check constraint '([^']+)'/.exec(mensagem);
  return achado?.[1];
}

/**
 * Converte erro do driver em AppError. Devolve null quando nao reconhece --
 * ai o middleware trata como 500 e registra a coisa inteira no log.
 */
export function traduzErroMysql(erro) {
  const mensagem = erro.sqlMessage ?? erro.message ?? '';

  if (BANCO_INDISPONIVEL.has(erro.code)) {
    return new AppError(503, 'Banco de dados indisponível. Tente de novo em instantes.');
  }
  if (erro.code === 'ER_BAD_DB_ERROR') {
    return new AppError(503, 'O banco de dados ainda não foi criado. Rode: npm run db:reset');
  }
  if (erro.code === 'ER_NO_SUCH_TABLE') {
    return new AppError(503, 'O banco está sem as tabelas. Rode: npm run db:reset');
  }
  if (erro.code === 'ER_LOCK_WAIT_TIMEOUT' || erro.code === 'ER_LOCK_DEADLOCK') {
    return new AppError(409, 'Outra pessoa está mexendo nesse registro agora. Tente de novo.');
  }

  if (erro.code === 'ER_DUP_ENTRY') {
    const regra = POR_INDICE_UNICO[indiceDoErro(mensagem)];
    return regra
      ? new AppError(regra[0], regra[1], regra[2])
      : new AppError(409, 'Esse registro já existe.');
  }

  if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
    const explicacao = POR_FK_REFERENCIADA[fkDoErro(mensagem)];
    return new AppError(
      409,
      explicacao ?? 'Esse registro está em uso por outro e não pode ser removido.'
    );
  }

  if (erro.code === 'ER_NO_REFERENCED_ROW_2' || erro.code === 'ER_NO_REFERENCED_ROW') {
    const regra = POR_FK_ORFA[fkDoErro(mensagem)];
    return regra
      ? new AppError(404, regra[0], regra[1])
      : new AppError(400, 'Um dos registros informados não existe.');
  }

  if (erro.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    const regra = POR_CHECK[checkDoErro(mensagem)];
    return regra
      ? new AppError(regra[0], regra[1], regra[2])
      : new AppError(400, 'Os dados enviados não respeitam uma regra do banco.');
  }

  // SIGNAL vindo de trigger ou procedure
  if (erro.sqlState === '45000') {
    const regra = POR_SIGNAL[mensagem.trim()];
    return regra ? new AppError(regra[0], regra[1]) : new AppError(409, mensagem);
  }

  if (erro.code === 'ER_DATA_TOO_LONG') {
    return new AppError(400, 'Um dos textos enviados é longo demais.');
  }
  if (erro.code === 'ER_TRUNCATED_WRONG_VALUE' || erro.code === 'WARN_DATA_TRUNCATED') {
    return new AppError(400, 'Um dos valores enviados está em formato inválido.');
  }

  return null;
}

/** Middleware final. Precisa ser o ultimo `app.use` de todos. */
export function middlewareErro(erro, req, res, _next) {
  const traduzido = erro instanceof AppError ? erro : traduzErroMysql(erro);

  if (traduzido) {
    const corpo = { erro: traduzido.message };
    if (traduzido.campo) corpo.campo = traduzido.campo;

    // 503 e sintoma de infraestrutura, nao de requisicao: vale registrar.
    if (traduzido.status >= 500) {
      console.error(`[${req.method} ${req.originalUrl}] ${erro.code ?? ''} ${erro.message}`);
    }
    return res.status(traduzido.status).json(corpo);
  }

  // Nao reconhecido: o cliente recebe o id, o log recebe o erro inteiro.
  const id = randomUUID().slice(0, 8);
  console.error(`\n[erro ${id}] ${req.method} ${req.originalUrl}`);
  console.error(erro);

  return res.status(500).json({
    erro: `Erro inesperado no servidor. Código de referência: ${id}`,
  });
}

/**
 * 404 para rota de API que nao existe. Vai antes do middleware de erro.
 *
 * originalUrl, e nao path: dentro de um middleware montado em /api, req.path ja
 * vem sem o prefixo, e a mensagem sairia apontando um caminho que nao existe.
 */
export function middlewareRotaInexistente(req, _res, next) {
  next(new AppError(404, `Rota não encontrada: ${req.method} ${req.originalUrl}`));
}
