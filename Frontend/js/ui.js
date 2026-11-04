/**
 * Shell visual de PokéVault: encabezado, menú lateral, pie y toast.
 * Es el mismo marcado que tenía el componente React (mismas clases y el mismo
 * orden de renglones), generado como cadena e inyectado con innerHTML, así que
 * ninguna hoja CSS tuvo que cambiarse.
 */
import { limpiarSesion, marcarEntradaTienda, sesionAlmacenada, suscribirSesion, yaEntramosTienda } from './sesion.js';
import { carrito, suscribirCarrito } from './carrito.js';
import { EMPRESA, telHref } from './empresa.js';

const RUTA = {
  inicio: 'index.html',
  login: 'login.html',
  registro: 'registro.html',
  carrito: 'carrito.html',
  vender: 'vender.html',
  admin: 'admin.html',
  comunidad: 'comunidad.html',
  perfil: 'perfil.html',
  contacto: 'contacto.html'
};

const FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const SALIDA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"/><path d="M20 12h-9M16 8l4 4-4 4"/></svg>';
const HAMBURGUESA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
const CRUZ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

const enlace = (href, texto) => `<a class="dl" href="${href}">${texto}${FLECHA}</a>`;

export function encabezado(inicio = RUTA.inicio) {
  const s = sesionAlmacenada();
  const nombre = s ? s.usuario.nombre : '';
  const admin = s && s.usuario.rol === 'administrador';
  const unidades = carrito().reduce((x, it) => x + it.cantidad, 0);

  const chip = s
    ? `<a class="user-chip font-title on" href="${RUTA.perfil}" title="Mi perfil — ${nombre}"><span class="dotu" aria-hidden="true"></span><span class="lbl">${nombre}</span></a>`
    : `<a class="user-chip font-title" href="${RUTA.login}">Entrar</a>`;

  const cuenta = [
    s ? enlace(RUTA.perfil, 'Mi perfil') : '',
    enlace(s ? `${RUTA.carrito}#facturas` : RUTA.login, s ? 'Mis pedidos' : 'Mi cuenta'),
    enlace(RUTA.carrito, 'Mi Pokédex'),
    enlace(RUTA.vender, 'Vender mis cartas'),
    admin ? enlace(RUTA.admin, 'Panel administrador') : '',
    s ? '' : `${enlace(RUTA.login, 'Iniciar sesión')}${enlace(RUTA.registro, 'Crear cuenta')}`
  ].join('');

  /* la salida va al final: es la acción que cierra el menú, no un enlace más */
  const salida = s ? '<button type="button" class="dl dl-salir" id="btn-salir">Cerrar sesión' + SALIDA + '</button>' : '';

  return `<header class="hdr">
  <div class="r1">
    <a class="brand font-title" href="${inicio}">Poké<span>Vault</span></a>
    <div class="acts">
      ${chip}
      <a class="dex-btn font-title" href="${RUTA.carrito}">Pokédex <span class="dex-count">${unidades}</span></a>
      <button type="button" class="menu-btn" id="btn-menu" aria-expanded="false" aria-controls="drawer">${HAMBURGUESA}<span>Menú</span></button>
    </div>
  </div>
</header>
<div class="scrim" id="scrim" aria-hidden="true"></div>
<aside class="drawer" id="drawer" aria-hidden="true" aria-label="Menú principal">
  <div class="drawer-top">
    <span class="brand font-title">Poké<span>Vault</span></span>
    <button type="button" class="drawer-close" id="btn-cerrar-drawer" aria-label="Cerrar menú">${CRUZ}</button>
  </div>
  <nav id="drawer-nav">
    <p class="drawer-group">Tienda</p>
    ${enlace(`${inicio}#coleccion`, 'Vitrina completa')}
    ${enlace(`${inicio}#coleccion`, 'Cartas graduadas')}
    ${enlace(`${inicio}#coleccion`, 'Piezas 1/1 y de alta rareza')}
    ${enlace(RUTA.comunidad, 'Cartas de la comunidad')}
    <p class="drawer-group">${s ? 'Cuenta · ' + nombre : 'Cuenta'}</p>
    ${cuenta}
    <p class="drawer-group">Compañía</p>
    ${enlace(`${inicio}#nosotros`, 'Sobre nosotros')}
    ${enlace(`${inicio}#nosotros`, 'Cómo verificamos')}
    ${enlace(RUTA.contacto, 'Contacto')}
    <p class="drawer-group">Ayuda</p>
    ${enlace(`${RUTA.contacto}#envios`, 'Envíos y devoluciones')}
    ${enlace(`${RUTA.contacto}#faq`, 'Preguntas frecuentes')}
    ${salida}
  </nav>
  <p class="drawer-foot"><b>PokéVault</b> — tienda 100% en línea de cartas Pokémon originales. Cada pieza se publica con certificadora, nota y número de certificado.</p>
</aside>`;
}

const COLUMNAS = [
  ['Tienda', [['Vitrina completa', `${RUTA.inicio}#coleccion`], ['Cartas graduadas', `${RUTA.inicio}#coleccion`], ['Certificados verificables', `${RUTA.inicio}#nosotros`], ['Cartas de la comunidad', RUTA.comunidad]]],
  ['Cuenta', [['Mi perfil', RUTA.perfil], ['Mis pedidos', `${RUTA.carrito}#facturas`], ['Mi Pokédex', RUTA.carrito], ['Vender mis cartas', RUTA.vender]]],
  ['Compañía', [['Sobre nosotros', `${RUTA.inicio}#nosotros`], ['Cómo verificamos', `${RUTA.inicio}#nosotros`], ['Contacto', RUTA.contacto], ['Quiénes somos', RUTA.contacto]]],
  ['Ayuda', [['Envíos y devoluciones', `${RUTA.contacto}#envios`], ['Preguntas frecuentes', `${RUTA.contacto}#faq`], ['Garantía de autenticidad', RUTA.contacto], ['Términos y privacidad', RUTA.contacto]]]
];

export function pie() {
  const columnas = COLUMNAS.map(([titulo, enlaces]) =>
    `<div><h3>${titulo}</h3><ul>${enlaces.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`
  ).join('');
  return `<footer class="pie">
  <div class="pie-grid">
    <div class="pie-brand">
      <span class="brand font-title">Poké<span>Vault</span></span>
      <p>Tienda en línea de cartas Pokémon originales y graduadas. Envíos a todo El Salvador y Centroamérica.</p>
      <p class="pie-contacto">
        <a href="mailto:${EMPRESA.correoVentas}">${EMPRESA.correoVentas}</a>
        <a href="${telHref(EMPRESA.telefono)}">${EMPRESA.telefono}</a>
        <span>${EMPRESA.direccion} · ${EMPRESA.ciudad}</span>
      </p>
    </div>
    ${columnas}
  </div>
  <div class="pie-legal">
    <span>© 2026 PokéVault. Pokémon y Pikachu son marcas de Nintendo, Creatures Inc. y GAME FREAK inc.</span>
    <span>${EMPRESA.horario}</span>
  </div>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

let relojToast = null;

/** Aviso flotante: misma animación que el toast de React. */
export function aviso(msg, ms = 2400) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  if (relojToast) clearTimeout(relojToast);
  relojToast = setTimeout(() => t.classList.remove('on'), ms);
}

function abrirDrawer(abierto) {
  const drawer = document.getElementById('drawer');
  const scrim = document.getElementById('scrim');
  const boton = document.getElementById('btn-menu');
  if (!drawer) return;
  drawer.classList.toggle('on', abierto);
  drawer.setAttribute('aria-hidden', String(!abierto));
  if (scrim) scrim.classList.toggle('on', abierto);
  if (boton) boton.setAttribute('aria-expanded', String(abierto));
  document.documentElement.classList.toggle('lock', abierto);
}

/**
 * Monta el shell al principio y al final del <body>. No envuelve el header en un
 * div: iría a parar dentro de un contenedor y perdería el position: sticky.
 */
export function montarShell({ inicio = RUTA.inicio } = {}) {
  document.body.insertAdjacentHTML('afterbegin', encabezado(inicio));
  document.body.insertAdjacentHTML('beforeend', pie());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') abrirDrawer(false); });
  montarInteracciones();

  /* sesión o carrito cambiaron: se tiran las tres piezas del shell y se vuelven a
     generar; dejarlas sueltas dejaría dos #drawer en el DOM. */
  const repintar = () => {
    document.querySelectorAll('header.hdr, #scrim, #drawer').forEach(n => n.remove());
    document.body.insertAdjacentHTML('afterbegin', encabezado(inicio));
    montarInteracciones();
  };
  suscribirSesion(repintar);
  suscribirCarrito(repintar);
}

/** Los listeners del shell se vuelven a enlazar cada vez que el header se repinta. */
function montarInteracciones() {
  const menu = document.getElementById('btn-menu');
  if (!menu) return;
  menu.addEventListener('click', () => abrirDrawer(true));
  document.getElementById('btn-cerrar-drawer').addEventListener('click', () => abrirDrawer(false));
  document.getElementById('scrim').addEventListener('click', () => abrirDrawer(false));
  document.getElementById('drawer-nav').addEventListener('click', e => {
    if (e.target.closest('a, button')) abrirDrawer(false);
  });
  const salir = document.getElementById('btn-salir');
  if (salir) salir.addEventListener('click', () => {
    limpiarSesion();
    /* en Next el logout no navega: te deja viendo la misma vista como invitado.
       Aquí se recarga la página, así que se abre la ventana de invitado para que
       blindarVista() no te devuelva al login en esa misma carga. */
    marcarEntradaTienda();
    location.reload();
  });
}

/**
 * Equivalente a PuertaSesion: solo se bloquea al que llega sin sesión y sin haber
 * pedido la ventana de invitado. Quien ya entró como invitado ve la vista igual
 * que en React, y es cada vista la que pinta su panel de «necesitas una cuenta».
 * Devuelve false con el cartel de tránsito y el rebote al acceso.
 */
export function blindarVista() {
  if (sesionAlmacenada() || yaEntramosTienda()) return true;
  const principal = document.querySelector('main');
  if (principal) {
    principal.innerHTML = `<div class="puerta">
  <p class="kicker">PokéVault</p>
  <h1 class="font-title">Abriendo la bóveda…</h1>
  <p>Te llevamos al acceso. Entra con tu cuenta o mira la vitrina como invitado.</p>
</div>`;
  }
  location.replace(RUTA.login);
  return false;
}

export { RUTA };
