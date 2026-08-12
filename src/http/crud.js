/**
 * Fabrica de rotas CRUD.
 *
 * Os cinco cadastros -- mesas, clientes, garcons, produtos e categorias --
 * respondem exatamente ao mesmo desenho de rota. Escrever cinco vezes o mesmo
 * router seria trezentas linhas de copia, e foi copia assim que produziu o bug
 * 9.3-8 da versao anterior, onde a mesma funcao apareceu duas vezes no arquivo
 * com assinaturas diferentes.
 *
 * O que varia de cadastro para cadastro -- o SQL e as regras de validacao --
 * fica visivel no repositorio e no arquivo de rota de cada um. O que nao varia
 * mora aqui.
 *
 * Nenhuma rota tem SQL e nenhuma tem try/catch: erro sobe para o middleware.
 */
import express from 'express';
import { rota, AppError } from './erros.js';
import { v, validar } from './validate.js';

export function rotasCrud({ repo, criar, editar, filtros = {} }) {
  const router = express.Router();

  // "Mesa nao encontrado" nao e portugues. Cada repositorio declara o genero do
  // proprio nome e a mensagem concorda.
  const naoEncontrado = () =>
    new AppError(404, `${repo.nome} não ${repo.genero === 'f' ? 'encontrada' : 'encontrado'}.`);

  // GET /            lista, com ?busca= e os filtros proprios do recurso
  router.get(
    '/',
    rota(async (req, res) => {
      const consulta = validar(req.query, {
        busca: v.texto({ max: 100, obrigatorio: false }),
        ...filtros,
      });
      res.json(await repo.listar(consulta));
    })
  );

  // GET /:id
  router.get(
    '/:id',
    rota(async (req, res) => {
      const registro = await repo.porId(v.id()(req.params.id, 'id'));
      if (!registro) throw naoEncontrado();
      res.json(registro);
    })
  );

  // POST /           devolve o registro criado, e nao so o id -- a tela precisa
  //                  dos campos calculados (situacao da mesa, nome da categoria)
  router.post(
    '/',
    rota(async (req, res) => {
      const id = await repo.criar(validar(req.body, criar));
      res.status(201).json(await repo.porId(id));
    })
  );

  // PUT /:id
  router.put(
    '/:id',
    rota(async (req, res) => {
      const id = v.id()(req.params.id, 'id');
      const dados = validar(req.body, editar ?? criar);

      // Confere a existencia antes de atualizar, em vez de decidir pelo
      // affectedRows do UPDATE: sem a flag FOUND_ROWS, o MySQL conta linhas
      // *alteradas*, entao salvar um registro sem mudar nenhum campo devolveria
      // zero e a rota responderia 404 para um registro que existe.
      if (!(await repo.porId(id))) throw naoEncontrado();

      await repo.editar(id, dados);
      res.json(await repo.porId(id));
    })
  );

  // DELETE /:id      registro em uso volta 409, traduzido pelo middleware a
  //                  partir da chave estrangeira que barrou a remocao
  router.delete(
    '/:id',
    rota(async (req, res) => {
      const removeu = await repo.excluir(v.id()(req.params.id, 'id'));
      if (!removeu) throw naoEncontrado();
      res.json({ ok: true });
    })
  );

  return router;
}

/**
 * Monta a clausula de busca por texto.
 *
 * A versao anterior filtrava no navegador, escondendo com display:none os itens
 * ja renderizados -- o filtro alcancava so o que estava na tela. Aqui o LIKE
 * roda no banco, sobre a tabela inteira, com o termo como parametro.
 */
export function clausulaBusca(busca, ...colunas) {
  if (!busca) return { sql: '', params: [] };
  const condicoes = colunas.map((coluna) => `${coluna} LIKE ?`).join(' OR ');
  return { sql: `(${condicoes})`, params: colunas.map(() => `%${busca}%`) };
}

/** Junta condicoes em um WHERE, ignorando as vazias. */
export function where(...condicoes) {
  const usadas = condicoes.filter(Boolean);
  return usadas.length ? `WHERE ${usadas.join(' AND ')}` : '';
}
