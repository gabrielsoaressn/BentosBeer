/**
 * Roteador por hash e navegação.
 *
 * Hash e não History API: o servidor serve um arquivo estático só, e link com
 * hash sobrevive a recarregar a página sem precisar de rota coringa no Express.
 */
// Antes de tudo: em github.io (ou com ?demo=1) este import instala a camada que
// responde no lugar do servidor. Em localhost com servidor de pé, não faz nada.
import './demo.js';

import { montarSalao } from './telas/salao.js';
import { montarListaComandas, montarComanda } from './telas/comanda.js';
import { montarCardapio } from './telas/cardapio.js';
import { montarEquipe } from './telas/equipe.js';
import { montarClientes, montarMesas } from './telas/clientes.js';
import { montarRelatorios } from './telas/relatorios.js';
import { el, limpar, mostrarErro } from './ui.js';

const TELAS = [
  { rota: 'salao', nome: 'Salão', montar: montarSalao },
  { rota: 'comandas', nome: 'Comandas', montar: montarListaComandas },
  { rota: 'cardapio', nome: 'Cardápio', montar: montarCardapio },
  { rota: 'equipe', nome: 'Equipe', montar: montarEquipe },
  { rota: 'clientes', nome: 'Clientes', montar: montarClientes },
  { rota: 'mesas', nome: 'Mesas', montar: montarMesas },
  { rota: 'relatorios', nome: 'Relatórios', montar: montarRelatorios },
];

const conteudo = document.getElementById('conteudo');
const menu = document.getElementById('menu');

// menu
for (const tela of TELAS) {
  menu.append(el('a', { href: `#${tela.rota}`, dataset: { rota: tela.rota } }, tela.nome));
}

function marcarAtual(rota) {
  for (const link of menu.querySelectorAll('a')) {
    if (link.dataset.rota === rota) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function navegar() {
  const [rota, argumento] = (location.hash.slice(1) || 'salao').split('/');

  // #comanda/62 abre uma comanda direto, para poder ser guardado como link.
  // Nao entra no menu: e atalho, nao secao.
  if (rota === 'comanda' && argumento) {
    marcarAtual('comandas');
    document.title = `Comanda ${argumento} · Bento's Beer`;
    limpar(conteudo);
    try {
      await montarComanda(conteudo, Number(argumento));
    } catch (erro) {
      mostrarErro(conteudo, erro);
    }
    return;
  }

  const tela = TELAS.find((t) => t.rota === rota) ?? TELAS[0];

  marcarAtual(tela.rota);
  document.title = `${tela.nome} · Bento's Beer`;
  limpar(conteudo);

  try {
    await tela.montar(conteudo);
  } catch (erro) {
    mostrarErro(conteudo, erro);
  }
  // foco no conteúdo, para quem navega por teclado não recomeçar do menu
  conteudo.focus({ preventScroll: true });
}

window.addEventListener('hashchange', navegar);
navegar();
