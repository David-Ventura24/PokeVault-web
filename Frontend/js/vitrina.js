/**
 * Vitrina: anillo 3D de las piezas de la tienda + rail de espera + ficha de
 * detalle. Es la traducción literal de components/Vitrina.tsx: mismas curvas
 * (KX/KF/KH/KB/KO), mismo muelle exponencial y mismo trato del puntero, solo
 * que en vez de refs de React seConsultan los nodos que generamos arriba.
 */
import { cartaHtml, montarFicha, railCardHtml } from './carta.js';
import { agregarAlCarrito } from './carrito.js';

const KX = [1.2, 0.744, 0.496, 0.346, 0.235, 0.15, 0.085];
const KF = [1.14, 0.89, 0.777, 0.704, 0.651, 0.616, 0.59];
const KH = [1.18, 0.832, 0.574, 0.436, 0.334, 0.258, 0.19];
const KB = [0, 0, 1.5, 4, 8, 12, 17];
const KO = [1, 1, 1, 1, 0.86, 0.5, 0];
const R = 0.7;

const aprieta = (x, a, b) => Math.min(b, Math.max(a, x));
const envuelve = (x, n) => ((x % n) + n) % n;

const CUERPO = productos => `<div class="runway-grid">
  <section class="stage" aria-label="Estantería 3D de cartas TCG" tabindex="0" id="escenario">
    <div class="stage-pista" id="pista">${productos.map(p => cartaHtml(p)).join('')}</div>
    <div class="intro">
      <h2 class="font-title">Colección Pokémon GO</h2>
      <p>Un recorrido inmersivo en 3D por las piezas más exclusivas. Toca una carta para ver precio, stock, certificadora y grado.</p>
    </div>
    <div class="tag">
      <div class="look font-title" aria-live="polite">
        <span>Pieza</span>
        <span class="win"><span class="roll" id="rotulos">${Array.from({ length: Math.max(1, productos.length) + 1 }, (_, i) => `<b>${i + 1}</b>`).join('')}</span></span>
      </div>
      <button class="shop-btn font-title" type="button" id="anadir-frontal">Añadir a Pokédex</button>
      <p class="hint">Arrastra, usa las flechas o toca la carta para verla en grande.</p>
    </div>
    <div class="ring" id="anillo" aria-hidden="true"></div>
  </section>
  <aside class="rail" id="rail" aria-label="Piezas de la vitrina">${productos.map((p, i) => railCardHtml(p, i)).join('')}</aside>
</div>`;

/**
 * Monta la vitrina dentro de `<section class="runway">`. Devuelve false si no
 * hay catálogo, para que la página pinte su propio aviso.
 */
export function montarVitrina({ ancla, productos, aviso }) {
  const n = productos.length;
  if (!n) return false;

  ancla.innerHTML = CUERPO(productos);

  const stage = ancla.querySelector('#escenario');
  const line = ancla.querySelector('#pista');
  const ring = ancla.querySelector('#anillo');
  const rail = ancla.querySelector('#rail');
  const roll = ancla.querySelector('#rotulos');

  const m = {
    W: 0, H: 0, base: 0, cardS: 0, lado: false, sucio: true,
    pos: 0, destino: 0, previo: 0, mx: 0, my: 0, cx: 0, cy: 0,
    abajo: false, x0: 0, t0: 0, movido: 0, visible: true
  };

  const nodos = Array.from(line.querySelectorAll('.m'));
  const piezas = Array.from(rail.querySelectorAll('.card'));
  const difuso = nodos.map(() => '');
  const opaco = nodos.map(() => '');
  const orden = productos.map((_, i) => i);
  const M = orden.length;

  nodos.forEach((el, i) => { el.dataset.i = String(i); });

  let fichaAbierta = false;

  const frontal = () => productos[aprieta(Math.round(envuelve(m.destino, n)), 0, n - 1)] ?? null;

  const anadir = p => { if (p) aviso(agregarAlCarrito(p).mensaje); };

  const abrirFicha = p => {
    fichaAbierta = true;
    montarFicha({ ancla, producto: p, aviso, canal: aviso, alCerrar: () => { fichaAbierta = false; } });
  };

  const TIRON = () => Math.max(150, m.W * 0.2);
  const quieta = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  const tamano = () => {
    m.W = stage.clientWidth;
    m.H = stage.clientHeight;
    m.base = m.H * 1.2;
    m.lado = window.innerWidth <= 820;
    nodos.forEach(el => {
      el.style.width = m.base * R + 'px';
      el.style.height = m.base + 'px';
    });
    m.cardS = m.lado ? 150 : rail.clientHeight / 3;
    piezas.forEach(el => { el.style.height = m.lado ? '100%' : m.cardS + 'px'; });
    m.sucio = true;
  };

  const pinta = () => {
    nodos.forEach((el, mi) => {
      const pos = orden.indexOf(mi);
      if (pos < 0) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      let d = envuelve(pos - m.pos, M);
      if (d > M - 1) d -= M;
      const k = aprieta(d + 1, 0, 6);
      const a = Math.floor(k);
      const b = Math.min(6, a + 1);
      const t = k - a;
      const mezcla = A => A[a] + (A[b] - A[a]) * t;

      const h = mezcla(KH) * m.H;
      const s = h / m.base;
      const w = h * R;
      const x = mezcla(KX) * m.W - w / 2;
      const y = mezcla(KF) * m.H - h;

      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
      const f = mezcla(KB) / s;
      const fijo = f < 0.2 ? 'none' : `blur(${f.toFixed(1)}px)`;
      const op = mezcla(KO).toFixed(3);
      if (fijo !== difuso[mi]) { difuso[mi] = fijo; el.style.filter = fijo; }
      if (op !== opaco[mi]) { opaco[mi] = op; el.style.opacity = op; }
      el.style.zIndex = String(100 - Math.round(d * 10));
      el.style.pointerEvents = d <= 5 ? 'auto' : 'none';
    });

    const frente = aprieta(Math.round(envuelve(m.pos, M)), 0, M - 1);
    const carril = m.lado ? rail.clientWidth : rail.clientHeight;
    piezas.forEach((el, i) => {
      const y = carril / 2 - m.cardS / 2 + (i - frente) * m.cardS;
      el.classList.toggle('activo', i === frente);
      el.style.transform = m.lado
        ? `translate3d(${y.toFixed(1)}px,0,0)`
        : `translate3d(0,${y.toFixed(1)}px,0)`;
    });

    const primera = roll.firstElementChild;
    if (primera) {
      roll.style.transform = `translate3d(0,${(-envuelve(m.pos, M) * primera.offsetHeight).toFixed(1)}px,0)`;
    }
  };

  const paso = now => {
    const dt = Math.min(50, now - m.previo) || 16;
    m.previo = now;
    const antes = m.pos;

    if (quieta) m.pos = m.destino;
    else m.pos += (m.destino - m.pos) * (1 - Math.exp(-dt * 0.0072));

    if (Math.abs(m.destino - m.pos) < 0.0004) m.pos = m.destino;
    if (m.pos !== antes || m.sucio) {
      m.sucio = false;
      pinta();
    }

    m.cx += (m.mx - m.cx) * 0.32;
    m.cy += (m.my - m.cy) * 0.32;
    ring.style.transform = `translate3d(${m.cx.toFixed(1)}px,${m.cy.toFixed(1)}px,0)`;
  };

  const bucle = t => {
    paso(t);
    requestAnimationFrame(bucle);
  };

  const entra = e => { if (e.pointerType === 'mouse') ring.classList.add('show'); };
  const sale = () => ring.classList.remove('show');

  const mueve = e => {
    const r = stage.getBoundingClientRect();
    m.mx = e.clientX - r.left;
    m.my = e.clientY - r.top;
    if (!m.abajo) {
      const encima = document
        .elementsFromPoint(e.clientX, e.clientY)
        .some(x => x.classList && x.classList.contains('m'));
      ring.classList.toggle('pick', encima);
      return;
    }
    const dx = e.clientX - m.x0;
    m.movido = Math.max(m.movido, Math.abs(dx));
    m.destino = m.t0 + dx / TIRON();
  };

  const baja = e => {
    if (e.target.closest('button')) return;
    m.abajo = true;
    m.x0 = e.clientX;
    m.t0 = m.destino;
    m.movido = 0;
    stage.setPointerCapture(e.pointerId);
    ring.classList.add('drag');
  };

  const suelta = e => {
    if (!m.abajo) return;
    m.abajo = false;
    ring.classList.remove('drag');
    const golpe = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find(x => x.classList && x.classList.contains('m'));

    if (m.movido < 6) {
      if (golpe) {
        const i = Number(golpe.dataset.i);
        if (Number.isFinite(i)) {
          let d = envuelve(orden.indexOf(i) - m.destino, M);
          d = Math.round(d);
          if (d > 0 && d < M) m.destino = Math.round(m.destino) + d;
          abrirFicha(productos[i]);
        }
      }
    } else {
      m.destino = Math.round(m.destino);
    }
  };

  let rueda = 0;
  const rode = e => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
    if (!dx) return;
    e.preventDefault();
    m.destino += aprieta(dx, -120, 120) / 420;
    clearTimeout(rueda);
    rueda = window.setTimeout(() => { m.destino = Math.round(m.destino); }, 150);
  };

  const teclas = e => {
    if (fichaAbierta) return;
    if (!m.visible || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      m.destino = aprieta(Math.round(m.destino) + 1, 0, M - 1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      m.destino = aprieta(Math.round(m.destino) - 1, 0, M - 1);
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === stage) {
      e.preventDefault();
      abrirFicha(productos[orden[aprieta(Math.round(envuelve(m.destino, M)), 0, M - 1)] ?? 0]);
    }
  };

  rail.addEventListener('click', e => {
    const corazon = e.target.closest('.fav');
    if (corazon) {
      corazon.setAttribute('aria-pressed', String(corazon.getAttribute('aria-pressed') !== 'true'));
      return;
    }
    const tarjeta = e.target.closest('.card');
    if (!tarjeta) return;
    const p = productos[Number(tarjeta.dataset.i)];
    if (!p) return;
    if (e.target.closest('.add')) {
      anadir(p);
      return;
    }
    m.destino = Number(tarjeta.dataset.i);
    abrirFicha(p);
  });

  ancla.querySelector('#anadir-frontal').addEventListener('click', () => anadir(frontal()));

  const observador = new IntersectionObserver(en => { m.visible = en[0].isIntersecting; }, { threshold: 0.3 });
  const medidor = new ResizeObserver(() => tamano());

  stage.addEventListener('pointerenter', entra);
  stage.addEventListener('pointerleave', sale);
  stage.addEventListener('pointermove', mueve);
  stage.addEventListener('pointerdown', baja);
  stage.addEventListener('pointerup', suelta);
  stage.addEventListener('pointercancel', suelta);
  stage.addEventListener('wheel', rode, { passive: false });
  window.addEventListener('resize', tamano);
  window.addEventListener('keydown', teclas);
  observador.observe(stage);
  medidor.observe(stage);
  medidor.observe(rail);

  tamano();
  pinta();
  requestAnimationFrame(bucle);
  if (document.fonts) {
    document.fonts.ready.then(() => { tamano(); pinta(); });
  }
  return true;
}
