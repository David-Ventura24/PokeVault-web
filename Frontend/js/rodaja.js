/**
 * Ruleta 3D de las cartas de la comunidad (components/CarruselComunidad.tsx).
 * Cintas tangentes a un cilindro con la cámara sobre el eje: todas las cartas
 * miden igual y la profundidad la da el giro y el cantado, no el escalado.
 * Mismas constantes y mismos muelles que la versión de React.
 */
import { cartaHtml, montarFicha } from './carta.js';
import { colorHalo, etiquetaCertificacion, halo } from './halo.js';
import { usd } from './moneda.js';
import { agregarAlCarrito } from './carrito.js';

const CINTAS_OBJETIVO = 36;
const K_ALTO = 0.9;
const K_PROP = 0.72;
const GIRO = 1.9;
const REPOSO = 5000;
const K_SUELTO = 0.0052;
const K_ARRASTRE = 0.018;

const RAD = Math.PI / 180;
const aprieta = (x, a, b) => Math.min(b, Math.max(a, x));
const envuelve = (x, n) => ((x % n) + n) % n;
const angulo = (v, pos, paso) => envuelve((v - pos) * paso + 180, 360) - 180;

const sinAnimacion = () => window.matchMedia('(prefers-reduced-motion:reduce)').matches;

export function montarCarruselComunidad({ ancla, productos, aviso }) {
  const N = Math.max(1, productos.length);
  const copias = aprieta(Math.ceil(CINTAS_OBJETIVO / N), 3, 12);
  const piezas = [];
  for (let c = 0; c < copias; c++) piezas.push(...productos);
  const total = piezas.length;
  if (!total) return false;

  const pintaRotulos = i => {
    const p = productos[aprieta(i, 0, N - 1)];
    if (!p) return;
    ancla.querySelector('#cq-titulo').textContent = p.nombre;
    ancla.querySelector('#cq-serie').textContent = `${p.set} · ${p.numero}`;
    ancla.querySelector('#cq-precio').textContent = usd(p.precio);
    ancla.querySelector('#cq-nota').textContent = etiquetaCertificacion(p);
    const vendedor = ancla.querySelector('#cq-vendedor');
    vendedor.textContent = p.vendedorNombre ?? '';
    vendedor.hidden = !p.vendedorNombre;
    ancla.querySelectorAll('#cq-anadir, #cq-ficha').forEach(b => { b.dataset.i = String(i); });
  };

  ancla.innerHTML = `<div class="cq">
  <div class="cq-anaquel" id="cq-anaquel" tabindex="0" aria-label="Ruleta de cartas de la comunidad. Usa las flechas del teclado.">
    <div class="cq-lista" id="cq-lista">${piezas.map(p =>
      `<div class="cq-cinta" data-v="${0}" style="--gl:${halo(p).toFixed(2)};--glc:${colorHalo(p)}"><span class="cq-cv">${cartaHtml(p)}</span></div>`
    ).join('')}</div>
  </div>
  <div class="cq-pie">
    <button class="cq-flecha" type="button" aria-label="Pieza anterior" id="cq-antes">
      <svg viewBox="0 0 18 10" aria-hidden="true"><path d="M12 1 8 5l4 4M8 5h9"/></svg>
    </button>
    <div class="cq-rotulos" aria-live="polite">
      <span class="cq-mascara"><span class="cq-titulo font-title" id="cq-titulo"></span></span>
      <span class="cq-mascara"><span class="cq-serie" id="cq-serie"></span></span>
      <span class="cq-mascara"><span class="cq-linea" id="cq-linea">
        <b class="cq-precio" id="cq-precio"></b>
        <span class="cq-nota" id="cq-nota"></span>
        <span class="cq-vendedor" id="cq-vendedor" hidden></span>
      </span></span>
    </div>
    <button class="cq-flecha" type="button" aria-label="Pieza siguiente" id="cq-despues">
      <svg viewBox="0 0 18 10" aria-hidden="true"><path d="M6 1l4 4-4 4M10 5H1"/></svg>
    </button>
  </div>
  <div class="cq-acts">
    <button class="btn-rojo" type="button" id="cq-anadir">Añadir a mi Pokédex</button>
    <button class="btn-line" type="button" id="cq-ficha">Ver la ficha completa</button>
  </div>
  <p class="cq-pista">La ruleta gira sola; se detiene si pasas el puntero. Toca una carta lateral para ponerla de frente y toca la del centro para verla completa.</p>
</div>`;

  /* las cintas se generaron con el surtido repetido: se numeran en orden */
  ancla.querySelectorAll('.cq-cinta').forEach((el, v) => { el.dataset.v = String(v); });

  const anaquel = ancla.querySelector('#cq-anaquel');
  const lista = ancla.querySelector('#cq-lista');
  const cintas = Array.from(lista.querySelectorAll('.cq-cinta'));
  const caras = cintas.map(el => el.querySelector('.cq-cv'));
  const elevacion = new Array(cintas.length).fill(0);
  const meta = new Array(cintas.length).fill(0);

  const m = {
    W: 0, H: 0, alto: 0, ancho: 0, R: 900, paso: 10, pasoPx: 160, cull: 40,
    pos: 0, destino: 0, previo: 0, sucio: true,
    abajo: false, encima: false, hasta: 0, x0: 0, t0: 0, movido: 0, visible: true
  };
  let frontalActual = 0;
  let direccion = 1;
  let fichaAbierta = false;
  let indice = 0;

  pintaRotulos(0);

  const frente = () => Math.round(envuelve(m.pos, total)) % N;

  const tamano = () => {
    m.W = anaquel.clientWidth;
    m.H = anaquel.clientHeight;
    m.alto = m.H * K_ALTO;
    m.ancho = m.alto * K_PROP;
    m.paso = 360 / total;
    m.R = m.ancho / (2 * Math.PI / total);
    m.cull = Math.min(58, Math.atan((m.W / 2 + m.ancho / 2) / m.R) / RAD);
    m.pasoPx = 2 * m.R * Math.sin((m.paso * RAD) / 2);
    lista.style.setProperty('--cq-alto', m.alto.toFixed(2) + 'px');
    lista.style.setProperty('--cq-ancho', m.ancho.toFixed(2) + 'px');
    lista.style.setProperty('--cq-R', m.R.toFixed(2) + 'px');
    m.sucio = true;
  };

  /** El rótulo sube por su máscara al cambiar la pieza de frente. */
  const saltarRotulos = () => {
    if (sinAnimacion()) return;
    const desde = direccion > 0 ? '105%' : '-105%';
    [ancla.querySelector('#cq-titulo'), ancla.querySelector('#cq-serie'), ancla.querySelector('#cq-linea')]
      .forEach(el => {
        el.animate(
          [{ transform: `translateY(${desde})` }, { transform: 'translateY(0%)' }],
          { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      });
  };

  const pinta = (avisar) => {
    for (let v = 0; v < cintas.length; v++) {
      const a = angulo(v, m.pos, m.paso);
      if (Math.abs(a) > m.cull) {
        cintas[v].style.visibility = 'hidden';
        continue;
      }
      cintas[v].style.visibility = 'visible';

      const r = a * RAD;
      const e = elevacion[v];
      cintas[v].style.transform =
        `translate3d(${(m.R * Math.sin(r)).toFixed(1)}px,` +
        `${(-e * m.alto * 0.06).toFixed(1)}px,${(m.R * (1 - Math.cos(r))).toFixed(1)}px)` +
        ` rotateY(${(-a).toFixed(2)}deg)`;
      cintas[v].style.zIndex = String(100 - Math.round(Math.abs(a) / m.paso));
      cintas[v].dataset.frente = Math.abs(a) < m.paso / 2 ? 'true' : 'false';

      const cara = caras[v];
      if (cara) {
        const lejos = aprieta(Math.abs(a) / m.cull, 0, 1);
        cara.style.filter =
          `brightness(${(1 - 0.36 * lejos).toFixed(3)}) saturate(${(1 - 0.3 * lejos).toFixed(3)})`;
      }
    }

    const f = frente();
    if (f !== frontalActual) {
      direccion = f > frontalActual ? 1 : -1;
      frontalActual = f;
      if (avisar) {
        indice = f;
        pintaRotulos(f);
        saltarRotulos();
      }
    }
  };

  const sinGiro = sinAnimacion();
  const bucle = t => {
    const dt = Math.min(50, t - m.previo) || 16;
    m.previo = t;
    const antes = m.pos;

    const frena = sinGiro || m.abajo || m.encima || fichaAbierta || !m.visible || t < m.hasta;
    if (!frena) m.destino += ((GIRO / m.paso) * dt) / 1000;

    if (!sinGiro) m.pos += (m.destino - m.pos) * (1 - Math.exp(-dt * (m.abajo ? K_ARRASTRE : K_SUELTO)));
    else m.pos = m.destino;

    let sube = false;
    for (let v = 0; v < elevacion.length; v++) {
      const delta = (meta[v] - elevacion[v]) * (1 - Math.exp(-dt * 0.012));
      if (Math.abs(delta) > 0.002) {
        elevacion[v] += delta;
        sube = true;
      }
    }

    if (m.pos !== antes || m.sucio || sube) {
      m.sucio = false;
      pinta(true);
    }
    requestAnimationFrame(bucle);
  };

  const cintaBajo = e => {
    const cadena = document.elementsFromPoint(e.clientX, e.clientY);
    const cara = cadena.find(x => x.closest && x.closest('.cq-cinta'));
    return (cara ? cara.closest('.cq-cinta') : null) ?? e.target.closest('.cq-cinta');
  };

  const entra = e => {
    const cinta = e.target.closest('.cq-cinta');
    if (!cinta || cinta.dataset.frente === 'true') return;
    const v = Number(cinta.dataset.v);
    if (Number.isFinite(v)) meta[v] = 1;
  };

  const sale = e => {
    const cinta = e.target.closest('.cq-cinta');
    if (!cinta) return;
    const adonde = e.relatedTarget;
    if (adonde && cinta.contains(adonde)) return;
    const v = Number(cinta.dataset.v);
    if (Number.isFinite(v)) meta[v] = 0;
  };

  const abrirFicha = p => {
    fichaAbierta = true;
    montarFicha({ ancla, producto: p, aviso, canal: aviso, alCerrar: () => { fichaAbierta = false; } });
  };

  const baja = e => {
    if (e.target.closest('button')) return;
    m.abajo = true;
    m.hasta = performance.now() + REPOSO;
    m.x0 = e.clientX;
    m.t0 = m.destino;
    m.movido = 0;
    anaquel.classList.add('arrastrando');
    try {
      anaquel.setPointerCapture(e.pointerId);
    } catch {
      /* un puntero sin captura posible sigue pudiendo arrastrar */
    }
  };

  const muevePuntero = e => {
    if (!m.abajo) return;
    const dx = e.clientX - m.x0;
    m.movido = Math.max(m.movido, Math.abs(dx));
    m.destino = m.t0 - dx / m.pasoPx;
  };

  const suelta = e => {
    if (!m.abajo) return;
    m.abajo = false;
    anaquel.classList.remove('arrastrando');
    m.hasta = performance.now() + REPOSO;

    if (m.movido < 6) {
      const cinta = cintaBajo(e);
      const v = cinta ? Number(cinta.dataset.v) : NaN;
      if (Number.isFinite(v)) {
        const salto = Math.round(angulo(v, m.destino, m.paso) / m.paso);
        if (salto === 0) {
          const p = productos[frente()];
          if (p) abrirFicha(p);
        } else {
          m.destino = Math.round(m.destino) + salto;
        }
      }
    } else {
      m.destino = Math.round(m.destino);
    }
  };

  let reten = 0;
  const rode = e => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
    if (!dx) return;
    e.preventDefault();
    m.hasta = performance.now() + REPOSO;
    m.destino += (aprieta(dx, -120, 120) / m.pasoPx) * 0.5;
    clearTimeout(reten);
    reten = window.setTimeout(() => { m.destino = Math.round(m.destino); }, 160);
  };

  const teclas = e => {
    if (fichaAbierta || !m.visible || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      m.hasta = performance.now() + REPOSO;
      m.destino = Math.round(m.destino) + 1;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      m.hasta = performance.now() + REPOSO;
      m.destino = Math.round(m.destino) - 1;
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === anaquel) {
      e.preventDefault();
      const p = productos[frente()];
      if (p) abrirFicha(p);
    }
  };

  const flecha = pasoGirado => {
    m.hasta = performance.now() + REPOSO;
    m.destino = Math.round(m.destino) + pasoGirado;
  };

  anaquel.addEventListener('pointerover', entra);
  anaquel.addEventListener('pointerout', sale);
  anaquel.addEventListener('pointerenter', () => { m.encima = true; });
  anaquel.addEventListener('pointerleave', () => { m.encima = false; });
  anaquel.addEventListener('pointerdown', baja);
  anaquel.addEventListener('pointermove', muevePuntero);
  anaquel.addEventListener('pointerup', suelta);
  anaquel.addEventListener('pointercancel', suelta);
  anaquel.addEventListener('wheel', rode, { passive: false });
  window.addEventListener('keydown', teclas);
  document.addEventListener('visibilitychange', () => { m.previo = performance.now(); });

  ancla.querySelector('#cq-antes').addEventListener('click', () => flecha(-1));
  ancla.querySelector('#cq-despues').addEventListener('click', () => flecha(1));
  ancla.querySelector('#cq-anadir').addEventListener('click', () => {
    aviso(agregarAlCarrito(productos[aprieta(indice, 0, N - 1)]).mensaje);
  });
  ancla.querySelector('#cq-ficha').addEventListener('click', () => {
    const p = productos[aprieta(indice, 0, N - 1)];
    if (p) abrirFicha(p);
  });

  const observador = new IntersectionObserver(en => { m.visible = en[0].isIntersecting; }, { threshold: 0.25 });
  const medidor = new ResizeObserver(() => tamano());
  observador.observe(anaquel);
  medidor.observe(anaquel);

  tamano();
  pinta(false);
  requestAnimationFrame(bucle);
  if (document.fonts) {
    document.fonts.ready.then(() => { tamano(); pinta(true); });
  }
  return true;
}
