/**
 * Alta/edición de una publicación. Espejo de components/FormProducto.tsx:
 * lo usan vender.html y el panel de administración (catálogo de la tienda).
 *
 * El marcado se escribe una sola vez y los valores se asignan por propiedad
 * (input.value = …) en lugar de ir dentro del HTML: así el formulario sigue
 * funcionando aunque la pieza traiga comillas o texto raro en su nombre.
 */
import { api } from './api.js';
import { colorHalo, etiquetaCertificacion, halo } from './halo.js';
import { usd } from './moneda.js';

const CERTIFICADORAS = ['CGC', 'PSA', 'BGS', 'SGS Beam', 'Sin graduar'];
const RAREZAS = [
  'Holo Rare', 'Ultra Rare — Full Art', 'Special Illustration Rare', 'Secret Rare — Full Art',
  'Radiant Rare', 'VSTAR', 'Sin graduar'
];
const IDIOMAS = ['Inglés', 'Español', 'Japonés', 'Indistinto'];

const VACIO = {
  nombre: '', descripcion: '', set: '', numero: '', rareza: RAREZAS[0],
  etiqueta: '', codigo: '', certificadora: 'CGC', nota: 'Gem Mint 10', numeroCertificado: '',
  anio: '', idioma: 'Inglés', centrado: '', conservacion: '', precio: '', stock: '1',
  unica: false, imagen: ''
};

const CAMPOS_TEXTO = ['nombre', 'descripcion', 'set', 'numero', 'etiqueta', 'codigo', 'nota',
  'numeroCertificado', 'anio', 'centrado', 'conservacion', 'precio', 'stock'];

function desdeProducto(p) {
  return {
    nombre: p.nombre, descripcion: p.descripcion, set: p.set, numero: p.numero,
    rareza: p.rareza, etiqueta: p.etiqueta, codigo: p.codigo, certificadora: p.certificadora,
    nota: p.nota, numeroCertificado: p.numeroCertificado, anio: p.anio ?? '',
    idioma: p.idioma ?? '', centrado: p.centrado ?? '', conservacion: p.conservacion ?? '',
    precio: String(p.precio), stock: String(p.stock), unica: p.unica, imagen: p.imagen
  };
}

const opciones = lista => lista.map(v => `<option value="${v}">${v}</option>`).join('');

function mallaHtml() {
  return `<div class="malla">
  <div class="campo ancho" data-caja="nombre">
    <label for="f-nombre">Nombre de la pieza</label>
    <input id="f-nombre" data-k="nombre" placeholder="Charizard 1ª Edición">
    <span class="error" data-error="nombre" hidden></span>
  </div>

  <div class="campo ancho" data-caja="descripcion">
    <label for="f-desc">Descripción</label>
    <textarea id="f-desc" rows="4" data-k="descripcion" placeholder="Estado de la carta y de la cápsula, centrado, procedencia del lote y cualquier detalle que un coleccionista preguntaría."></textarea>
    <span class="error" data-error="descripcion" hidden></span>
    <span class="ayuda" data-ayuda="descripcion">Se muestra en la ficha de la carta, tal cual la escribiste.</span>
  </div>

  <div class="campo" data-caja="set">
    <label for="f-set">Colección / serie</label>
    <input id="f-set" data-k="set" placeholder="Base Set">
    <span class="error" data-error="set" hidden></span>
  </div>
  <div class="campo">
    <label for="f-num">Número en la colección</label>
    <input id="f-num" data-k="numero" placeholder="004/102">
  </div>

  <div class="campo">
    <label for="f-rareza">Rareza</label>
    <select id="f-rareza" data-k="rareza">${opciones(RAREZAS)}</select>
  </div>
  <div class="campo">
    <label for="f-etiqueta">Etiqueta corta</label>
    <input id="f-etiqueta" data-k="etiqueta" placeholder="1ª edición">
    <span class="ayuda">Aparece en la esquina de la carta en la vitrina.</span>
  </div>

  <div class="campo">
    <label for="f-cert">Certificadora</label>
    <select id="f-cert" data-k="certificadora">${opciones(CERTIFICADORAS)}</select>
  </div>
  <div class="campo" data-caja="nota">
    <label for="f-nota">Nota de graduación</label>
    <input id="f-nota" data-k="nota" placeholder="Gem Mint 10">
    <span class="error" data-error="nota" hidden></span>
  </div>

  <div class="campo" data-caja="numeroCertificado">
    <label for="f-numcert">Número de certificado</label>
    <input id="f-numcert" data-k="numeroCertificado" placeholder="6421907-001">
    <span class="error" data-error="numeroCertificado" hidden></span>
  </div>
  <div class="campo">
    <label for="f-centrado">Centering</label>
    <input id="f-centrado" data-k="centrado" placeholder="55/65">
  </div>

  <div class="campo">
    <label for="f-anio">Año</label>
    <input id="f-anio" data-k="anio" placeholder="1999">
  </div>
  <div class="campo">
    <label for="f-idioma">Idioma</label>
    <select id="f-idioma" data-k="idioma">${opciones(IDIOMAS)}</select>
  </div>

  <div class="campo ancho">
    <label for="f-conserva">Estado de conservación</label>
    <input id="f-conserva" data-k="conservacion" placeholder="Sin daños visibles, foil sin rayas">
  </div>

  <div class="campo" data-caja="precio">
    <label for="f-precio">Precio (US$)</label>
    <input id="f-precio" data-k="precio" inputmode="decimal" placeholder="165">
    <span class="error" data-error="precio" hidden></span>
    <span class="ayuda">Precio final al comprador, en dólares. IVA y envío se calculan en la factura.</span>
  </div>
  <div class="campo" data-caja="stock">
    <label for="f-stock">Unidades en stock</label>
    <input id="f-stock" data-k="stock" inputmode="numeric" placeholder="1">
    <span class="error" data-error="stock" hidden></span>
  </div>

  <div class="campo ancho">
    <label class="marca">
      <input type="checkbox" id="f-unica" data-k="unica">
      Es una pieza única (1/1)
    </label>
    <span class="ayuda">La vitrina la resalta y no se puede vender más de una.</span>
  </div>

  <div class="campo ancho" data-caja="imagen" id="caja-foto"></div>
</div>`;
}

function fotoSinImagen() {
  return `<label for="f-foto">Foto de la pieza</label>
<div class="sube">
  <span>Sube la foto de la pieza o de su cápsula. PNG, JPG, WEBP o AVIF hasta 6 MB.</span>
  <input id="f-foto" type="file" accept="image/png,image/jpeg,image/webp,image/avif">
</div>
<span class="error" data-error="imagen" hidden></span>`;
}

function fotoConImagen() {
  return `<label for="f-foto">Foto de la pieza</label>
<div class="sube on">
  <div class="previo">
    <img src="" alt="Vista previa de la foto cargada">
    <div>
      <span>Foto cargada. Se muestra tal cual en la vitrina.</span>
      <div class="fila-acciones" style="margin-top:8px">
        <button type="button" class="boton chico fantasma" id="f-cambiar">Cambiar foto</button>
        <button type="button" class="boton chico fantasma" id="f-quitar">Quitar</button>
      </div>
    </div>
  </div>
</div>
<input id="f-foto" type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif">
<span class="error" data-error="imagen" hidden></span>`;
}

/**
 * Monta el formulario dentro de `cont` y devuelve { limpiar }.
 * `alGuardar(producto)` se llama al crear o actualizar; `alCancelar` pinta el botón.
 */
export function montarFormProducto(cont, { inicial = null, usuario = null, alGuardar, alCancelar = null } = {}) {
  let c = inicial ? desdeProducto(inicial) : { ...VACIO };
  let errores = {};
  let enviando = false;
  let aviso = '';
  let cancelar = alCancelar;

  cont.innerHTML = `<form class="panel" novalidate>
  <div class="panel-head">
    <h2 class="font-title">${inicial ? 'Editar publicación' : 'Publicar una pieza'}</h2>
    <p>${usuario && usuario.rol === 'administrador'
      ? 'Como administrador, lo que publiques entra directo a la vitrina de la tienda.'
      : 'Las publicaciones de la comunidad se revisan antes de verse en la vitrina. Te avisamos cuando quede publicada.'}</p>
  </div>
  ${mallaHtml()}
  <div class="panel-head" style="margin-top:26px">
    <h2 class="font-title" style="font-size:max(18px, 1rem)">Así se verá en la vitrina</h2>
  </div>
  <div class="vista-previa" id="previa"></div>
  <p class="aviso malo" id="aviso-form" role="status" aria-live="polite" hidden></p>
  <div class="fila-acciones">
    <button class="boton primario" type="submit" id="f-enviar">Publicar pieza</button>
    <button class="boton fantasma" type="button" id="f-cancelar"${cancelar ? '' : ' hidden'}>Cancelar</button>
  </div>
</form>`;

  const $ = sel => cont.querySelector(sel);
  const inputs = {};
  cont.querySelectorAll('[data-k]').forEach(n => { inputs[n.dataset.k] = n; });

  function escribirValores() {
    CAMPOS_TEXTO.forEach(k => { if (inputs[k]) inputs[k].value = c[k]; });
    ['rareza', 'certificadora', 'idioma'].forEach(k => { if (inputs[k]) inputs[k].value = c[k]; });
    inputs.unica.checked = !!c.unica;
    inputs.stock.disabled = !!c.unica;
    inputs.stock.value = c.unica ? '1' : c.stock;
  }

  function pintarFoto() {
    const caja = $('#caja-foto');
    caja.innerHTML = c.imagen ? fotoConImagen() : fotoSinImagen();
    if (c.imagen) {
      caja.querySelector('.previo img').src = c.imagen;
      caja.querySelector('#f-cambiar').addEventListener('click', () => caja.querySelector('input[type=file]').click());
      caja.querySelector('#f-quitar').addEventListener('click', () => {
        c.imagen = '';
        pintarFoto(); pintarPrevia();
      });
    }
    caja.querySelector('input[type=file]').addEventListener('change', e => subirArchivo(e.target.files && e.target.files[0]));
    marcarError('imagen');
  }

  function preview() {
    const precioNum = Number(String(c.precio).replace(',', '.'));
    const stockNum = Math.max(0, Math.round(Number(c.stock) || 0));
    return {
      nombre: c.nombre || 'Nombre de la pieza',
      rareza: c.rareza,
      etiqueta: c.etiqueta || c.set || 'Pokémon',
      certificadora: c.certificadora,
      nota: c.nota,
      precio: Number.isFinite(precioNum) ? precioNum : 0,
      stock: c.unica ? 1 : stockNum
    };
  }

  function pintarPrevia() {
    const p = preview();
    $('#previa').innerHTML = c.imagen
      ? `<img class="card-previa" style="--gl:${halo(p)};--glc:${colorHalo(p)}" src="${c.imagen}" alt="Vista previa de la ficha">`
      : '<div class="card-previa vacia">Aquí aparecerá la carta con el brillo que le dé su rareza y su nota.</div>';
    $('#previa').insertAdjacentHTML('beforeend', `<dl class="datos">
  <dt>Pieza</dt><dd>${p.nombre}</dd>
  <dt>Colección</dt><dd>${c.set || '—'}</dd>
  <dt>Rareza</dt><dd>${p.rareza}</dd>
  <dt>Certificación</dt><dd>${etiquetaCertificacion(p)}</dd>
  <dt>Precio</dt><dd>${usd(p.precio)}</dd>
  <dt>Disponibilidad</dt><dd>${c.unica ? 'Pieza única 1/1' : `${p.stock} ${p.stock === 1 ? 'unidad' : 'unidades'}`}</dd>
</dl>`);
  }

  function marcarError(k) {
    const nota = cont.querySelector(`[data-error="${k}"]`);
    const caja = cont.querySelector(`[data-caja="${k}"]`);
    const texto = errores[k] || '';
    if (nota) {
      nota.textContent = texto;
      nota.hidden = !texto;
    }
    if (caja) caja.classList.toggle('malo', !!texto);
    if (k === 'descripcion') {
      const ayuda = cont.querySelector('[data-ayuda="descripcion"]');
      if (ayuda) ayuda.hidden = !!texto;
    }
  }

  const CLAVES_ERROR = ['nombre', 'descripcion', 'set', 'precio', 'stock', 'imagen', 'nota', 'numeroCertificado'];

  function pintarErrores() { CLAVES_ERROR.forEach(k => marcarError(k)); }

  function pintarEstado() {
    $('#aviso-form').textContent = aviso;
    $('#aviso-form').hidden = !aviso;
    const enviar = $('#f-enviar');
    enviar.disabled = enviando;
    enviar.textContent = enviando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Publicar pieza';
    $('#f-cancelar').hidden = !cancelar;
  }

  function validar() {
    const e = {};
    const precioNum = Number(String(c.precio).replace(',', '.'));
    const stockNum = Math.max(0, Math.round(Number(c.stock) || 0));
    if (c.nombre.trim().length < 3) e.nombre = 'Escribe el nombre de la pieza.';
    if (c.descripcion.trim().length < 15) e.descripcion = 'Describe la carta en al menos 15 caracteres: estado de la cápsula, centrado, procedencia.';
    if (!c.set.trim()) e.set = 'Indica la colección o serie.';
    if (!Number.isFinite(precioNum) || precioNum <= 0) e.precio = 'El precio debe ser un número mayor que 0 (en dólares).';
    if (!c.unica && stockNum < 1) e.stock = 'Debe haber al menos 1 unidad en stock.';
    if (!c.imagen) e.imagen = 'Sube una foto de la pieza o de su cápsula.';
    if (c.certificadora !== 'Sin graduar' && !c.nota.trim()) e.nota = 'Indica la nota de la certificadora, p. ej. Gem Mint 10.';
    if (c.certificadora !== 'Sin graduar' && !c.numeroCertificado.trim()) {
      e.numeroCertificado = 'Incluye el número de certificado para que el comprador lo verifique.';
    }
    return e;
  }

  async function subirArchivo(archivo) {
    if (!archivo) return;
    if (!/^image\/(png|jpe?g|webp|avif)$/i.test(archivo.type)) {
      errores = { ...errores, imagen: 'Formatos aceptados: PNG, JPG, WEBP o AVIF.' };
      marcarError('imagen');
      return;
    }
    if (archivo.size > 6 * 1024 * 1024) {
      errores = { ...errores, imagen: 'La foto pesa demasiado: máximo 6 MB.' };
      marcarError('imagen');
      return;
    }
    aviso = 'Subiendo foto…';
    pintarEstado();
    try {
      c.imagen = await api.subirImagen(archivo);
      errores = { ...errores, imagen: '' };
      aviso = '';
      pintarFoto();
      pintarPrevia();
    } catch (err) {
      aviso = err instanceof Error ? err.message : 'No pudimos subir esa foto.';
    }
    pintarEstado();
  }

  cont.addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    c[k] = k === 'unica' ? e.target.checked : e.target.value;
    if (k === 'unica') {
      inputs.stock.disabled = c.unica;
      inputs.stock.value = c.unica ? '1' : c.stock;
    }
    if (errores[k]) { errores = { ...errores, [k]: '' }; marcarError(k); }
    pintarPrevia();
  });

  cont.querySelector('form').addEventListener('submit', async ev => {
    ev.preventDefault();
    errores = validar();
    pintarErrores();
    if (Object.keys(errores).length) {
      aviso = 'Revisa los campos marcados antes de publicar.';
      pintarEstado();
      return;
    }

    enviando = true;
    aviso = '';
    pintarEstado();

    const precioNum = Number(String(c.precio).replace(',', '.'));
    const stockNum = Math.max(0, Math.round(Number(c.stock) || 0));
    const borrador = {
      id: inicial ? inicial.id : undefined,
      nombre: c.nombre.trim(),
      descripcion: c.descripcion.trim(),
      categoria: 'carta',
      set: c.set.trim(),
      numero: c.numero.trim(),
      rareza: c.rareza,
      etiqueta: c.etiqueta.trim() || c.set.trim(),
      codigo: (c.codigo.trim() || `${c.set.trim()} ${c.numero.trim()}`).trim(),
      certificadora: c.certificadora,
      nota: c.nota.trim() || 'Sin graduar',
      numeroCertificado: c.numeroCertificado.trim() || '—',
      anio: c.anio.trim() || undefined,
      idioma: c.idioma.trim() || undefined,
      centrado: c.centrado.trim() || undefined,
      conservacion: c.conservacion.trim() || undefined,
      precio: Math.round(precioNum * 100) / 100,
      stock: c.unica ? 1 : stockNum,
      imagen: c.imagen,
      unica: c.unica
    };

    try {
      const producto = inicial
        ? await api.actualizarProducto(inicial.id, borrador)
        : await api.crearProducto(borrador, usuario);
      if (!inicial) {
        c = { ...VACIO };
        escribirValores();
        pintarFoto();
        pintarPrevia();
      }
      if (alGuardar) alGuardar(producto);
    } catch (err) {
      aviso = err instanceof Error ? err.message : 'No pudimos guardar la publicación.';
    } finally {
      enviando = false;
      pintarEstado();
    }
  });

  const botonCancelar = $('#f-cancelar');
  if (botonCancelar) botonCancelar.addEventListener('click', () => { if (cancelar) cancelar(); });

  escribirValores();
  pintarFoto();
  pintarPrevia();
  pintarEstado();

  return {
    /** Pasar de publicar a editar una pieza (o volver al formulario vacío). */
    cambiar(nueva, cancel) {
      inicial = nueva || null;
      if (cancel !== undefined) cancelar = cancel || null;
      c = inicial ? desdeProducto(inicial) : { ...VACIO };
      errores = {};
      aviso = '';
      cont.querySelector('.panel-head h2').textContent = inicial ? 'Editar publicación' : 'Publicar una pieza';
      escribirValores();
      pintarFoto();
      pintarPrevia();
      pintarErrores();
      pintarEstado();
    }
  };
}
