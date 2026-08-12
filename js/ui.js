/**
 * Peças de interface reaproveitadas pelas telas.
 *
 * Sem framework: `el` monta elemento, as telas devolvem nós. É pouca coisa e
 * fica explícito o que vira HTML — o que também impede o erro de interpolar
 * dado do banco dentro de innerHTML.
 */

/** el('div', {class:'x'}, 'texto', outroNo) */
export function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);

  for (const [chave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (chave === 'class') no.className = valor;
    else if (chave === 'dataset') Object.assign(no.dataset, valor);
    else if (chave.startsWith('on')) no.addEventListener(chave.slice(2).toLowerCase(), valor);
    else no.setAttribute(chave, valor === true ? '' : valor);
  }

  for (const filho of filhos.flat()) {
    if (filho === undefined || filho === null || filho === false) continue;
    // string entra como texto, nunca como HTML
    no.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return no;
}

export const limpar = (no) => { no.replaceChildren(); return no; };

/* --- formatação ---------------------------------------------------------- */

export const dinheiro = (valor) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const reais = (valor) => `R$ ${dinheiro(valor)}`;

/** "2026-08-11 22:15:00" -> "22:15". String, sem passar por Date: o servidor já
 *  manda a hora de parede, e converter só criaria chance de errar o fuso. */
export const hora = (carimbo) => (carimbo ? String(carimbo).slice(11, 16) : '—');

export const dia = (carimbo) => {
  if (!carimbo) return '—';
  const [ano, mes, d] = String(carimbo).slice(0, 10).split('-');
  return `${d}/${mes}/${ano.slice(2)}`;
};

/** 95 -> "1h35"; 42 -> "42min" */
export const duracao = (minutos) => {
  if (minutos === null || minutos === undefined) return '—';
  const m = Number(minutos);
  return m < 60 ? `${m}min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};

const DIAS = {
  Monday: 'seg', Tuesday: 'ter', Wednesday: 'qua', Thursday: 'qui',
  Friday: 'sex', Saturday: 'sáb', Sunday: 'dom',
};
export const diaSemana = (nome) => DIAS[nome] ?? nome ?? '';

/* --- componentes --------------------------------------------------------- */

export const carimbo = (estado, texto) =>
  el('span', { class: `carimbo ${estado}` }, texto ?? estado);

export const rotulo = (texto) => el('span', { class: 'rotulo' }, texto);

/** Um número do placar de balcão: pequeno, tabular, em linha. */
export const numeroPlacar = (nome, valor) =>
  el('div', {}, rotulo(nome), el('span', { class: 'valor' }, valor));

export const aviso = (mensagem) => el('p', { class: 'aviso', role: 'alert' }, mensagem);

/** Tela vazia com o ícone da casa e uma frase que convida. */
export function vazio(mensagem) {
  const caixa = el('div', { class: 'vazio' });
  caixa.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4.5 9.4C4.1 6.4 6.3 3.2 10.3 1.5c4 1.7 6.2 4.9 5.8 7.9"/>
    <path d="M4.3 9.4h12"/>
    <path d="M5.2 9.4v9.9a1.7 1.7 0 0 0 1.7 1.7h6.8a1.7 1.7 0 0 0 1.7-1.7V9.4"/>
    <path d="M15.4 11.9h2.3a1.8 1.8 0 0 1 1.8 1.8v2.2a1.8 1.8 0 0 1-1.8 1.8h-2.3"/></svg>`;
  caixa.append(el('p', {}, mensagem));
  return caixa;
}

/** Espera 250ms de silêncio antes de chamar. Mata o bug 9.3-11, em que cada
 *  tecla digitada na busca disparava uma requisição. */
export function debounce(fn, espera = 250) {
  let marcador;
  return (...args) => {
    clearTimeout(marcador);
    marcador = setTimeout(() => fn(...args), espera);
  };
}

/** Campo de busca já com debounce e rótulo. */
export function campoBusca(placeholder, aoBuscar) {
  return el('label', { class: 'cresce' },
    rotulo('buscar'),
    el('input', {
      type: 'search', placeholder,
      oninput: debounce((evento) => aoBuscar(evento.target.value)),
    })
  );
}

/**
 * O total contando até o novo valor — uma das duas animações do sistema.
 * Respeita prefers-reduced-motion escrevendo o valor final direto.
 */
export function contarAte(no, alvo, duracaoMs = 300) {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const de = Number(no.dataset.valor ?? 0);
  const para = Number(alvo ?? 0);
  no.dataset.valor = String(para);

  if (reduzido || de === para) {
    no.textContent = reais(para);
    return;
  }

  const inicio = performance.now();
  let terminou = false;

  const fixar = () => {
    if (terminou) return;
    terminou = true;
    no.textContent = reais(para);
  };

  const passo = (agora) => {
    if (terminou) return;
    const t = Math.min(1, (agora - inicio) / duracaoMs);
    if (t >= 1) return fixar();
    // desaceleração simples: o número chega e para, sem quicar
    no.textContent = reais(de + (para - de) * (1 - (1 - t) ** 3));
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);

  // Rede de segurança: requestAnimationFrame para de disparar em aba oculta e
  // pode ser estrangulado pelo navegador. Sem isto, a animação congela no meio
  // e o total fica mostrando um valor que NÃO é o da conta -- foi exatamente o
  // que apareceu no primeiro print desta tela: itens somando R$ 106,00 e o
  // parcial parado em R$ 103,80. Número de conta de bar não pode ser aproximado.
  setTimeout(fixar, duracaoMs + 80);
}

/** Confirmação curta, em português de bar. */
export const confirmar = (pergunta) => window.confirm(pergunta);

/**
 * Formulário em diálogo nativo.
 *
 * <dialog> em vez de prompt(): a versão anterior editava tudo por prompt() em
 * sequência — um por campo, sem rótulo, sem validação, sem como cancelar no
 * meio. O elemento nativo já traz Escape para fechar, foco preso dentro e fundo
 * bloqueado, sem uma linha de biblioteca.
 *
 * campos: [{ nome, etiqueta, tipo, valor, opcoes, obrigatorio, min, max, passo }]
 * Devolve os valores, ou null se a pessoa desistiu.
 */
export function formulario({ titulo, campos, acao = 'Salvar' }) {
  return new Promise((resolver) => {
    const controles = {};

    const linhas = campos.map((campo) => {
      let controle;
      if (campo.tipo === 'select') {
        controle = el('select', { name: campo.nome },
          ...(campo.opcoes ?? []).map((o) =>
            el('option', { value: o.valor, selected: String(o.valor) === String(campo.valor ?? '') }, o.texto)
          )
        );
      } else if (campo.tipo === 'checkbox') {
        controle = el('input', { type: 'checkbox', name: campo.nome, checked: !!campo.valor });
      } else {
        controle = el('input', {
          type: campo.tipo ?? 'text',
          name: campo.nome,
          value: campo.valor ?? '',
          required: campo.obrigatorio,
          min: campo.min,
          max: campo.max,
          step: campo.passo,
          placeholder: campo.dica,
        });
      }
      controles[campo.nome] = controle;

      return campo.tipo === 'checkbox'
        ? el('label', { class: 'linha-caixa' }, controle, el('span', {}, campo.etiqueta))
        : el('label', {}, rotulo(campo.etiqueta), controle);
    });

    const erro = el('div', {});

    const dialogo = el('dialog', { class: 'dialogo' },
      el('form', {
        method: 'dialog',
        onsubmit: (evento) => {
          evento.preventDefault();
          const valores = {};
          for (const campo of campos) {
            const controle = controles[campo.nome];
            valores[campo.nome] = campo.tipo === 'checkbox' ? controle.checked : controle.value.trim();
          }
          const faltando = campos.find((c) => c.obrigatorio && !valores[c.nome]);
          if (faltando) {
            limpar(erro).append(aviso(`Informe ${faltando.etiqueta}.`));
            controles[faltando.nome].focus();
            return;
          }
          dialogo.close();
          resolver(valores);
        },
      },
        el('h3', {}, titulo),
        erro,
        el('div', { class: 'campos' }, ...linhas),
        el('div', { class: 'acoes-dialogo' },
          el('button', { type: 'button', onclick: () => { dialogo.close(); resolver(null); } }, 'Deixar assim'),
          el('button', { type: 'submit', class: 'primario' }, acao)
        )
      )
    );

    dialogo.addEventListener('close', () => dialogo.remove());
    dialogo.addEventListener('cancel', () => resolver(null));
    document.body.append(dialogo);
    dialogo.showModal();
    controles[campos[0]?.nome]?.focus();
  });
}

/** Mostra o erro da API no lugar certo da tela, sem derrubar o resto. */
export function mostrarErro(container, erro) {
  const anterior = container.querySelector('.aviso');
  if (anterior) anterior.remove();
  container.prepend(aviso(erro?.message ?? 'Algo deu errado.'));
}
