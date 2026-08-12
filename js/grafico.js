/**
 * Gráfico de barras em canvas puro. Sem Chart.js, sem D3 — são barras, eixo e
 * rótulos, e a biblioteca custaria mais bytes que o bar inteiro.
 *
 * Dois cuidados que fazem diferença no resultado:
 *
 *   - escala por devicePixelRatio, senão o traço fica borrado em tela retina;
 *   - as cores vêm dos tokens CSS via getComputedStyle, então o gráfico não
 *     duplica a paleta em hex e não sai do sistema se um token mudar.
 */

const token = (nome) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{rotulo:string, valor:number, sub?:string}[]} dados
 */
export function barras(canvas, dados, { altura = 190 } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const largura = canvas.clientWidth || canvas.parentElement.clientWidth || 600;

  canvas.width = Math.round(largura * dpr);
  canvas.height = Math.round(altura * dpr);
  canvas.style.height = `${altura}px`;

  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, largura, altura);

  const cores = {
    barra: token('--amber'),
    borda: token('--amber-ink'),
    fio: token('--line'),
    tinta: token('--ink'),
    fraco: token('--muted'),
  };

  const margem = { topo: 16, baixo: 30, esquerda: 46, direita: 6 };
  const areaL = largura - margem.esquerda - margem.direita;
  const areaA = altura - margem.topo - margem.baixo;

  if (!dados.length) {
    c.fillStyle = cores.fraco;
    c.font = `12px ${token('--ui') || 'sans-serif'}`;
    c.textAlign = 'center';
    c.fillText('Sem movimento no período.', largura / 2, altura / 2);
    return;
  }

  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  // teto "redondo" para a régua não terminar em número quebrado
  const passo = 10 ** Math.floor(Math.log10(maximo));
  const teto = Math.ceil(maximo / passo) * passo;

  // régua horizontal: três linhas, fio fino, rótulo em monoespaçada
  c.font = `10px ${token('--numero') || 'monospace'}`;
  c.textBaseline = 'middle';
  for (let i = 0; i <= 2; i++) {
    const valor = (teto / 2) * i;
    const y = margem.topo + areaA - (valor / teto) * areaA;
    c.strokeStyle = cores.fio;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(margem.esquerda, Math.round(y) + 0.5);
    c.lineTo(margem.esquerda + areaL, Math.round(y) + 0.5);
    c.stroke();

    c.fillStyle = cores.fraco;
    c.textAlign = 'right';
    c.fillText(valor >= 1000 ? `${Math.round(valor / 1000)}k` : String(Math.round(valor)),
      margem.esquerda - 6, y);
  }

  // barras
  const vao = areaL / dados.length;
  const larguraBarra = Math.max(2, Math.min(26, vao * 0.62));

  dados.forEach((d, i) => {
    const alturaBarra = (d.valor / teto) * areaA;
    const x = margem.esquerda + vao * i + (vao - larguraBarra) / 2;
    const y = margem.topo + areaA - alturaBarra;

    c.fillStyle = cores.barra;
    c.fillRect(Math.round(x), Math.round(y), Math.round(larguraBarra), Math.round(alturaBarra));
    c.strokeStyle = cores.borda;
    c.lineWidth = 1;
    c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5,
      Math.round(larguraBarra) - 1, Math.round(alturaBarra) - 1);
  });

  // linha do eixo, mais forte que a régua
  c.strokeStyle = cores.tinta;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(margem.esquerda, margem.topo + areaA + 0.5);
  c.lineTo(margem.esquerda + areaL, margem.topo + areaA + 0.5);
  c.stroke();

  // rótulos do eixo: só os que couberem, para não virar borrão
  const cada = Math.ceil(dados.length / Math.max(1, Math.floor(areaL / 42)));
  c.fillStyle = cores.fraco;
  c.textAlign = 'center';
  c.font = `10px ${token('--numero') || 'monospace'}`;
  dados.forEach((d, i) => {
    if (i % cada !== 0 && i !== dados.length - 1) return;
    const x = margem.esquerda + vao * i + vao / 2;
    c.fillText(d.rotulo, x, margem.topo + areaA + 11);
    if (d.sub) c.fillText(d.sub, x, margem.topo + areaA + 22);
  });
}

/** Redesenha quando a largura muda, sem redesenhar a cada pixel de scroll. */
export function acompanharLargura(canvas, redesenhar) {
  if (!window.ResizeObserver) return;
  let ultima = 0;
  const observador = new ResizeObserver((entradas) => {
    const largura = Math.round(entradas[0].contentRect.width);
    if (largura && Math.abs(largura - ultima) > 8) {
      ultima = largura;
      redesenhar();
    }
  });
  observador.observe(canvas.parentElement ?? canvas);
  return observador;
}
