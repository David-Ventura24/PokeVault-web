/**
 * comunidad.html: la rejilla de las cartas de los coleccionistas. Espejo de
 * app/(tienda)/comunidad/page.tsx — mismo orden de nodos y las mismas fichas
 * `.m` que usa la vitrina, solo que en un grid estático en lugar del anillo 3D.
 */
import { api } from './api.js';
import { cartaHtml, montarFicha } from './carta.js';
import { usd } from './moneda.js';
import { aviso, blindarVista, montarShell, RUTA } from './ui.js';

const FILTROS = [['all', 'Todo'], ['CGC', 'CGC'], ['PSA', 'PSA']];

montarShell();

if (blindarVista()) {
  const cont = document.getElementById('comunidad');
  let productos = [];
  let cargando = true;
  let error = '';
  let cat = 'all';

  const publicadas = () => productos.filter(p => p.origen === 'comunidad' && p.estado === 'publicado');
  const visibles = () => publicadas().filter(p => cat === 'all' || p.certificadora === cat);

  function pintar() {
    const lista = publicadas();
    const masCara = lista.reduce((m, p) => Math.max(m, p.precio), 0);
    const filtro = visibles();
    cont.innerHTML = `<section class="contenedor">
  <div class="cabecera-vista">
    <div>
      <p class="kicker">Vitrina comunitaria</p>
      <h1 class="font-title">Lo que venden los coleccionistas</h1>
      <p>Publicaciones de otros clientes, con la misma ficha y el mismo halo que las piezas de
        la tienda. Cada una pasa por revisión antes de aparecer aquí: si está en la vitrina,
        un administrador ya verificó su certificado.</p>
    </div>
    <a class="boton" href="${RUTA.vender}">Publicar mi carta</a>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h2 class="font-title">${lista.length} ${lista.length === 1 ? 'pieza publicada' : 'piezas publicadas'}</h2>
      <p>${lista.length
        ? `Desde ${usd(Math.min(...lista.map(p => p.precio)))} hasta ${usd(masCara)}. Se añaden a tu Pokédex igual que las de la tienda.`
        : 'Todavía no hay piezas aprobadas de la comunidad. Anímate a publicar la primera.'}</p>
    </div>

    <div class="fila-acciones" style="margin-top:0">
      ${FILTROS.map(([k, t]) => `<button type="button" class="boton chico${cat === k ? ' primario' : ''}" data-cat="${k}">${t}</button>`).join('')}
    </div>

    ${cargando ? '<p class="muted">Cargando publicaciones…</p>' : ''}
    ${error ? `<p class="aviso malo">${error}</p>` : ''}
    ${!cargando && filtro.length === 0 && !error ? '<p class="muted">No hay piezas de la comunidad con ese filtro.</p>' : ''}
    ${!cargando && filtro.length > 0
      ? `<div class="grid-comunidad">${filtro.map(p => cartaHtml(p)).join('')}</div>` : ''}

    <p class="demo-nota"><b>Cómo se revisa.</b> El vendedor sube foto, certificadora y número de certificado;
      un administrador aprueba o rechaza la publicación desde el panel. Si se rechaza, el
      vendedor puede corregirla y reenviarla.</p>
  </div>
</section>`;
  }

  cont.addEventListener('click', e => {
    const boton = e.target.closest('[data-cat]');
    if (boton) {
      cat = boton.dataset.cat;
      pintar();
      return;
    }
    const carta = e.target.closest('.grid-comunidad .m');
    if (!carta) return;
    const i = [...carta.parentElement.children].indexOf(carta);
    const p = visibles()[i];
    if (!p) return;
    montarFicha({ ancla: cont, producto: p, aviso, alAnadir: (p, cerrar) => cerrar() });
  });

  pintar();
  try {
    productos = await api.productos();
  } catch (err) {
    error = err instanceof Error ? err.message : 'No pudimos leer el catálogo.';
  }
  cargando = false;
  pintar();
}
