/**
 * admin.html: el panel de administración. Espejo de app/(tienda)/admin/page.tsx
 * con sus tres componentes (AdminProductos, AdminUsuarios, AdminPagos).
 *
 * Cada pestaña se pinta como un bloque propio y las tablas se vuelven a tirar
 * solas, para no perder el foco de los campos de filtro mientras se escribe.
 */
import { api } from './api.js';
import { ESTADO_PAGO, fmtFecha, puedeTransitar, resumenAviso } from './factura.js';
import { montarFormProducto } from './form-producto.js';
import { usd } from './moneda.js';
import { nombreDesde, sesionAlmacenada } from './sesion.js';
import { aviso, blindarVista, montarShell, RUTA } from './ui.js';

const ROLES = ['comprador', 'vendedor', 'administrador'];
const ESTADOS_PROD = { publicado: 'Publicada', en_revision: 'En revisión', rechazado: 'Rechazada' };
const ETIQUETA = {
  verificacion: 'Marcar en verificación',
  pagado: 'Confirmar pago',
  pendiente: 'Volver a pedir el pago',
  anulada: 'Anular'
};
const TABS = [['productos', 'Catálogo'], ['usuarios', 'Usuarios'], ['pagos', 'Pagos']];
const ALTA_VACIA = { nombre: '', email: '', telefono: '', direccion: '', rol: 'comprador', password: '' };

const el = id => document.getElementById(id);
const escoge = (lista, actual) => lista.map(v => `<option value="${v}"${v === actual ? ' selected' : ''}>${v}</option>`).join('');

montarShell();

if (blindarVista()) {
  const ses = sesionAlmacenada();
  const cont = el('admin');

  if (!ses || ses.usuario.rol !== 'administrador') {
    cont.innerHTML = `<section class="contenedor">
  <div class="panel">
    <div class="panel-head">
      <h2 class="font-title">Zona restringida</h2>
      <p>Este panel solo se abre con una cuenta de administrador. Estás dentro como <b>${ses ? ses.usuario.rol : 'invitado'}</b>.</p>
    </div>
    <p class="aviso">Para la entrega puedes entrar con la cuenta sembrada <b>admin@pokevault.com</b> y cualquier contraseña de 6 caracteres.</p>
    <div class="fila-acciones">
      <a class="boton primario" href="${RUTA.login}">Cambiar de cuenta</a>
      <a class="boton fantasma" href="${RUTA.inicio}">Volver a la tienda</a>
    </div>
  </div>
</section>`;
  } else {
    montarPanel(ses);
  }
}

async function montarPanel(ses) {
  const cont = el('admin');
  const usuario = ses.usuario;
  let productos = [];
  let usuarios = [];
  let facturas = [];
  let error = '';
  let vista = 'productos';

  /* filtros y estados de la pestaña de productos */
  let filtroEstado = 'todos';
  let filtroOrigen = 'todos';
  let busca = '';
  let alta = false;
  let editando = null;
  let ocupado = '';

  /* estados de la pestaña de usuarios */
  let altaAbierta = false;
  let altaUsuario = { ...ALTA_VACIA };
  let errorAlta = '';
  let buscaUsuarios = '';

  /* estado de la pestaña de pagos */
  let avisosAbiertos = '';

  cont.innerHTML = `<section class="contenedor">
  <div class="cabecera-vista">
    <div>
      <p class="kicker">Panel de administración</p>
      <h1 class="font-title">Bóveda y cuentas</h1>
      <p>Todo lo que cambies aquí se guarda por la misma fachada de datos que consume la
        vitrina: <code>${api.modo === 'mock' ? 'localStorage en modo local' : 'backend HTTP'}</code>.</p>
    </div>
    <div class="fila-acciones" style="margin:0">
      ${TABS.map(([k, t]) => `<button class="boton${vista === k ? ' primario' : ''}" data-vista="${k}">${t}</button>`).join('')}
    </div>
  </div>
  <div id="ad-error"></div>
  <div id="ad-vista"></div>
</section>`;

  /* ---------------- datos ---------------- */
  async function cargarProductos() {
    try {
      productos = await api.productos();
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'No pudimos leer el catálogo.';
    }
    pintarError();
    if (vista === 'productos') pintarVista();
  }

  async function cargarPaneles() {
    try {
      [usuarios, facturas] = await Promise.all([api.usuarios(), api.facturas()]);
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'No pudimos leer las cuentas.';
    }
    pintarError();
    if (vista !== 'productos') pintarVista();
  }

  function pintarError() {
    el('ad-error').innerHTML = error ? `<p class="aviso malo">${error}</p>` : '';
  }

  /* ---------------- catálogo ---------------- */
  function visibles() {
    const t = busca.trim().toLowerCase();
    return productos.filter(p => {
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
      if (filtroOrigen !== 'todos' && p.origen !== filtroOrigen) return false;
      if (!t) return true;
      return `${p.nombre} ${p.set} ${p.codigo} ${p.vendedorNombre ?? ''}`.toLowerCase().includes(t);
    });
  }

  function filaProducto(p) {
    const ocupadoAqui = ocupado === p.id;
    return `<tr>
  <td>
    <div class="celda-pieza">
      <img class="mini" src="${p.imagen}" alt="" loading="lazy">
      <span><b>${p.nombre}</b><em>${p.codigo || `${p.set} ${p.numero}`}</em></span>
    </div>
  </td>
  <td><span class="pico ${p.origen === 'tienda' ? 'tienda' : 'comunidad'}">${p.origen === 'tienda' ? 'Tienda' : 'Comunidad'}</span></td>
  <td>${p.vendedorNombre || 'PokéVault'}</td>
  <td class="num">${usd(p.precio)}</td>
  <td class="num">${p.unica ? '1/1' : p.stock}</td>
  <td><span class="pico ${p.estado === 'publicado' ? 'tienda' : p.estado === 'en_revision' ? 'revision' : 'rechazado'}">${ESTADOS_PROD[p.estado]}</span></td>
  <td>${fmtFecha(p.creado)}</td>
  <td>
    <div class="acciones">
      ${p.estado === 'en_revision'
        ? `<button class="boton chico primario" data-estado="publicado" data-id="${p.id}"${ocupadoAqui ? ' disabled' : ''}>Aprobar</button>
           <button class="boton chico" data-estado="rechazado" data-id="${p.id}"${ocupadoAqui ? ' disabled' : ''}>Rechazar</button>` : ''}
      ${p.estado === 'rechazado'
        ? `<button class="boton chico" data-estado="publicado" data-id="${p.id}"${ocupadoAqui ? ' disabled' : ''}>Publicar</button>` : ''}
      ${p.estado === 'publicado'
        ? `<button class="boton chico" data-estado="rechazado" data-id="${p.id}"${ocupadoAqui ? ' disabled' : ''}>Ocultar</button>` : ''}
      <button class="boton chico" data-editar="${p.id}">Editar</button>
      <button class="boton chico fantasma" data-eliminar="${p.id}"${ocupadoAqui ? ' disabled' : ''}>Eliminar</button>
    </div>
  </td>
</tr>`;
  }

  function pintarCatalogo() {
    const lista = visibles();
    const bloque = el('ad-catalogo');
    if (!bloque) return;
    bloque.innerHTML = `<div class="panel">
  <div class="panel-head">
    <h2 class="font-title">Catálogo</h2>
    <p>Edita precios y stock, aprueba las piezas de la comunidad y retira lo que ya no tengas.</p>
  </div>
  ${lista.length === 0
    ? '<p class="muted">Ninguna pieza coincide con el filtro.</p>'
    : `<div class="desborda"><table class="tabla">
  <thead><tr><th>Pieza</th><th>Origen</th><th>Vendedor</th><th class="num">Precio</th><th class="num">Stock</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
  <tbody>${lista.map(filaProducto).join('')}</tbody>
</table></div>`}
</div>`;
    const recuento = el('ad-recuento');
    if (recuento) recuento.textContent = `${productos.length} piezas en total · ${lista.length} en la vista actual.`;
  }

  function vistaProductos() {
    const pendientes = productos.filter(p => p.estado === 'en_revision').length;
    el('ad-vista').innerHTML = `
${pendientes > 0
      ? `<div class="aviso">Hay <b>${pendientes}</b> ${pendientes === 1 ? 'publicación esperando' : 'publicaciones esperando'} revisión. Aprueba solo piezas con certificado verificable.</div>` : ''}
<div class="panel">
  <div class="panel-head">
    <h2 class="font-title">Filtros</h2>
    <p id="ad-recuento">${productos.length} piezas en total · ${visibles().length} en la vista actual.</p>
  </div>
  <div class="malla tres">
    <div class="campo">
      <label for="ad-estado">Estado</label>
      <select id="ad-estado">
        <option value="todos">Todos</option>
        <option value="publicado">Publicadas</option>
        <option value="en_revision">En revisión</option>
        <option value="rechazado">Rechazadas</option>
      </select>
    </div>
    <div class="campo">
      <label for="ad-origen">Origen</label>
      <select id="ad-origen">
        <option value="todos">Tienda y comunidad</option>
        <option value="tienda">Catálogo de la tienda</option>
        <option value="comunidad">Publicaciones de usuarios</option>
      </select>
    </div>
    <div class="campo">
      <label for="ad-busca">Buscar</label>
      <input id="ad-busca" placeholder="Nombre, colección, código o vendedor">
    </div>
  </div>
  <div class="fila-acciones">
    <button class="boton primario" id="ad-alta">${alta ? 'Cerrar el formulario' : 'Nueva pieza de la tienda'}</button>
  </div>
</div>
<div id="ad-alta-form"></div>
<div id="ad-edit-form"></div>
<div id="ad-catalogo"></div>`;

    el('ad-estado').value = filtroEstado;
    el('ad-origen').value = filtroOrigen;
    el('ad-busca').value = busca;

    el('ad-estado').addEventListener('change', e => { filtroEstado = e.target.value; pintarCatalogo(); });
    el('ad-origen').addEventListener('change', e => { filtroOrigen = e.target.value; pintarCatalogo(); });
    el('ad-busca').addEventListener('input', e => { busca = e.target.value; pintarCatalogo(); });
    el('ad-alta').addEventListener('click', () => {
      alta = !alta;
      if (!alta) el('ad-alta-form').innerHTML = '';
      el('ad-alta').textContent = alta ? 'Cerrar el formulario' : 'Nueva pieza de la tienda';
      if (alta) montarAlta();
    });

    if (alta) montarAlta();
    if (editando) montarEdicion(editando);
    pintarCatalogo();
  }

  function montarAlta() {
    montarFormProducto(el('ad-alta-form'), {
      usuario,
      alCancelar: () => { alta = false; el('ad-alta-form').innerHTML = ''; el('ad-alta').textContent = 'Nueva pieza de la tienda'; },
      alGuardar: p => { void cargarProductos(); aviso(`«${p.nombre}» entró al catálogo de la tienda.`); }
    });
  }

  function montarEdicion(p) {
    montarFormProducto(el('ad-edit-form'), {
      inicial: p,
      usuario,
      alCancelar: () => { editando = null; el('ad-edit-form').innerHTML = ''; },
      alGuardar: nuevo => {
        editando = null;
        el('ad-edit-form').innerHTML = '';
        void cargarProductos();
        aviso(`Guardaste los cambios de «${nuevo.nombre}».`);
      }
    });
  }

  /* ---------------- usuarios ---------------- */
  function visiblesUsuarios() {
    const t = buscaUsuarios.trim().toLowerCase();
    return t
      ? usuarios.filter(u => `${u.nombre} ${u.email} ${u.telefono}`.toLowerCase().includes(t))
      : usuarios;
  }

  function filaUsuario(u) {
    const yo = u.id === ses.usuario.id;
    const ocupadoAqui = ocupado === u.id;
    return `<tr>
  <td>
    <div class="celda-pieza">
      <span><b>${u.nombre}${yo ? ' (tú)' : ''}</b><em>${u.email}</em></span>
    </div>
  </td>
  <td>
    <div class="celda-pieza">
      <span><em>${u.telefono || 'Sin teléfono'}</em><em>${u.direccion || 'Sin dirección'}</em></span>
    </div>
  </td>
  <td>
    <select class=" selector-inline" aria-label="Rol de ${u.nombre}" data-rol="${u.id}"${yo || ocupadoAqui ? ' disabled' : ''}>
      ${escoge(ROLES, u.rol)}
    </select>
  </td>
  <td><span class="pico${u.estado === 'suspendido' ? ' suspendido' : ' tienda'}">${u.estado === 'suspendido' ? 'Suspendido' : 'Activo'}</span></td>
  <td>${fmtFecha(u.creado)}</td>
  <td>
    <div class="acciones">
      <button class="boton chico" data-suspender="${u.id}"${yo || ocupadoAqui ? ' disabled' : ''}>${u.estado === 'activo' ? 'Suspender' : 'Reactivar'}</button>
      <button class="boton chico fantasma" data-baja="${u.id}"${yo || ocupadoAqui ? ' disabled' : ''}>Eliminar</button>
    </div>
  </td>
</tr>`;
  }

  function vistaUsuarios() {
    const lista = visiblesUsuarios();
    el('ad-vista').innerHTML = `
<div class="panel">
  <div class="panel-head">
    <h2 class="font-title">Cuentas</h2>
    <p id="au-recuento">${usuarios.length} usuarios registrados · ${lista.length} en la vista actual.</p>
  </div>
  <div class="malla">
    <div class="campo">
      <label for="au-busca">Buscar</label>
      <input id="au-busca" placeholder="Nombre, correo o teléfono">
    </div>
    <div class="campo" style="justify-content:flex-end">
      <button class="boton primario" type="button" id="au-alta">${altaAbierta ? 'Cerrar el formulario' : 'Nueva cuenta'}</button>
    </div>
  </div>
  <div id="au-alta-form"></div>
</div>
<div class="panel">
  <div class="panel-head">
    <h2 class="font-title">Roles y estado</h2>
    <p>Cambia el rol para dar permiso de publicar, suspende una cuenta que vende piezas dudosas
      o elimina la que el cliente pidió cerrar. No puedes suspenderte ni eliminarte a ti mismo.</p>
  </div>
  <div id="au-tabla"></div>
</div>`;

    el('au-busca').value = buscaUsuarios;
    el('au-busca').addEventListener('input', e => {
      buscaUsuarios = e.target.value;
      pintarTablaUsuarios();
    });
    el('au-alta').addEventListener('click', () => {
      altaAbierta = !altaAbierta;
      el('au-alta').textContent = altaAbierta ? 'Cerrar el formulario' : 'Nueva cuenta';
      pintarAltaUsuario();
    });
    pintarAltaUsuario();
    pintarTablaUsuarios();
  }

  function pintarTablaUsuarios() {
    const lista = visiblesUsuarios();
    el('au-tabla').innerHTML = lista.length === 0
      ? '<p class="muted">Ningún usuario coincide con la búsqueda.</p>'
      : `<div class="desborda"><table class="tabla">
  <thead><tr><th>Usuario</th><th>Contacto</th><th>Rol</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
  <tbody>${lista.map(filaUsuario).join('')}</tbody>
</table></div>`;
    const recuento = el('au-recuento');
    if (recuento) recuento.textContent = `${usuarios.length} usuarios registrados · ${lista.length} en la vista actual.`;
  }

  function pintarAltaUsuario() {
    const cont = el('au-alta-form');
    if (!altaAbierta) { cont.innerHTML = ''; return; }
    cont.innerHTML = `<form id="au-form">
  <div class="malla tres" style="margin-top:16px">
    <div class="campo"><label for="ac-nombre">Nombre</label><input id="ac-nombre" placeholder="Marlon Díaz"></div>
    <div class="campo"><label for="ac-email">Correo</label><input id="ac-email" type="email" placeholder="correo@dominio.com"></div>
    <div class="campo"><label for="ac-rol">Rol</label><select id="ac-rol">${escoge(ROLES, altaUsuario.rol)}</select></div>
    <div class="campo"><label for="ac-tel">Teléfono</label><input id="ac-tel" placeholder="7890 1234"></div>
    <div class="campo"><label for="ac-dir">Dirección</label><input id="ac-dir" placeholder="Col. Escalón, San Salvador"></div>
    <div class="campo"><label for="ac-pw">Contraseña temporal</label><input id="ac-pw" type="password" placeholder="mínimo 6 caracteres"></div>
  </div>
  ${errorAlta ? `<p class="aviso malo">${errorAlta}</p>` : ''}
  <div class="fila-acciones">
    <button class="boton primario" type="submit"${ocupado === 'alta' ? ' disabled' : ''}>${ocupado === 'alta' ? 'Creando…' : 'Crear cuenta'}</button>
    <button class="boton fantasma" type="button" id="ac-cancelar">Cancelar</button>
  </div>
</form>`;

    el('ac-nombre').value = altaUsuario.nombre;
    el('ac-email').value = altaUsuario.email;
    el('ac-tel').value = altaUsuario.telefono;
    el('ac-dir').value = altaUsuario.direccion;
    el('ac-pw').value = altaUsuario.password;

    el('ac-nombre').addEventListener('input', e => { altaUsuario.nombre = e.target.value; });
    el('ac-email').addEventListener('input', e => {
      altaUsuario.email = e.target.value;
      if (!altaUsuario.nombre) {
        altaUsuario.nombre = nombreDesde(e.target.value);
        el('ac-nombre').value = altaUsuario.nombre;
      }
    });
    el('ac-rol').addEventListener('change', e => { altaUsuario.rol = e.target.value; });
    el('ac-tel').addEventListener('input', e => { altaUsuario.telefono = e.target.value; });
    el('ac-dir').addEventListener('input', e => { altaUsuario.direccion = e.target.value; });
    el('ac-pw').addEventListener('input', e => { altaUsuario.password = e.target.value; });
    el('ac-cancelar').addEventListener('click', () => {
      altaAbierta = false;
      errorAlta = '';
      el('au-alta').textContent = 'Nueva cuenta';
      pintarAltaUsuario();
    });
    el('au-form').addEventListener('submit', crearUsuario);
  }

  async function crearUsuario(ev) {
    ev.preventDefault();
    errorAlta = '';
    const correo = altaUsuario.email.trim().toLowerCase();
    if (altaUsuario.nombre.trim().length < 3) { errorAlta = 'Escribe el nombre del usuario.'; pintarAltaUsuario(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) { errorAlta = 'El correo no tiene un formato válido.'; pintarAltaUsuario(); return; }
    if (altaUsuario.password.length < 6) { errorAlta = 'La contraseña temporal debe tener al menos 6 caracteres.'; pintarAltaUsuario(); return; }

    ocupado = 'alta';
    pintarAltaUsuario();
    try {
      const u = await api.crearUsuario({
        nombre: altaUsuario.nombre.trim(),
        email: correo,
        telefono: altaUsuario.telefono.trim(),
        direccion: altaUsuario.direccion.trim(),
        rol: altaUsuario.rol,
        password: altaUsuario.password
      });
      await cargarPaneles();
      altaAbierta = false;
      altaUsuario = { ...ALTA_VACIA };
      aviso(`Cuenta creada para ${u.nombre} como ${u.rol}.`);
    } catch (err) {
      errorAlta = err instanceof Error ? err.message : 'No pudimos crear la cuenta.';
    } finally {
      ocupado = '';
      if (vista === 'usuarios') { el('au-alta').textContent = altaAbierta ? 'Cerrar el formulario' : 'Nueva cuenta'; pintarAltaUsuario(); }
    }
  }

  /* ---------------- pagos ---------------- */
  function filaPago(f) {
    const siguiente = puedeTransitar(f.estado, 'verificacion')
      ? 'verificacion'
      : puedeTransitar(f.estado, 'pagado')
        ? 'pagado'
        : puedeTransitar(f.estado, 'pendiente') ? 'pendiente' : null;
    const ocupadoAqui = ocupado === f.folio;
    return `<tr>
  <td>
    <div class="celda-pieza">
      <span><b>${f.folio}</b><em>${fmtFecha(f.fecha)} · vence ${fmtFecha(f.vence)}</em></span>
    </div>
  </td>
  <td>
    <div class="celda-pieza">
      <span><b>${f.comprador.nombre}</b><em>${f.comprador.rfc} · ${f.comprador.ciudad}</em></span>
    </div>
  </td>
  <td class="num">${usd(f.totales.total)}</td>
  <td><span class="pico estado-${f.estado}">${ESTADO_PAGO[f.estado]}</span></td>
  <td>${f.avisos.length
      ? `<button class="boton chico fantasma" data-avisos="${f.folio}">${avisosAbiertos === f.folio ? 'Ocultar' : `Ver ${f.avisos.length}`}</button>`
      : '<em class="muted">Sin avisos</em>'}</td>
  <td>
    <div class="acciones">
      ${siguiente ? `<button class="boton chico primario" data-transito="${siguiente}" data-folio="${f.folio}"${ocupadoAqui ? ' disabled' : ''}>${ETIQUETA[siguiente]}</button>` : ''}
      ${f.estado !== 'pagado' && f.estado !== 'anulada'
        ? `<button class="boton chico fantasma" data-transito="anulada" data-folio="${f.folio}"${ocupadoAqui ? ' disabled' : ''}>Anular</button>` : ''}
    </div>
  </td>
</tr>`;
  }

  function vistaPagos() {
    if (facturas.length === 0) {
      el('ad-vista').innerHTML = `<div class="panel">
  <div class="panel-head">
    <h2 class="font-title">Pagos</h2>
    <p>Aún no hay facturas emitidas. Cuando un comprador confirme un pedido aparece aquí.</p>
  </div>
</div>`;
      return;
    }
    el('ad-vista').innerHTML = `<div class="panel">
  <div class="panel-head">
    <h2 class="font-title">Pagos</h2>
    <p>pendiente → verificación → pagado. Un aviso de transferencia pone la factura en verificación;
      al conciliarla se marca como pagada. Anular devuelve las piezas al stock.</p>
  </div>
  <div id="ap-tabla"></div>
  <div id="ap-detalle"></div>
</div>`;
    pintarPagos();
  }

  function pintarPagos() {
    const ordenadas = facturas.slice().reverse();
    el('ap-tabla').innerHTML = `<div class="desborda"><table class="tabla">
  <thead><tr><th>Folio</th><th>Comprador</th><th class="num">Total</th><th>Estado</th><th>Aviso de pago</th><th>Acciones</th></tr></thead>
  <tbody>${ordenadas.map(filaPago).join('')}</tbody>
</table></div>`;
    const detalle = el('ap-detalle');
    const f = ordenadas.find(x => x.folio === avisosAbiertos);
    detalle.innerHTML = f
      ? `<div class="aviso bueno" style="margin-top:16px"><div>
  <b>${f.folio}</b>
  <ul>${f.avisos.map(a => `<li>${resumenAviso(a)}</li>`).join('')}</ul>
  ${f.registro ? `<p>Conciliada: ${resumenAviso(f.registro)}</p>` : ''}
  ${f.anulada ? `<p>Anulada el ${fmtFecha(f.anulada)}. Las piezas volvieron al stock.</p>` : ''}
</div></div>` : '';
  }

  /* ---------------- navegación y acciones ---------------- */
  function pintarVista() {
    document.querySelectorAll('#admin [data-vista]').forEach(b =>
      b.classList.toggle('primario', b.dataset.vista === vista));
    if (vista === 'productos') vistaProductos();
    else if (vista === 'usuarios') vistaUsuarios();
    else vistaPagos();
  }

  cont.addEventListener('click', async e => {
    const tab = e.target.closest('[data-vista]');
    if (tab) {
      vista = tab.dataset.vista;
      pintarVista();
      return;
    }

    const transito = e.target.closest('[data-transito]');
    if (transito) {
      const f = facturas.find(x => x.folio === transito.dataset.folio);
      ocupado = f.folio;
      pintarPagos();
      try {
        const nueva = await api.cambiarEstadoPago(f.folio, transito.dataset.transito);
        await cargarPaneles();
        await cargarProductos();
        aviso(transito.dataset.transito === 'pagado'
          ? `Factura ${nueva.folio} conciliada: ${usd(nueva.totales.total)}.`
          : `Factura ${nueva.folio} pasó a ${ESTADO_PAGO[nueva.estado].toLowerCase()}.`);
      } catch (err) {
        aviso(err instanceof Error ? err.message : 'El servidor rechazó esa transición.', 4200);
      } finally {
        ocupado = '';
        if (vista === 'pagos') pintarPagos();
      }
      return;
    }

    const verAvisos = e.target.closest('[data-avisos]');
    if (verAvisos) {
      avisosAbiertos = avisosAbiertos === verAvisos.dataset.avisos ? '' : verAvisos.dataset.avisos;
      pintarPagos();
      return;
    }

    const suspender = e.target.closest('[data-suspender]');
    if (suspender) {
      const u = usuarios.find(x => x.id === suspender.dataset.suspender);
      const nuevo = u.estado === 'activo' ? 'suspendido' : 'activo';
      ocupado = u.id;
      pintarTablaUsuarios();
      try {
        await api.actualizarUsuario(u.id, { estado: nuevo });
        await cargarPaneles();
        aviso(nuevo === 'suspendido' ? `Suspendiste a ${u.nombre}.` : `Reactivaste a ${u.nombre}.`);
      } catch (err) {
        aviso(err instanceof Error ? err.message : 'No pudimos guardar el cambio.', 4200);
      } finally {
        ocupado = '';
        if (vista === 'usuarios') pintarTablaUsuarios();
      }
      return;
    }

    const baja = e.target.closest('[data-baja]');
    if (baja) {
      const u = usuarios.find(x => x.id === baja.dataset.baja);
      if (!window.confirm(`¿Eliminar la cuenta de ${u.nombre}? Se queda sin efecto sobre las facturas ya emitidas.`)) return;
      ocupado = u.id;
      try {
        await api.eliminarUsuario(u.id);
        await cargarPaneles();
        aviso(`Eliminaste la cuenta de ${u.nombre}.`);
      } catch (err) {
        aviso(err instanceof Error ? err.message : 'No pudimos eliminar la cuenta.', 4200);
      } finally {
        ocupado = '';
        if (vista === 'usuarios') pintarTablaUsuarios();
      }
      return;
    }

    const cambiar = e.target.closest('[data-estado]');
    if (cambiar) {
      const p = productos.find(x => x.id === cambiar.dataset.id);
      const estado = cambiar.dataset.estado;
      ocupado = p.id;
      pintarCatalogo();
      try {
        await api.actualizarProducto(p.id, { estado });
        await cargarProductos();
        aviso(estado === 'publicado'
          ? `«${p.nombre}» quedó publicada en la vitrina.`
          : `«${p.nombre}» quedó rechazada; el vendedor puede corregirla y reenviarla.`);
      } catch (err) {
        aviso(err instanceof Error ? err.message : 'No pudimos actualizar la publicación.', 4200);
      } finally {
        ocupado = '';
        if (vista === 'productos') pintarCatalogo();
      }
      return;
    }

    const eliminar = e.target.closest('[data-eliminar]');
    if (eliminar) {
      const p = productos.find(x => x.id === eliminar.dataset.eliminar);
      if (!window.confirm(`¿Eliminar «${p.nombre}» del catálogo? Esta acción no se puede deshacer.`)) return;
      ocupado = p.id;
      try {
        await api.eliminarProducto(p.id);
        await cargarProductos();
        aviso(`Eliminaste «${p.nombre}».`);
      } catch (err) {
        aviso(err instanceof Error ? err.message : 'No pudimos eliminar la pieza.', 4200);
      } finally {
        ocupado = '';
        if (vista === 'productos') pintarCatalogo();
      }
      return;
    }

    const editar = e.target.closest('[data-editar]');
    if (editar && vista === 'productos') {
      editando = productos.find(x => x.id === editar.dataset.editar) || null;
      alta = false;
      el('ad-alta-form').innerHTML = '';
      el('ad-alta').textContent = 'Nueva pieza de la tienda';
      montarEdicion(editando);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  cont.addEventListener('change', async e => {
    const rol = e.target.closest('[data-rol]');
    if (!rol) return;
    const u = usuarios.find(x => x.id === rol.dataset.rol);
    ocupado = u.id;
    try {
      await api.actualizarUsuario(u.id, { rol: rol.value });
      await cargarPaneles();
      aviso(`Ahora ${u.nombre} es ${rol.value}.`);
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No pudimos guardar el cambio.', 4200);
    } finally {
      ocupado = '';
      if (vista === 'usuarios') pintarTablaUsuarios();
    }
  });

  await cargarPaneles();
  await cargarProductos();
  pintarVista();
}
