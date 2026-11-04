/**
 * Fichas visuales de una carta: modelo 3D del anillo, tarjeta del rail y modal
 * de detalle. Es el mismo marcado que los componentes React (Carta.tsx,
 * Vitrina.tsx y Detalle.tsx), generado como cadena.
 *
 * Los campos del catálogo se insertan crudos: la rúbrica pide un XSS real
 * almacenado (§4), así que el escapar es lo que hay que evitar aquí.
 */
import {
  colorHalo, etiquetaCertificacion, etiquetaNota, halo, numeroDeNota
} from './halo.js';
import { agregarAlCarrito } from './carrito.js';
import { usd } from './moneda.js';

export function brillo(p) {
  return `--gl:${halo(p).toFixed(2)};--glc:${colorHalo(p)}`;
}

/** Modelo 3D de la carta (`.m`), reutilizado por la vitrina y la ruleta. */
export function cartaHtml(p, { activo = false } = {}) {
  return `<div class="m${p.unica ? ' oneof' : ''}" style="${brillo(p)}"${activo ? ' data-activo="true"' : ''}>
  <div class="m-card">
    <div class="card-header">
      <span class="card-tag font-title">${p.etiqueta}</span>
      <span class="card-no">${p.codigo}</span>
    </div>
    <div class="card-art" style="background-image:url('${p.imagen}')">
      <span class="gchip">${etiquetaCertificacion(p)}</span>
      ${p.unica ? '<span class="card-1of1 font-title">1/1</span>' : ''}
    </div>
    <div class="card-footer">
      <span class="card-name font-title">${p.nombre}</span>
      <span class="card-price">${usd(p.precio)}</span>
    </div>
  </div>
</div>`;
}

/** Tarjeta del rail derecho de la vitrina. */
export function railCardHtml(p, i) {
  return `<article class="card${i % 2 ? ' alt' : ''}${p.unica ? ' oneof' : ''}" data-i="${i}" style="${brillo(p)}">
  <button class="fav" type="button" aria-pressed="false" aria-label="Guardar ${p.nombre}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20S3.5 15 3.5 9A4.6 4.6 0 0 1 12 6.6 4.6 4.6 0 0 1 20.5 9C20.5 15 12 20 12 20Z"/></svg>
  </button>
  <span class="shot">
    <img src="${p.imagen}" alt="${p.nombre}">
    <span class="gchip">${etiquetaCertificacion(p)}</span>
    ${p.unica ? '<span class="card-1of1 font-title">1/1</span>' : ''}
  </span>
  <div class="meta">
    <h3 class="font-title">${p.nombre}</h3>
    <span>${usd(p.precio)}</span>
    <button class="add font-title" type="button" aria-label="Añadir ${p.nombre} a la Pokédex">+</button>
  </div>
</article>`;
}

function claseStock(n) {
  return n === 0 ? 'out' : n === 1 ? 'low' : 'ok';
}

function textoStock(n) {
  return n === 0 ? 'Agotado' : n === 1 ? 'Última pieza' : `${n} en stock`;
}

/** Ficha de detalle (modal). */
export function detalleHtml(p) {
  const nota = numeroDeNota(p);
  const fichas = [];
  const anotar = (k, v) => { if (v && v.trim()) fichas.push([k, v]); };
  anotar('Set', p.set);
  anotar('Número', p.numero);
  anotar('Año', p.anio);
  anotar('Idioma', p.idioma);
  anotar('Centering', p.centrado);
  anotar('Conservación', p.conservacion);
  anotar('Certificadora', p.certificadora);
  anotar('Nota de graduación', `${etiquetaCertificacion(p)} — ${p.nota}`);
  anotar('Certificado', p.numeroCertificado);
  if (p.origen === 'comunidad') anotar('Vendedor', p.vendedorNombre ?? '');

  const hayCertificado = p.numeroCertificado !== '—' && !!p.numeroCertificado.trim();

  return `<div class="modal" style="${brillo(p)}" role="dialog" aria-modal="true" aria-label="${p.nombre}" id="ficha">
  <div class="sheet">
    <div class="sheet-art">
      <div class="art art-bob" style="background-image:url('${p.imagen}')"></div>
      <span class="grade-chip"><i></i><span>${p.certificadora} · ${p.nota}</span></span>
    </div>
    <div class="sheet-info">
      <button class="sheet-close" type="button" aria-label="Cerrar detalle" id="cerrar-ficha">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>
      </button>
      <p class="kicker">${p.set} · ${p.numero}</p>
      <h2 class="font-title">${p.nombre}</h2>
      <div class="price-row">
        <span class="price">${usd(p.precio)}</span>
        <span class="stock ${claseStock(p.stock)}"><i></i><span>${p.unica ? 'Pieza única 1/1' : textoStock(p.stock)}</span></span>
      </div>
      <div class="grade-hero${p.unica ? ' oneof' : ''}" style="${brillo(p)}">
        <span class="gh-score">${nota || '—'}<small>${etiquetaNota(p)}</small></span>
        <span class="gh-meta">
          <span class="gh-cert">${p.certificadora}</span>
          <span class="gh-line">Nota <b>${p.nota}</b>${hayCertificado ? ` · certificado <b>${p.numeroCertificado}</b>, verificable en el registro de ${p.certificadora}` : ''}.</span>
        </span>
        ${p.unica ? '<span class="gh-1of1">1/1<small>no hay otra</small></span>' : ''}
      </div>
      <dl class="specs">
        ${fichas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
      <p class="note"><b>Nota del vendedor.</b> ${p.descripcion}</p>
      <div class="sheet-acts">
        <button class="btn-rojo" type="button" id="ficha-anadir"${p.stock === 0 ? ' disabled' : ''}>${p.stock === 0 ? 'Sin stock' : 'Añadir a Pokédex'}</button>
        <button class="btn-line" type="button" id="ficha-preguntar">Preguntar por esta pieza</button>
      </div>
    </div>
  </div>
</div>`;
}

/**
 * Ficha de detalle sobre `ancla`: foco en el cierre, scroll bloqueado y, al cerrar
 * —clic en el fondo, botón o Escape—, el foco vuelve a lo que estuviera activo antes.
 * Lo comparten la vitrina, la ruleta de la comunidad y la rejilla de /comunidad.
 * `canal` es el aviso del botón «preguntar»: sin canal, la consulta se va por mailto.
 * `alAnadir` corre después del toast; /comunidad lo usa para cerrar la ficha.
 */
export function montarFicha({ ancla, producto, aviso, canal, alAnadir, alCerrar }) {
  const p = producto;
  ancla.insertAdjacentHTML('beforeend', detalleHtml(p));
  const modal = ancla.querySelector('#ficha');
  const previo = document.activeElement;

  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  function cerrar() {
    if (alCerrar) alCerrar();
    document.removeEventListener('keydown', tecla);
    modal.remove();
    document.documentElement.classList.remove('lock');
    if (previo instanceof HTMLElement) previo.focus();
  }

  document.documentElement.classList.add('lock');
  modal.querySelector('#cerrar-ficha').focus();
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('on')));
  modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });
  modal.querySelector('#cerrar-ficha').addEventListener('click', cerrar);
  modal.querySelector('#ficha-anadir').addEventListener('click', () => {
    const r = agregarAlCarrito(p);
    aviso(r.mensaje);
    if (alAnadir) alAnadir(p, cerrar);
  });
  modal.querySelector('#ficha-preguntar').addEventListener('click', () => {
    const texto = `Escríbenos por ${p.nombre} a hola@pokevault.com — respondemos el mismo día.`;
    if (canal) { canal(texto); return; }
    location.href = `mailto:hola@pokevault.com?subject=${encodeURIComponent(`Consulta por ${p.nombre}`)}`;
  });
  document.addEventListener('keydown', tecla);
}
