/**
 * Conversa com a API.
 *
 * Um lugar só para ler o contrato de erro { erro, campo } e transformá-lo em
 * exceção com mensagem apresentável. Assim nenhuma tela precisa checar
 * response.ok, e nenhuma tela mostra "[object Object]" quando algo dá errado.
 */

const BASE = '/api';

export class ErroApi extends Error {
  constructor(mensagem, status, campo) {
    super(mensagem);
    this.status = status;
    this.campo = campo;
  }
}

async function chamar(metodo, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(BASE + caminho, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    // fetch só rejeita por falha de rede — o servidor não respondeu
    throw new ErroApi('Sem resposta do servidor. Ele está rodando?', 0);
  }

  if (resposta.status === 204) return null;

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    /* resposta sem corpo JSON */
  }

  if (!resposta.ok) {
    throw new ErroApi(
      dados?.erro ?? `Erro ${resposta.status} do servidor.`,
      resposta.status,
      dados?.campo
    );
  }
  return dados;
}

/** Monta querystring ignorando o que está vazio. */
export function consulta(parametros = {}) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') busca.set(chave, valor);
  }
  const texto = busca.toString();
  return texto ? `?${texto}` : '';
}

export const api = {
  get: (caminho) => chamar('GET', caminho),
  post: (caminho, corpo) => chamar('POST', caminho, corpo),
  put: (caminho, corpo) => chamar('PUT', caminho, corpo),
  patch: (caminho, corpo) => chamar('PATCH', caminho, corpo),
  del: (caminho) => chamar('DELETE', caminho),

  // atalhos por recurso, para as telas não montarem caminho na mão
  salao: () => chamar('GET', '/salao'),
  comandas: (filtros) => chamar('GET', `/comandas${consulta(filtros)}`),
  comanda: (id) => chamar('GET', `/comandas/${id}`),
  abrirComanda: (dados) => chamar('POST', '/comandas', dados),
  lancarItem: (id, dados) => chamar('POST', `/comandas/${id}/itens`, dados),
  alterarItem: (id, itemId, dados) => chamar('PATCH', `/comandas/${id}/itens/${itemId}`, dados),
  fecharComanda: (id) => chamar('POST', `/comandas/${id}/fechar`),
  cancelarComanda: (id) => chamar('POST', `/comandas/${id}/cancelar`),

  produtos: (filtros) => chamar('GET', `/produtos${consulta(filtros)}`),
  categorias: (filtros) => chamar('GET', `/categorias${consulta(filtros)}`),
  garcons: (filtros) => chamar('GET', `/garcons${consulta(filtros)}`),
  clientes: (filtros) => chamar('GET', `/clientes${consulta(filtros)}`),
  mesas: (filtros) => chamar('GET', `/mesas${consulta(filtros)}`),

  relatorio: (nome, filtros) => chamar('GET', `/relatorios/${nome}${consulta(filtros)}`),
};
