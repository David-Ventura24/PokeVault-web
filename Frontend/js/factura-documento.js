/**
 * Documento fiscal de PokéVault.
 *
 * Produce el HTML de la factura de venta en dos sabores, más la hoja que los viste:
 *  · `documentoFactura(f)` — el contenido del `<article class="doc" id="doc">`,
 *    que la vista del comprador mete dentro del artículo ya estilizado por compra.css.
 *  · `paginaFactura(f)` — el archivo autocontenido que se descarga desde el navegador:
 *    la misma hoja (`FACTURA_CSS`) va embebida, así el documento se abre igual sin
 *    depender de los CSS de la app; `nombreArchivoFactura(f.folio)` da el nombre del blob.
 *
 * Es pura manipulación de cadenas (sin `window`), así que puede correr en el servidor
 * o en un componente cliente. Todo lo que sale del contrato `Factura` se interpola con
 * `esc()` porque el resultado se inyecta con `dangerouslySetInnerHTML`.
 */
import { usd, conLetra } from "./moneda.js";
import { BANCO, CONDICIONES, EMPRESA, ENVIO, ENVIO_GRATIS_DESDE, ESTADO_PAGO, fmtDia, fmtFecha, IVA, resumenAviso } from "./factura.js";
/** IVA en texto, para no escribir «13%» a mano en el documento. */
const PCT_IVA = Math.round(IVA * 100);
/** Escapa el contenido que va a un nodo de texto o a un atributo de HTML. */
function esc(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Signo de resta (U+2212) del descuento, igual que en el prototipo. */
const MENOS = '−';
/**
 * `toLocaleString` de una fecha inválida lanza RangeError, y eso rompería la vista del
 * comprador. Las facturas pueden llegar sin `vence` o con un aviso a medio rellenar, así
 * que toda marca de tiempo pasa por estas dos envolturas.
 */
const esFechaValida = (iso) => !!iso && !Number.isNaN(new Date(iso).getTime());
const fechaHora = (iso) => (esFechaValida(iso) ? fmtFecha(iso) : '—');
const soloDia = (iso) => (esFechaValida(iso) ? fmtDia(iso) : '—');
/** Condición de la operación: letra C/E/P + etiqueta legible. */
function condicionTexto(f) {
    const c = f.comprador;
    const etiqueta = c.condicionLabel || CONDICIONES[c.condicion] || '';
    return [c.condicion, etiqueta].filter(Boolean).join(' — ');
}
/** Piezas y avisos: un payload viejo puede llegar sin estas listas; el documento no se rompe. */
const lineasDe = (f) => (Array.isArray(f.lineas) ? f.lineas : []);
const avisosDe = (f) => (Array.isArray(f.avisos) ? f.avisos : []);
/** Una fila del detalle de piezas, en texto corrido. */
function piezaTexto(l) {
    const cert = l.numeroCertificado && l.numeroCertificado !== '—'
        ? ` · certificado ${esc(l.numeroCertificado)}`
        : '';
    return `<p><b>${esc(l.nombre)}</b> — ${esc(l.set)} ${esc(l.numero)} · ${esc(l.rareza)} · `
        + `${esc(l.certificadora)} ${esc(l.nota)}${cert} · ${l.cantidad} × ${usd(l.precio)}</p>`;
}
/** Tabla pieza por pieza. */
function tabla(lineas) {
    const filas = lineas.length
        ? lineas.map((l, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td class="desc"><b>${esc(l.nombre)}</b><span>${esc(l.set)} · ${esc(l.numero)}${l.unica ? ' · pieza 1/1' : ''}<br>${esc(l.rareza)}</span></td>
      <td>${esc(l.certificadora)} ${esc(l.nota)}</td>
      <td>${esc(l.numeroCertificado || '—')}</td>
      <td class="num">${l.cantidad}</td>
      <td class="num">${usd(l.precio)}</td>
      <td class="num">${usd(l.precio * l.cantidad)}</td>
    </tr>`).join('')
        : '<tr><td class="desc" colspan="7"><b>Sin piezas</b><span>Esta factura no ampara ninguna pieza.</span></td></tr>';
    return `
    <div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th class="num">#</th><th>Descripción del producto</th><th>Certificadora y nota</th>
          <th>No. certificado</th><th class="num">Cant.</th><th class="num">P. Unit. US$</th><th class="num">Importe US$</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    </div>`;
}
/** Desglose fiscal: subtotal, descuento, base, IVA, envío y total. */
function desglose(t) {
    const descuento = t.disc
        ? `<div><dt>Descuento ${esc(t.promoLabel || t.promo)}</dt><dd>${MENOS}${usd(t.disc)}</dd></div>`
        : '';
    return `
    <div class="doc-sum">
      <dl>
        <div><dt>Subtotal</dt><dd>${usd(t.sub)}</dd></div>
        ${descuento}
        <div><dt>Base gravable</dt><dd>${usd(t.base)}</dd></div>
        <div><dt>IVA ${PCT_IVA}%</dt><dd>${usd(t.iva)}</dd></div>
        <div><dt>Envío asegurado</dt><dd>${t.ship ? usd(t.ship) : 'Gratis'}</dd></div>
        <div class="tot"><dt>Total</dt><dd>${usd(t.total)}</dd></div>
      </dl>
    </div>
    <p class="letra" style="text-align:right">Importe con letra: ${esc(conLetra(t.total))}</p>`;
}
/**
 * Párrafo de estado del pago. Se emite con la factura ya creada, así que «pendiente»
 * es el caso normal: el documento describe a dónde transferir, no cobra en línea.
 */
function notaPago(f) {
    const t = f.totales;
    const avisos = avisosDe(f);
    const ultimo = avisos[avisos.length - 1];
    switch (f.estado) {
        case 'pendiente':
            return f.pago.tipo === 'Efectivo'
                ? `<p>Esta factura se emite con el <b>pago pendiente</b>. ${usd(t.total)} se cobran en efectivo `
                    + 'contra la entrega; el mensajero firma el comprobante de recibido. '
                    + `La reserva vence el ${esc(fechaHora(f.vence))}</p>`
                : `<p>Esta factura se emite con el <b>pago pendiente</b>. Transfiera a <b>${esc(BANCO.nombre)}</b>, `
                    + `${esc(BANCO.tipo)} N.º ${esc(BANCO.numero)} a nombre de ${esc(BANCO.titular)}, `
                    + `con referencia <b>${esc(f.referencia)}</b>. La reserva vence el ${esc(fechaHora(f.vence))}</p>`;
        case 'verificacion':
            return `<p>Pago notificado por el comprador el ${esc(fechaHora(ultimo ? (ultimo.hora || ultimo.fecha) : f.fecha))}; `
                + `en verificación contra el estado de cuenta de ${esc(BANCO.nombre)}. No se despacha hasta conciliar.</p>`;
        case 'pagado': {
            const r = f.registro || {
                banco: BANCO.nombre,
                referencia: ultimo ? ultimo.referencia : '—',
                fecha: f.pagado || f.fecha,
                monto: t.total,
                depositante: f.comprador.nombre,
                hora: f.pagado || f.fecha
            };
            return `<p><b>Pago conciliado</b> el ${esc(fechaHora(f.pagado || r.hora))} por ${usd(r.monto)} — `
                + `${esc(r.banco)}, referencia ${esc(r.referencia)}, depositante ${esc(r.depositante)}, `
                + `depósito del ${esc(soloDia(r.fecha))}.</p>`;
        }
        default:
            return `<p><b>Factura anulada</b> el ${esc(fechaHora(f.anulada || f.fecha))}`
                + ': no ampara una venta y no genera obligación de pago.</p>';
    }
}
/** Avisos de transferencia que el comprador reportó sobre esta factura. */
function registroPagos(f) {
    const avisos = avisosDe(f)
        .map(a => `<p>${esc(resumenAviso(a))} · aviso recibido el ${esc(fechaHora(a.hora || a.fecha))}</p>`)
        .join('');
    return avisos || '<p>Sin avisos de pago registrados.</p>';
}
/**
 * Contenido de `<article class="doc" id="doc">`.
 * Réplica del documento del prototipo estático, con el contrato `Factura` actual.
 */
export function documentoFactura(f) {
    const c = f.comprador;
    const t = f.totales;
    const estado = f.estado || 'pendiente';
    const estadoTxt = ESTADO_PAGO[estado] || ESTADO_PAGO.pendiente;
    const lineas = lineasDe(f);
    return `
    <div class="doc-top">
      <div>
        <div class="doc-brand font-title">Poké<span>Vault</span></div>
        <p class="doc-sub">
          <b>${esc(EMPRESA.razon)}</b><br>
          NIT ${esc(EMPRESA.nit)} · NRC ${esc(EMPRESA.nrc)}<br>
          ${esc(EMPRESA.regimen)}<br>
          ${esc(EMPRESA.direccion)}<br>
          ${esc(EMPRESA.correo)} · ${esc(EMPRESA.telefono)}
        </p>
      </div>
      <div class="doc-kind">
        <h2 class="font-title">FACTURA DE VENTA</h2>
        <p>Venta de cartas coleccionables · Moneda: <b>USD</b> (de curso legal en El Salvador)</p>
        <span class="folio">${esc(f.folio)}</span>
        <p style="margin-top:calc(8 * var(--u))">
          <b>Fecha de emisión:</b> ${esc(fechaHora(f.fecha))}<br>
          <b>Referencia bancaria:</b> ${esc(f.referencia)}<br>
          <b>Lugar de expedición:</b> San Salvador, El Salvador
        </p>
      </div>
    </div>

    <div class="party">
      <div>
        <h3>Comprador</h3>
        <p><b>${esc(c.nombre)}</b><br>DUI ${esc(c.rfc)}<br>${esc(c.email)} · ${esc(c.telefono)}</p>
      </div>
      <div>
        <h3>Domicilio de entrega</h3>
        <p>${esc(c.direccion)}<br>${esc(c.ciudad)}, ${esc(c.departamento)}, El Salvador · C.P. ${esc(c.cp)}<br>
          Condición de la operación: <b>${esc(condicionTexto(f))}</b></p>
      </div>
    </div>

    ${tabla(lineas)}

    ${desglose(t)}

    <div class="doc-foot">
      <div class="box pay">
        <h4>Forma de pago</h4>
        ${esc(f.pago.metodo)} — ${f.pago.tipo === 'Efectivo' ? 'cobro al recibir' : 'transferencia o depósito bancario en dólares'}<br>
        Estado del pago: <b>${esc(estadoTxt)}</b><br>
        ${notaPago(f)}
      </div>
      <div class="box">
        <h4>Acondicionamiento y entrega</h4>
        Cada pieza graduada viaja en su cápsula original dentro de toploader y sobre rígido con seguro de transporte.
        Envío a <b>${esc(c.direccion)}, ${esc(c.ciudad)}, ${esc(c.departamento)}, C.P. ${esc(c.cp)}</b>.
        Entrega estimada 24–72 h hábiles dentro de El Salvador.
        Tarifa de envío ${usd(ENVIO)}, sin costo cuando la base gravable llega a ${usd(ENVIO_GRATIS_DESDE)}.
        Si la pieza llega dañada, la reponemos o devolvemos el importe completo.
      </div>
    </div>

    <div class="box" style="margin-top:calc(16 * var(--u))">
      <h4>Detalle de las piezas</h4>
      ${lineas.map(piezaTexto).join('')}
    </div>

    <div class="box" style="margin-top:calc(16 * var(--u))">
      <h4>Registro de pagos</h4>
      ${registroPagos(f)}
    </div>

    <span class="stamp ${esc(estado)}">${esc(estadoTxt)} · folio ${esc(f.folio)}</span>
    <p class="letra" style="margin-top:calc(12 * var(--u))">Gracias por comprar original. Este documento ampara la venta de
      ${t.qty} pieza(s) por ${usd(t.total)} y se emite en el momento del pedido; el pago se realiza por transferencia
      y se concilia después. Conserva el folio para cualquier aclaración: ${esc(EMPRESA.correo)} · ${esc(EMPRESA.telefono)}.</p>`;
}
/**
 * Hoja del documento descargable.
 * Es la hoja del prototipo, con `--u:1px` (en la app `--u` escala con la ventana y aquí
 * no hay layout que escalar) y la pila Nunito/Inter con respaldo al sistema, porque el
 * archivo se abre fuera de la app y no tiene las tipografías de `next/font`.
 */
export const FACTURA_CSS = `
:root{--u:1px;--tinta:#0B0B0F;--papel:#FFFFFF;--niebla:#F5F5F7;--rojo:#D92B05;--sol:#FFD60A;--mid:#5E5E66}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{background:var(--niebla)}
body{background:var(--papel);color:var(--tinta);
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  max-width:calc(940 * var(--u));margin:0 auto;padding:calc(32 * var(--u));line-height:1.45;-webkit-font-smoothing:antialiased}
.font-title{font-family:'Nunito','Inter',system-ui,sans-serif;font-weight:900}
.doc{border:3px solid var(--tinta);border-radius:22px;padding:calc(30 * var(--u))}
.doc-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:calc(18 * var(--u));align-items:flex-start}
.doc-brand{font-size:calc(34 * var(--u))}
.doc-brand span{color:var(--rojo)}
.doc-sub{margin-top:calc(6 * var(--u));font-size:calc(12 * var(--u));color:var(--mid);line-height:1.6}
.doc-kind{text-align:right}
.doc-kind h2{font-size:calc(26 * var(--u));letter-spacing:.02em}
.doc-kind p{margin-top:calc(5 * var(--u));font-size:calc(12 * var(--u));color:var(--mid)}
.folio{display:inline-block;margin-top:calc(8 * var(--u));background:var(--sol);color:var(--tinta);
  font-family:'Nunito','Inter',system-ui,sans-serif;font-weight:900;font-size:calc(15 * var(--u));
  padding:calc(4 * var(--u)) calc(12 * var(--u));border-radius:10px;box-shadow:0 3px 0 var(--tinta)}
.party{display:grid;grid-template-columns:1fr 1fr;gap:calc(16 * var(--u));margin-top:calc(22 * var(--u))}
.party>div{padding:calc(14 * var(--u)) calc(16 * var(--u));border-radius:16px;background:var(--niebla);border:1px solid rgba(11,11,15,.06)}
.party h3{font-size:calc(10.5 * var(--u));letter-spacing:.12em;text-transform:uppercase;color:var(--mid);margin-bottom:calc(8 * var(--u))}
.party p{font-size:calc(13.5 * var(--u));line-height:1.65}
.party p b{font-weight:700}
.tbl-wrap{margin-top:calc(24 * var(--u));overflow-x:auto}
.tbl{width:100%;min-width:calc(560 * var(--u));border-collapse:collapse;font-size:calc(13 * var(--u))}
.tbl th{text-align:left;padding:calc(9 * var(--u)) calc(8 * var(--u));border-bottom:2px solid var(--tinta);
  font-size:calc(10.5 * var(--u));letter-spacing:.1em;text-transform:uppercase;color:var(--mid)}
.tbl td{padding:calc(12 * var(--u)) calc(8 * var(--u));border-bottom:1px solid var(--niebla);vertical-align:top}
.tbl .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.tbl .desc b{display:block;font-family:'Nunito','Inter',system-ui,sans-serif;font-weight:900;font-size:calc(15 * var(--u))}
.tbl .desc span{display:block;margin-top:calc(3 * var(--u));color:var(--mid);font-size:calc(11.5 * var(--u));line-height:1.5}
.doc-sum{display:flex;justify-content:flex-end;margin-top:calc(20 * var(--u))}
.doc-sum dl{width:calc(300 * var(--u));display:flex;flex-direction:column;gap:calc(8 * var(--u));font-size:calc(13.5 * var(--u))}
.doc-sum>div{display:flex;justify-content:space-between;gap:calc(12 * var(--u))}
.doc-sum dt{color:var(--mid)}
.doc-sum dd{font-weight:600;font-variant-numeric:tabular-nums}
.doc-sum .tot{margin-top:calc(8 * var(--u));padding-top:calc(10 * var(--u));border-top:2px solid var(--tinta)}
.doc-sum .tot dt,.doc-sum .tot dd{font-family:'Nunito','Inter',system-ui,sans-serif;font-weight:900;font-size:calc(22 * var(--u));color:var(--tinta)}
.letra{margin-top:calc(10 * var(--u));font-size:calc(11.5 * var(--u));color:var(--mid);line-height:1.5}
.doc-foot{display:grid;grid-template-columns:1fr 1fr;gap:calc(16 * var(--u));margin-top:calc(24 * var(--u))}
.box{padding:calc(14 * var(--u)) calc(16 * var(--u));border-radius:16px;border:1px solid rgba(11,11,15,.08);
  font-size:calc(12.5 * var(--u));line-height:1.7}
.box h4{font-size:calc(10.5 * var(--u));letter-spacing:.12em;text-transform:uppercase;color:var(--mid);margin-bottom:calc(6 * var(--u))}
.box b{font-weight:700}
.box.pay{background:rgba(255,214,10,.16);border-color:rgba(11,11,15,.14)}
.stamp{display:inline-flex;align-items:center;gap:calc(8 * var(--u));margin-top:calc(18 * var(--u));
  font-family:'Nunito','Inter',system-ui,sans-serif;font-weight:900;font-size:calc(13 * var(--u));letter-spacing:.06em;
  text-transform:uppercase;color:var(--rojo);border:2px dashed var(--rojo);border-radius:12px;padding:calc(6 * var(--u)) calc(12 * var(--u))}
.stamp.verificacion{color:var(--tinta);border-color:var(--tinta)}
.stamp.pagado{color:var(--tinta);border-style:solid;border-color:var(--tinta);background:var(--sol)}
.stamp.anulada{color:var(--mid);border-color:rgba(11,11,15,.28);text-decoration:line-through}
@media print{@page{size:A4;margin:14mm}html,body{background:#fff}.doc{border-width:2px;padding:0}.tbl-wrap{overflow:visible}}
`;
/** Nombre del archivo descargable: «factura-PV-2026-0001.html». */
export const nombreArchivoFactura = (folio) => `factura-${String(folio || 'sin-folio').replace(/[^A-Za-z0-9_-]/g, '')}.html`;
/**
 * Documento HTML completo para la descarga.
 * La hoja va embebida y las tipografías se piden a Google Fonts con respaldo al sistema,
 * así el archivo se abre igual aunque el navegador bloquee el acceso a los CSS de la app.
 */
export function paginaFactura(f) {
    const titulo = `Factura ${f.folio} — ${EMPRESA.razon}`;
    return '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width, initial-scale=1">'
        + `<title>${esc(titulo)}</title>`
        + '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Nunito:wght@900&display=swap" rel="stylesheet">'
        + '<style>' + FACTURA_CSS + '</style>'
        + `</head><body><article class="doc" id="doc">${documentoFactura(f)}</article></body></html>`;
}
