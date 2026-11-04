/**
 * perfil.html: ficha de la cuenta y sus publicaciones. Espejo de
 * app/(tienda)/perfil/page.tsx; la rejilla `.pf-grid` usa el mismo marcado que
 * los `<article className="pf-cart">` de React.
 */
import { api } from './api.js';
import { fmtDia } from './factura.js';
import { usd } from './moneda.js';
import { sesionAlmacenada } from './sesion.js';
import { blindarVista, montarShell, RUTA } from './ui.js';
import { EMPRESA } from './empresa.js';

const ESTADOS = {
  publicado: { texto: 'Publicada', clase: 'pico tienda' },
  en_revision: { texto: 'En revisión', clase: 'pico revision' },
  rechazado: { texto: 'Rechazada', clase: 'pico rechazado' }
};

const ROLES = { comprador: 'Comprador', vendedor: 'Vendedor', administrador: 'Administrador' };

const iniciales = nombre =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();

montarShell();

if (blindarVista()) {
  const cont = document.getElementById('perfil');
  const sesion = sesionAlmacenada();

  if (!sesion) {
    cont.innerHTML = `<section class="contenedor">
  <div class="panel">
    <div class="panel-head">
      <h2 class="font-title">Tu perfil necesita una cuenta</h2>
      <p>Aquí ves tus datos de registro y las cartas que has publicado. Entra o crea una cuenta para verla.</p>
    </div>
    <div class="fila-acciones">
      <a class="boton primario" href="${RUTA.login}">Iniciar sesión</a>
      <a class="boton" href="${RUTA.registro}">Crear cuenta</a>
    </div>
  </div>
</section>`;
  } else {
    await montarPerfil(cont, sesion.usuario);
  }
}

async function montarPerfil(cont, usuario) {
  cont.innerHTML = `<section class="contenedor" aria-busy="true">
  <div class="panel"><p>Cargando tu perfil…</p></div>
</section>`;

  let productos = [];
  let error = '';
  try {
    productos = await api.productos();
  } catch (err) {
    error = err instanceof Error ? err.message : 'No pudimos leer el catálogo.';
  }

  const mias = productos.filter(p => p.vendedorId === usuario.id);
  const conteo = {
    publicadas: mias.filter(p => p.estado === 'publicado').length,
    revision: mias.filter(p => p.estado === 'en_revision').length,
    rechazadas: mias.filter(p => p.estado === 'rechazado').length
  };

  const datos = [
    ['Correo', `<a href="mailto:${usuario.email}">${usuario.email}</a>`],
    ['Teléfono', usuario.telefono || 'Sin registrar'],
    ['Dirección', usuario.direccion || 'Sin registrar'],
    ['Rol', ROLES[usuario.rol]],
    ['Estado', usuario.estado === 'activo' ? 'Cuenta activa' : 'Cuenta suspendida'],
    ['Miembro desde', fmtDia(usuario.creado)]
  ];

  cont.innerHTML = `<div class="contenedor perfil">
  <section class="pf-portada" aria-label="Datos de la cuenta">
    <span class="pf-avatar font-title" aria-hidden="true">${iniciales(usuario.nombre)}</span>
    <div class="pf-identidad">
      <p class="kicker">Mi perfil</p>
      <h1 class="font-title">${usuario.nombre}</h1>
      <p class="pf-sub">
        <span class="pico">${ROLES[usuario.rol]}</span>${usuario.rol === 'administrador'
          ? ' · administras el catálogo y la revisión de la comunidad'
          : ' · esta cuenta guarda tus datos y tus publicaciones'}
      </p>
    </div>
    <dl class="pf-datos">
      ${datos.map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${valor}</dd></div>`).join('')}
    </dl>
  </section>

  <section class="panel" aria-label="Resumen de publicaciones">
    <div class="panel-head">
      <h2 class="font-title">Tu actividad</h2>
      <p>Cuenta lo que has publicado y en qué estado está cada pieza.</p>
    </div>
    <ul class="pf-stats">
      <li><b>${mias.length}</b>publicaciones</li>
      <li><b>${conteo.publicadas}</b>en vitrina</li>
      <li><b>${conteo.revision}</b>en revisión</li>
      <li><b>${conteo.rechazadas}</b>rechazadas</li>
    </ul>
  </section>

  <section class="panel" aria-label="Mis publicaciones">
    <div class="panel-head">
      <h2 class="font-title">Tus cartas publicadas</h2>
      <p>${mias.length ? `${mias.length} ${mias.length === 1 ? 'pieza' : 'piezas'} en esta cuenta.` : 'Todavía no has publicado piezas.'}</p>
      <a class="boton chico fantasma" href="${RUTA.vender}">${mias.length ? 'Gestionar publicaciones' : 'Publicar mi primera carta'}</a>
    </div>

    ${error ? `<p class="aviso malo">${error}</p>` : ''}

    ${mias.length > 0 ? `<div class="pf-grid">${mias.map(cartita).join('')}</div>` : ''}

    <div class="fila-acciones">
      <a class="boton" href="${RUTA.comunidad}">Vitrina de la comunidad</a>
      <a class="boton fantasma" href="${RUTA.carrito}#facturas">Mis pedidos</a>
      <a class="boton fantasma" href="${RUTA.inicio}">Volver a la tienda</a>
    </div>
  </section>

  <p class="pf-nota">
    ¿Tus datos están mal? Escríbenos a <a href="mailto:${EMPRESA.correoSoporte}">${EMPRESA.correoSoporte}</a>
    y los corregimos en tu cuenta.
  </p>
</div>`;
}

function cartita(p) {
  const estado = ESTADOS[p.estado];
  return `<article class="pf-cart">
  <div class="pf-cart-marco">
    <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
    ${p.unica ? '<span class="pf-uno">1/1</span>' : ''}
  </div>
  <div class="pf-cart-cuerpo">
    <h3>${p.nombre}</h3>
    <p class="pf-cart-set">${p.set}${p.numero ? ` · ${p.numero}` : ''}</p>
    <p class="pf-cart-cert">${p.certificadora}${p.nota ? ` · ${p.nota}` : ''}</p>
    <div class="pf-cart-pie">
      <span class="pf-cart-precio">${usd(p.precio)}</span>
      <span class="${estado.clase}">${estado.texto}</span>
    </div>
    <p class="pf-cart-alta">${p.origen === 'tienda' ? 'Catálogo de la tienda' : 'Publicación comunitaria'} · alta ${fmtDia(p.creado)}</p>
  </div>
</article>`;
}
