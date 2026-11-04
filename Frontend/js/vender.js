/**
 * vender.html: el panel del vendedor. Espejo de app/(tienda)/vender/page.tsx.
 *
 * La tabla se vuelve a tirar completa cada vez que cambia el catálogo; el
 * formulario de alta es un módulo aparte (js/form-producto.js) que se monta una
 * sola vez y solo se le cambian los valores cuando pasas a editar otra pieza.
 */
import { api } from './api.js';
import { fmtFecha } from './factura.js';
import { montarFormProducto } from './form-producto.js';
import { usd } from './moneda.js';
import { sesionAlmacenada, suscribirSesion } from './sesion.js';
import { aviso, blindarVista, montarShell, RUTA } from './ui.js';

const ESTADOS = {
  publicado: { texto: 'Publicada', clase: 'pico tienda' },
  en_revision: { texto: 'En revisión', clase: 'pico revision' },
  rechazado: { texto: 'Rechazada', clase: 'pico rechazado' }
};

const el = id => document.getElementById(id);

montarShell();

if (blindarVista()) {
  if (sesionAlmacenada()) montarPanel();
  else pintarSinCuenta();
}

/**
 * Invitado: la puerta ya lo dejó pasar, pero publicar pide cuenta. Es el mismo
 * panel que devuelve page.tsx cuando `sesion` es null.
 */
function pintarSinCuenta() {
  el('vender').innerHTML = `<section class="contenedor">
  <div class="panel">
    <div class="panel-head">
      <h2 class="font-title">Para vender necesitas una cuenta</h2>
      <p>Publica tus cartas con foto, graduación y precio. Revisamos cada pieza antes de mostrarla en la vitrina.</p>
    </div>
    <div class="fila-acciones">
      <a class="boton primario" href="${RUTA.login}">Iniciar sesión</a>
      <a class="boton" href="${RUTA.registro}">Crear cuenta</a>
    </div>
  </div>
</section>`;
}

async function montarPanel() {
  const cont = el('vender');
  let productos = [];
  let editando = null;
  let ocupado = '';
  let error = '';
  let formulario = null;

  const sesion = () => sesionAlmacenada();

  async function recargar() {
    try {
      productos = await api.productos();
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'No pudimos leer el catálogo.';
    }
    pintarLista();
  }

  function mias() {
    const s = sesion();
    return s ? productos.filter(p => p.vendedorId === s.usuario.id) : [];
  }

  function filaHtml(p) {
    const estado = ESTADOS[p.estado];
    return `<tr>
  <td>
    <div class="celda-pieza">
      <img class="mini" src="${p.imagen}" alt="" loading="lazy">
      <span><b>${p.nombre}</b><em>${p.set}${p.numero ? ` · ${p.numero}` : ''}</em></span>
    </div>
  </td>
  <td>${p.certificadora}${p.nota ? ` · ${p.nota}` : ''}</td>
  <td class="num">${usd(p.precio)}</td>
  <td class="num">${p.unica ? '1/1' : p.stock}</td>
  <td><span class="${estado.clase}">${estado.texto}</span></td>
  <td>${fmtFecha(p.creado)}</td>
  <td>
    <div class="acciones">
      <button class="boton chico" data-editar="${p.id}">Editar</button>
      ${p.estado === 'rechazado'
        ? `<button class="boton chico" data-reenviar="${p.id}"${ocupado === p.id ? ' disabled' : ''}>Reenviar</button>` : ''}
      <button class="boton chico fantasma" data-retirar="${p.id}"${ocupado === p.id ? ' disabled' : ''}>Retirar</button>
    </div>
  </td>
</tr>`;
  }

  function pintarLista() {
    const propias = mias();
    cont.querySelector('#panel-mias').innerHTML = `<div class="panel-head">
  <h2 class="font-title">Tus publicaciones</h2>
  <p>${propias.length ? `${propias.length} ${propias.length === 1 ? 'pieza' : 'piezas'} en esta cuenta.` : 'Todavía no has publicado piezas.'}</p>
</div>
${error ? `<p class="aviso malo">${error}</p>` : ''}
${propias.length > 0
      ? `<div class="desborda"><table class="tabla">
  <thead><tr><th>Pieza</th><th>Certificación</th><th class="num">Precio</th><th class="num">Stock</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
  <tbody>${propias.map(filaHtml).join('')}</tbody>
</table></div>` : ''}
<div class="fila-acciones">
  <a class="boton" href="${RUTA.comunidad}">Ver vitrina de la comunidad</a>
  <a class="boton fantasma" href="${RUTA.inicio}">Volver a la tienda</a>
</div>`;
  }

  function pintar() {
    const s = sesion();
    const u = s ? s.usuario : null;
    cont.innerHTML = `<section class="contenedor">
  <div class="panel">
    <div class="panel-head">
      <h2 class="font-title">Hola, ${u ? u.nombre : ''}</h2>
      <p>${s && s.usuario.rol === 'administrador'
        ? 'Estás dentro como administrador: lo que publiques va al catálogo de la tienda y se ve de inmediato.'
        : 'Llenas los datos de la pieza, subes su foto y la mandas a revisión. Si la aprobamos, entra a la vitrina con tu nombre como vendedor.'}</p>
    </div>
  </div>
  <div id="formulario"></div>
  <div id="panel-mias" class="panel"></div>
</section>`;

    formulario = montarFormProducto(el('formulario'), {
      inicial: editando,
      usuario: u,
      alGuardar(p) {
        setEditando(null);
        void recargar();
        aviso(p.estado === 'publicado'
          ? `«${p.nombre}» quedó publicada en la vitrina.`
          : `«${p.nombre}» pasó a revisión. Te avisamos cuando se publique.`);
      }
    });
    pintarLista();
  }

  /** Editar es cambiar la pieza que tiene el formulario arriba, no montar otro. */
  function setEditando(p) {
    editando = p;
    formulario.cambiar(p, p ? () => setEditando(null) : null);
  }

  async function retirar(p) {
    if (!window.confirm(`¿Retirar «${p.nombre}» de la vitrina? Esta acción no se puede deshacer.`)) return;
    ocupado = p.id;
    pintarLista();
    try {
      await api.eliminarProducto(p.id);
      await recargar();
      aviso(p.origen === 'tienda' ? 'Pieza retirada del catálogo de la tienda.' : 'Retiraste tu publicación.');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No pudimos retirar la pieza.', 4200);
    } finally {
      ocupado = '';
      pintarLista();
    }
  }

  async function republicar(p) {
    ocupado = p.id;
    pintarLista();
    try {
      await api.actualizarProducto(p.id, { estado: 'en_revision' });
      await recargar();
      aviso('La enviamos otra vez a revisión.');
    } catch (err) {
      aviso(err instanceof Error ? err.message : 'No pudimos reenviarla.', 4200);
    } finally {
      ocupado = '';
      pintarLista();
    }
  }

  cont.addEventListener('click', e => {
    const editar = e.target.closest('[data-editar]');
    const reenviar = e.target.closest('[data-reenviar]');
    const retirarB = e.target.closest('[data-retirar]');
    const id = (editar || reenviar || retirarB || {}).dataset;
    if (!id) return;
    const p = productos.find(x => x.id === (editar ? id.editar : reenviar ? id.reenviar : id.retirar));
    if (!p) return;
    if (editar) {
      setEditando(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (reenviar) republicar(p);
    else retirar(p);
  });

  suscribirSesion(() => location.reload());

  pintar();
  await recargar();
}
