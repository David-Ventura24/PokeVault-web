/**
 * index.html: vitrina y ruleta de la comunidad. El hero, el mosaico y el
 * "sobre nosotros" son HTML plano; solo se pinta desde JS lo que depende del
 * catálogo, igual que hacía app/(tienda)/page.tsx.
 */
import { api } from './api.js';
import { aviso, blindarVista, montarShell } from './ui.js';
import { montarCarruselComunidad } from './rodaja.js';
import { montarVitrina } from './vitrina.js';

montarShell();

if (blindarVista()) {
  const anclaVitrina = document.getElementById('coleccion');
  const anclaComunidad = document.getElementById('comunidad');

  try {
    const productos = await api.productos();
    const deTienda = productos.filter(p => p.origen === 'tienda' && p.estado === 'publicado');
    const delVecindario = productos.filter(p => p.origen === 'comunidad' && p.estado === 'publicado');

    if (!montarVitrina({ ancla: anclaVitrina, productos: deTienda, aviso })) {
      anclaVitrina.innerHTML = '<p class="muted" style="margin:0 var(--pad)">La bóveda está vacía hoy.</p>';
    }

    if (!montarCarruselComunidad({ ancla: anclaComunidad, productos: delVecindario, aviso })) {
      anclaComunidad.innerHTML = '<p class="muted">Todavía no hay publicaciones aprobadas. Sé el primero en vender.</p>';
    }
  } catch (e) {
    anclaVitrina.innerHTML = `<p class="aviso malo" style="margin:0 var(--pad)">${e && e.message ? e.message : 'No pudimos cargar el catálogo.'}</p>`;
  }
}
