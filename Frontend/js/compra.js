/**
 * carrito.html: la vista del comprador. Es la traducción de
 * app/(tienda)/carrito/page.tsx con sus cuatro componentes
 * (LineasCarrito, FormComprador, DocumentoFactura, PanelPago).
 *
 * Se pinta por bloques y cada bloque se re-tira solo cuando cambia lo que le
 * alimenta; el formulario NO se repinta al teclear, porque eso perdería el
 * cursor del usuario.
 */
import {
  cambiarCantidad, devolverAlCarrito, lineaDe, quitarDelCarrito, resumen,
  suscribirCarrito, vaciarCarrito
} from './carrito.js';
import {
  DATOS_INICIALES, FORMAS_PAGO, compradorDesde, desdeUsuario, esValido,
  erroresDe, mascaraDui
} from './comprador.js';
import { api } from './api.js';
import { etiquetaCertificacion } from './halo.js';
import {
  BANCO, DEPARTAMENTOS, ESTADO_PAGO, PROMOCIONES, calcularTotales, fmtFecha,
  lineaDesdeCarrito, puedeTransitar, resumenAviso
} from './factura.js';
import { documentoFactura, nombreArchivoFactura, paginaFactura } from './factura-documento.js';
import { conLetra, usd } from './moneda.js';
import { leerSesion } from './sesion.js';
import { aviso, blindarVista, montarShell, RUTA } from './ui.js';

const BANCOS = [
  'Banco Cuscatlán', 'Banco Agrícola', 'Banco Davivienda', 'Banco Hipotecario de El Salvador',
  'Banco Promerica', 'Banco Azul', 'Otro banco'
];

const MENSAJE = {
  pendiente: 'Reservamos tus piezas mientras transferiste. Cuando nos avises, tu factura pasa a verificación.',
  verificacion: 'Recibimos tu aviso. Estamos conciliando el movimiento contra el estado de cuenta del banco.',
  pagado: 'Pago conciliado. Preparamos el envío asegurado y te escribimos por correo con la guía.',
  anulada: 'Pedido anulado: las piezas volvieron a la bóveda y a tu Pokédex.'
};

const CAMPOS = [
  { k: 'nombre', label: 'Nombre o razón social', placeholder: 'Ana Ruiz de Méndez / Distribuidora X, S.A.', autoc: 'name' },
  { k: 'rfc', label: 'DUI', placeholder: '06145533-4', mascara: mascaraDui, max: 10 },
  { k: 'email', label: 'Correo electrónico', placeholder: 'ana@correo.com', tipo: 'email', autoc: 'email' },
  { k: 'telefono', label: 'Teléfono (+503)', placeholder: '7890 1234', tipo: 'tel', autoc: 'tel' },
  { k: 'direccion', label: 'Dirección de entrega (colonia, calle, número)', placeholder: 'Calle Las Jacarandas No. 45, Col. San Benito', ancho: true, autoc: 'street-address' },
  { k: 'ciudad', label: 'Municipio', placeholder: 'San Salvador', autoc: 'address-level2' },
  { k: 'cp', label: 'Código postal', placeholder: '1101', tipo: 'numeric', autoc: 'postal-code' }
];

const el = id => document.getElementById(id);
const plural = n => (n === 1 ? 'pieza' : 'piezas');

montarShell();

if (blindarVista()) {
  const sesion = leerSesion();
  let datos = { ...(desdeUsuario(sesion && sesion.usuario) || DATOS_INICIALES) };
  let tocado = false;
  let promo = '';
  let promoAplicada = '';
  let actual = null;
  let historial = [];
  let enviando = false;
  let ocupado = false;

  /* ---------------- líneas de la Pokédex ---------------- */
  function lineasHtml() {
    const items = resumen().items;
    if (items.length === 0) {
      return `<div class="empty">
  <h3 class="font-title">Tu Pokédex está vacía</h3>
  <p>Añade cartas graduadas desde la vitrina: cada pieza muestra su certificadora, nota y stock real.</p>
  <a class="font-title" href="${RUTA.inicio}#coleccion">Explorar la vitrina</a>
</div>`;
    }
    return `<ol class="lines">${items.map(it => {
      const maximo = it.unica || it.cantidad >= it.stock;
      return `<li class="line">
  <div class="thumb">
    <img src="${it.imagen}" alt="" loading="lazy">
    <span class="gchip">${etiquetaCertificacion(it)}</span>
    ${it.unica ? '<span class="u1">1/1</span>' : ''}
  </div>
  <div>
    <p class="l-name font-title">${it.nombre}</p>
    <p class="l-meta"><b>${it.set}</b>${it.numero ? ` · ${it.numero}` : ''} · ${it.rareza}<br>
      ${it.certificadora}${it.nota ? ` · ${it.nota}` : ''} · ${usd(it.precio)} c/u</p>
  </div>
  <div class="l-right">
    <div class="qty">
      <button type="button" data-restar="${it.id}" aria-label="Quitar una unidad de ${it.nombre}"${it.cantidad <= 1 ? ' disabled' : ''}>−</button>
      <span>${it.cantidad}</span>
      <button type="button" data-sumar="${it.id}" aria-label="Añadir una unidad de ${it.nombre}"${maximo ? ' disabled' : ''}>+</button>
    </div>
    <p class="l-imp">${usd(it.precio * it.cantidad)}${maximo && !it.unica ? '<span class="l-unit maxed">stock máximo</span>' : ''}</p>
    <button type="button" class="rm" data-quitar="${it.id}" aria-label="Quitar ${it.nombre} de la Pokédex">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>
    </button>
  </div>
</li>`;
    }).join('')}</ol>`;
  }

  /* ---------------- formulario fiscal ---------------- */
  function camposHtml() {
    const errores = erroresDe(datos);
    return CAMPOS.map(c => `<div class="f${c.ancho ? ' wide' : ''}${tocado && errores[c.k] ? ' err' : ''}" data-caja="${c.k}">
  <label for="b-${c.k}">${c.label}</label>
  <input id="b-${c.k}" data-campo="${c.k}" type="${c.tipo === 'numeric' ? 'text' : c.tipo || 'text'}"${c.mascara ? ' inputMode="numeric"' : c.tipo === 'numeric' ? ' inputMode="numeric"' : c.tipo === 'tel' ? ' inputMode="tel"' : ''} autocomplete="${c.autoc}" placeholder="${c.placeholder}"${c.max ? ` maxlength="${c.max}"` : ''} value="${String(datos[c.k])}">
  <small data-error="${c.k}">${tocado && errores[c.k] ? errores[c.k] : ''}</small>
</div>`).join('') + `<div class="f${tocado && errores.departamento ? ' err' : ''}" data-caja="departamento">
  <label for="b-dep">Departamento</label>
  <select id="b-dep" data-campo="departamento">
    <option value="">Selecciona…</option>
    ${DEPARTAMENTOS.map(dep => `<option value="${dep}"${datos.departamento === dep ? ' selected' : ''}>${dep}</option>`).join('')}
  </select>
  <small data-error="departamento">${tocado && errores.departamento ? errores.departamento : ''}</small>
</div>
<div class="f wide">
  <label for="b-cond">Condición de la operación</label>
  <select id="b-cond" data-campo="condicion">
    <option value="C"${datos.condicion === 'C' ? ' selected' : ''}>Contado — transfiero antes del despacho</option>
    <option value="E"${datos.condicion === 'E' ? ' selected' : ''}>Contra entrega — pago en efectivo al recibirla</option>
    <option value="P"${datos.condicion === 'P' ? ' selected' : ''}>Abono parcial — transfiero una parte hoy</option>
  </select>
</div>`;
  }

  /** En Next el bloque de "Forma de pago" es hermano de .fields, no parte de la cuadrícula. */
  function pagoHtml() {
    return `<div class="f wide" style="margin-top:calc(18 * var(--u))">
  <label id="lbl-pago">Forma de pago</label>
  <div class="chips" role="group" aria-labelledby="lbl-pago">
    ${FORMAS_PAGO.map(f => `<button type="button" class="chip${datos.pago.metodo === f.metodo ? ' on' : ''}" aria-pressed="${datos.pago.metodo === f.metodo}" data-pago="${f.metodo}" data-tipo="${f.tipo}">${f.texto}</button>`).join('')}
  </div>
</div>`;
  }

  function sincronizarErrores() {
    const errores = erroresDe(datos);
    Object.keys(errores).forEach(k => {
      const caja = document.querySelector(`[data-caja="${k}"]`);
      if (!caja) return;
      caja.classList.toggle('err', tocado && !!errores[k]);
      const nota = document.querySelector(`[data-error="${k}"]`);
      if (nota) nota.textContent = tocado && errores[k] ? errores[k] : '';
    });
  }

  /* ---------------- resumen de compra ---------------- */
  function resumenHtml() {
    const t = calcularTotales(resumen().items.map(lineaDesdeCarrito), promoAplicada);
    return `<div class="block" style="margin-top:0">
  <h2 class="font-title">Resumen</h2>
  <div class="promo">
    <input id="promo" value="${promo}" placeholder="Código de descuento" aria-label="Código de descuento">
    <button type="button" class="font-title" id="aplicar-promo">Aplicar</button>
  </div>
  <dl class="sum">
    <div><dt>Subtotal (${t.qty} ${plural(t.qty)})</dt><dd>${usd(t.sub)}</dd></div>
    ${t.disc > 0 ? `<div class="neg"><dt>Descuento ${promoAplicada}</dt><dd>−${usd(t.disc)}</dd></div>` : ''}
    ${t.sub > 0 ? (t.ship === 0
      ? '<div class="free"><dt>Envío asegurado</dt><dd>Gratis</dd></div>'
      : `<div><dt>Envío asegurado</dt><dd>${usd(t.ship)}</dd></div>`) : ''}
    <div><dt>IVA 13%</dt><dd>${usd(t.iva)}</dd></div>
  </dl>
  <div class="total"><span>Total a pagar</span><b>${usd(t.total)}</b></div>
  ${t.total > 0 ? `<p class="letra">${conLetra(t.total)}</p>` : ''}
  <button class="btn-comprar" id="comprar"${enviando || resumen().items.length === 0 ? ' disabled' : ''}>${enviando ? 'Emitiendo factura…' : 'Comprar y generar factura'}</button>
  <p class="fine">
    Al confirmar la compra emitimos tu <b>factura de venta</b> en dólares con folio, detalle pieza por
    pieza y desglose de IVA 13&nbsp;%. No hay pasarela de pago: la factura se genera
    <b>con el pago pendiente</b>, te mostramos la cuenta bancaria y la referencia, y tú transfieres o
    depositas. El despacho se libera cuando el vendedor concilia tu depósito.
  </p>
  ${resumen().items.length > 0 ? '<button class="btn-line ghost" id="vaciar" style="margin-top:calc(14 * var(--u));width:100%">Vaciar Pokédex</button>' : ''}
</div>`;
  }

  function pintarCompra() {
    if (actual) { el('compra').innerHTML = ''; return; }
    const t = calcularTotales(resumen().items.map(lineaDesdeCarrito), promoAplicada);
    el('compra').innerHTML = `<div class="wrap">
  <div>
    <h1 class="page-title font-title">Tu Pokédex</h1>
    <p class="steps"><span class="on"><i>01</i>Piezas</span><span><i>02</i>Datos de compra</span><span><i>03</i>Factura</span></p>
    <section class="block" aria-label="Piezas seleccionadas">
      <h2 class="font-title">Piezas seleccionadas</h2>
      <div id="lineas">${lineasHtml()}</div>
    </section>
    <section class="block no-print" aria-label="Datos del comprador">
      <h2 class="font-title">Datos para la factura</h2>
      <form id="datosForm" novalidate><div class="fields">${camposHtml()}</div>${pagoHtml()}</form>
    </section>
  </div>
  <aside class="resumen no-print" aria-label="Resumen de la compra">${resumenHtml()}</aside>
</div>`;
    enlazarCompra(t);
  }

  function enlazarCompra() {
    el('lineas').addEventListener('click', e => {
      const restar = e.target.closest('[data-restar]');
      const sumar = e.target.closest('[data-sumar]');
      const quitar = e.target.closest('[data-quitar]');
      if (restar) {
        const it = resumen().items.find(x => x.id === restar.dataset.restar);
        if (it) cambiarCantidad(it.id, it.cantidad - 1);
        return;
      }
      if (sumar) {
        const it = resumen().items.find(x => x.id === sumar.dataset.sumar);
        if (it && (it.unica || it.cantidad >= it.stock)) {
          aviso(it.unica ? 'Es una pieza única: no puedes llevar más de una.' : `Solo hay ${it.stock} en bóveda.`);
          return;
        }
        if (it) cambiarCantidad(it.id, it.cantidad + 1);
        return;
      }
      if (quitar) {
        const it = resumen().items.find(x => x.id === quitar.dataset.quitar);
        quitarDelCarrito(quitar.dataset.quitar);
        aviso(`${it ? it.nombre : 'La pieza'} salió de tu Pokédex.`);
      }
    });

    document.querySelectorAll('[data-campo]').forEach(input => {
      input.addEventListener('input', () => {
        const k = input.dataset.campo;
        const mascara = CAMPOS.find(c => c.k === k && c.mascara)?.mascara;
        const valor = mascara ? mascara(input.value) : input.value;
        /* el campo no está controlado como en React: la máscara tiene que escribirse de vuelta */
        if (mascara && input.value !== valor) input.value = valor;
        datos[k] = valor;
        sincronizarErrores();
      });
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => { datos[input.dataset.campo] = input.value; sincronizarErrores(); });
      }
    });

    document.querySelectorAll('[data-pago]').forEach(chip => {
      chip.addEventListener('click', () => {
        datos = { ...datos, pago: { metodo: chip.dataset.pago, tipo: chip.dataset.tipo } };
        document.querySelectorAll('[data-pago]').forEach(o => {
          const activo = o === chip;
          o.classList.toggle('on', activo);
          o.setAttribute('aria-pressed', String(activo));
        });
      });
    });

    el('aplicar-promo').addEventListener('click', () => {
      promo = el('promo').value;
      const codigo = String(promo).trim().toUpperCase();
      if (!codigo) { promoAplicada = ''; aviso('Escribe un código para aplicarlo.'); pintarResumen(); return; }
      if (!PROMOCIONES[codigo]) { aviso(`${codigo} no es un código vigente.`); return; }
      promoAplicada = codigo;
      aviso(`Descuento ${codigo} aplicado: −${Math.round(PROMOCIONES[codigo] * 100)} %.`);
      pintarResumen();
    });
    el('promo').addEventListener('input', () => { promo = el('promo').value; });

    el('comprar').addEventListener('click', comprar);
    const vaciar = el('vaciar');
    if (vaciar) vaciar.addEventListener('click', () => { vaciarCarrito(); aviso('Vaciamos tu Pokédex.'); });
  }

  /** El bloque del resumen se repinta solo (subtotal, IVA, total y letra). */
  function pintarResumen() {
    const aside = document.querySelector('#compra .resumen');
    if (!aside) return;
    aside.innerHTML = resumenHtml();
    el('aplicar-promo').addEventListener('click', () => {
      promo = el('promo').value;
      const codigo = String(promo).trim().toUpperCase();
      if (!codigo) { promoAplicada = ''; aviso('Escribe un código para aplicarlo.'); pintarResumen(); return; }
      if (!PROMOCIONES[codigo]) { aviso(`${codigo} no es un código vigente.`); return; }
      promoAplicada = codigo;
      aviso(`Descuento ${codigo} aplicado: −${Math.round(PROMOCIONES[codigo] * 100)} %.`);
      pintarResumen();
    });
    el('promo').addEventListener('input', () => { promo = el('promo').value; });
    el('comprar').addEventListener('click', comprar);
    const vaciar = el('vaciar');
    if (vaciar) vaciar.addEventListener('click', () => { vaciarCarrito(); aviso('Vaciamos tu Pokédex.'); });
  }

  async function comprar() {
    tocado = true;
    if (resumen().items.length === 0) { aviso('Tu Pokédex está vacía.'); return; }
    sincronizarErrores();
    if (!esValido(datos)) { aviso('Revisa los datos fiscales marcados en rojo.'); return; }

    enviando = true;
    pintarResumen();
    try {
      const factura = await api.crearFactura(
        resumen().items.map(lineaDesdeCarrito),
        compradorDesde(datos),
        datos.pago,
        promoAplicada
      );
      actual = factura;
      vaciarCarrito();
      promo = '';
      promoAplicada = '';
      tocado = false;
      historial = await api.facturas().catch(() => []);
      aviso(`Factura ${factura.folio} emitida por ${usd(factura.totales.total)}.`);
      pintarCompra();
      pintarFactura();
      pintarHistorial();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      aviso(err && err.message ? err.message : 'No pudimos emitir la factura.', 4200);
    } finally {
      enviando = false;
      pintarResumen();
    }
  }

  /* ---------------- factura emitida + panel de pago ---------------- */
  function panelPagoHtml(f) {
    const ultimo = f.avisos[f.avisos.length - 1];
    const rol = leerSesion()?.usuario.rol;
    return `<section class="block no-print" aria-label="Estado del pago">
  <h2 class="font-title">Cómo pagar esta factura</h2>
  <p class="banner${f.estado !== 'pagado' ? ' ' + f.estado : ''}"><span class="dot" aria-hidden="true"></span><span>${MENSAJE[f.estado]}</span></p>
  <div class="paybox">
    <div><h4>Total a transferir</h4><p class="big">${usd(f.totales.total)}</p></div>
    <div><h4>Referencia del pago</h4><p class="big">${f.referencia}</p><p>Usa este número en la descripción de la transferencia.</p></div>
    <div><h4>Cuenta de destino</h4><p><b>${BANCO.nombre}</b> · ${BANCO.tipo}</p><p>${BANCO.numero} · a nombre de ${BANCO.titular}</p></div>
    <div><h4>Forma elegida</h4><p><b>${f.pago.metodo}</b> (${f.pago.tipo === 'Efectivo' ? 'pago en mano' : 'depósito bancario'})</p><p>Estado: ${ESTADO_PAGO[f.estado]} · reservamos hasta ${fmtFecha(f.vence)}</p></div>
  </div>
  ${f.estado !== 'pagado' && f.estado !== 'anulada' ? `<form class="payform" id="pagoForm" novalidate>
    <div class="fields">
      <div class="f"><label for="p-banco">Banco desde donde pagaste</label>
        <select id="p-banco">${BANCOS.map(b => `<option value="${b}">${b}</option>`).join('')}</select></div>
      <div class="f"><label for="p-ref">N.º de autorización o transacción</label>
        <input id="p-ref" placeholder="Ej. 123456 / número de boleta"><small>Necesario para conciliar tu pago.</small></div>
      <div class="f"><label for="p-fecha">Fecha del movimiento</label>
        <input id="p-fecha" type="date"><small>Indica la fecha.</small></div>
      <div class="f"><label for="p-monto">Monto transferido (US$)</label>
        <input id="p-monto" inputmode="decimal" placeholder="${f.totales.total.toFixed(2)}"><small>Debe coincidir con el total de la factura.</small></div>
      <div class="f wide"><label for="p-quien">Nombre de quien deposita o transfiere</label>
        <input id="p-quien" placeholder="Como aparece en el estado de cuenta del banco"><small>Si es distinto al comprador, avísanos.</small></div>
    </div>
    <div id="error-pago"></div>
    <div class="doc-acts" style="margin-top:calc(16 * var(--u))">
      <button type="submit" class="btn-line"${ocupado ? ' disabled' : ''}>${f.estado === 'verificacion' ? 'Reenviar el aviso' : 'Ya pagué — avisar al vendedor'}</button>
      <button type="button" class="btn-line ghost" id="anular"${ocupado ? ' disabled' : ''}>Cancelar pedido y devolver las piezas</button>
    </div>
  </form>` : ''}
  ${ultimo ? `<p class="fine">Aviso registrado: ${resumenAviso(ultimo)} · notificado el ${fmtFecha(ultimo.hora)}.</p>` : ''}
  ${f.registro ? `<p class="fine">Conciliado por PokéVault: ${resumenAviso(f.registro)} el ${fmtFecha(f.pagado || f.registro.hora)}.</p>` : ''}
  ${rol === 'administrador' ? `<div class="doc-acts no-print" style="margin-top:calc(12 * var(--u))">
    ${puedeTransitar(f.estado, 'pagado') ? '<button type="button" class="btn-line ghost" id="conciliar">Conciliar el pago (vista administrador)</button>' : ''}
    ${puedeTransitar(f.estado, 'pendiente') ? '<button type="button" class="btn-line ghost" id="repetir">Volver a pedir el pago</button>' : ''}
  </div>` : ''}
  <p class="demo-note"><b>Notas para el proyecto:</b> este frontend no cobra en línea — no hay tarjeta ni pasarela.
    El aviso de pago se envía por la misma fachada de datos que el resto de la app
    (${api.modo === 'mock' ? 'localStorage en modo local' : 'backend HTTP'}); en producción la
    conciliación la hace contabilidad contra el estado de cuenta real del banco.</p>
</section>`;
  }

  function pintarFactura() {
    const cont = el('factura');
    if (!actual) { cont.innerHTML = ''; return; }
    const f = actual;
    cont.innerHTML = `<div class="wrap">
  <div>
    <h1 class="page-title font-title">Factura emitida</h1>
    <p class="steps"><span><i>01</i>Piezas</span><span><i>02</i>Datos de compra</span><span class="on"><i>03</i>Factura</span></p>
    <section class="block bloque-doc">
      <article class="doc" id="documento">${documentoFactura(f)}</article>
      <div class="doc-acts no-print">
        <button type="button" class="btn-line" id="imprimir">Imprimir / Guardar PDF</button>
        <button type="button" class="btn-line" id="descargar">Descargar factura</button>
        <button type="button" class="btn-line" id="copiar">Copiar resumen</button>
        <a class="btn-line ghost" href="${RUTA.inicio}#coleccion">Seguir comprando</a>
      </div>
    </section>
    ${panelPagoHtml(f)}
  </div>
  <aside class="resumen no-print">
    <div class="block" style="margin-top:0">
      <h2 class="font-title">Estado del pedido</h2>
      <p class="muted" style="font-size:max(calc(13 * var(--u)), 12px);line-height:1.7">
        ${ESTADO_PAGO[f.estado]} · folio ${f.folio} · ${f.totales.qty} ${plural(f.totales.qty)} por ${usd(f.totales.total)}.
        ${f.avisos.length > 0 ? ` Avisos enviados: ${f.avisos.length}.` : ''}
      </p>
      <div style="margin-top:calc(14 * var(--u));font-size:max(calc(12 * var(--u)), 11px);color:var(--mid);line-height:1.6">
        Copiamos el detalle a ${f.comprador.email}. Si necesitas cambiar la dirección de entrega,
        escríbenos a facturas@pokevault.com antes del despacho.
      </div>
      <button class="btn-line ghost" id="volver" style="margin-top:calc(16 * var(--u));width:100%">Ver mi Pokédex y seguir comprando</button>
    </div>
  </aside>
</div>`;
    enlazarFactura(f);
  }

  function enlazarFactura(f) {
    el('imprimir').addEventListener('click', () => window.print());
    el('descargar').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([paginaFactura(f)], { type: 'text/html;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivoFactura(f.folio);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      aviso(`Descargaste ${nombreArchivoFactura(f.folio)}.`);
    });
    el('copiar').addEventListener('click', async () => {
      const t = f.totales;
      const texto = [
        `PokéVault · factura ${f.folio}`,
        `Emitida ${fmtFecha(f.fecha)} · vence ${fmtFecha(f.vence)}`,
        `Comprador: ${f.comprador.nombre} (${f.comprador.rfc})`,
        `${t.qty} pieza(s) · subtotal ${usd(t.sub)}${t.disc ? ` · descuento ${usd(t.disc)}` : ''} · envío ${t.ship === 0 ? 'gratis' : usd(t.ship)} · IVA ${usd(t.iva)}`,
        `TOTAL ${usd(t.total)} · ${ESTADO_PAGO[f.estado]}`,
        `Pago: ${f.pago.metodo} · referencia bancaria ${f.referencia}`
      ].join('\n');
      try {
        await navigator.clipboard.writeText(texto);
        aviso('Resumen copiado al portapapeles.');
      } catch {
        aviso('Tu navegador no permitió copiar; usa Descargar factura.', 4200);
      }
    });

    el('volver').addEventListener('click', () => {
      actual = null;
      pintarFactura();
      pintarCompra();
    });

    const form = el('pagoForm');
    if (form) {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        const total = f.totales.total;
        const monto = Number(String(el('p-monto').value).replace(',', '.'));
        const malo = !el('p-ref').value.trim() ? 'Escribe el número de autorización o de boleta.'
          : !el('p-fecha').value ? 'Indica la fecha del movimiento.'
            : !Number.isFinite(monto) || monto <= 0 ? 'El monto debe ser un número mayor que 0.'
              : Math.abs(monto - total) > 0.5 ? `El monto no cuadra con el total de la factura (${usd(total)}).`
                : el('p-quien').value.trim().length < 3 ? 'Escribe el nombre con el que aparece el depósito en el banco.'
                  : '';
        el('error-pago').innerHTML = malo
          ? `<p class="banner pendiente"><span class="dot"></span><span>${malo}</span></p>` : '';
        if (malo) return;

        ocupado = true;
        try {
          actual = await api.notificarPago(f.folio, {
            banco: el('p-banco').value,
            referencia: el('p-ref').value.trim(),
            fecha: el('p-fecha').value,
            monto: Math.round(monto * 100) / 100,
            depositante: el('p-quien').value.trim(),
            hora: new Date().toISOString()
          });
          historial = await api.facturas().catch(() => []);
          aviso('Tu aviso quedó enviado: la factura pasó a verificación.');
          pintarFactura();
          pintarHistorial();
        } catch (err) {
          el('error-pago').innerHTML = `<p class="banner pendiente"><span class="dot"></span><span>${err && err.message ? err.message : 'No pudimos enviar el aviso.'}</span></p>`;
        } finally {
          ocupado = false;
        }
      });

      el('anular').addEventListener('click', () => transitar('anulada', f));
    }
    const conciliar = el('conciliar');
    if (conciliar) conciliar.addEventListener('click', () => transitar('pagado', f));
    const repetir = el('repetir');
    if (repetir) repetir.addEventListener('click', () => transitar('pendiente', f));
  }

  async function transitar(estado, f) {
    if (estado === 'anulada' && !window.confirm('¿Cancelar el pedido? Las piezas vuelven a tu Pokédex.')) return;
    ocupado = true;
    try {
      const nueva = await api.cambiarEstadoPago(f.folio, estado);
      if (estado === 'anulada') {
        const catalogo = await api.productos();
        const devueltas = nueva.lineas.map(l => {
          const p = catalogo.find(x => x.id === l.productoId);
          return p ? lineaDe(p, l.cantidad) : {
            id: l.productoId, nombre: l.nombre, precio: l.precio, cantidad: l.cantidad,
            stock: l.stock, imagen: '', certificadora: l.certificadora, nota: l.nota,
            numeroCertificado: l.numeroCertificado, rareza: l.rareza, etiqueta: l.rareza,
            set: l.set, numero: l.numero, codigo: `${l.set} ${l.numero}`.trim(), unica: l.unica
          };
        });
        devolverAlCarrito(devueltas);
      }
      actual = nueva;
      historial = await api.facturas().catch(() => []);
      aviso(estado === 'anulada'
        ? 'Pedido anulado: devolvimos las piezas a tu Pokédex.'
        : `Factura ${nueva.folio} marcada como ${ESTADO_PAGO[nueva.estado].toLowerCase()}.`);
      pintarFactura();
      pintarHistorial();
    } catch (err) {
      aviso(err && err.message ? err.message : 'No pudimos actualizar el estado del pago.', 4200);
    } finally {
      ocupado = false;
    }
  }

  /* ---------------- historial ---------------- */
  function pintarHistorial() {
    const cont = el('facturas');
    if (!historial.length) { cont.innerHTML = ''; return; }
    cont.innerHTML = `<div class="wrap" id="facturas-lista">
  <div>
    <section class="block" aria-label="Mis facturas">
      <h2 class="font-title">Mis facturas</h2>
      <ul class="historial">${historial.slice().reverse().map(f => `<li>
        <b>${f.folio}</b>
        <span class="muted">${fmtFecha(f.fecha)} · ${f.totales.qty} ${plural(f.totales.qty)} · ${f.pago.metodo}</span>
        <span class="estado ${f.estado}">${ESTADO_PAGO[f.estado]}</span>
        <span class="h-imp">${usd(f.totales.total)}</span>
        <button type="button" data-ver="${f.folio}">${f.estado === 'pendiente' ? 'Continuar pago' : f.estado === 'verificacion' ? 'Ver aviso enviado' : 'Ver factura'}</button>
      </li>`).join('')}</ul>
      <p class="fine">Las facturas se emiten en dólares, con IVA 13&nbsp;% y folio consecutivo.
        <a href="${RUTA.inicio}#coleccion">Volver a la vitrina</a></p>
    </section>
  </div>
</div>`;
    cont.addEventListener('click', e => {
      const boton = e.target.closest('[data-ver]');
      if (!boton) return;
      actual = historial.find(f => f.folio === boton.dataset.ver) || null;
      pintarCompra();
      pintarFactura();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* el carrito cambia desde cualquier otra pestaña o vista */
  suscribirCarrito(() => { if (!actual) { pintarCompra(); } else { pintarResumen(); } });

  historial = await api.facturas().catch(() => []);
  pintarCompra();
  pintarHistorial();
}
