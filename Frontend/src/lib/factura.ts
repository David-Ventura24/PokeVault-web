import { round2, usd } from './moneda.ts';
import type {
  AvisoPago, CompradorFactura, EstadoPago, Factura, LineaCarrito, LineaFactura, TotalesFactura
} from './types.ts';

/** Datos fiscales de la empresa emisora (El Salvador). */
export const EMPRESA = {
  razon: 'PokéVault El Salvador, S.A. de C.V.',
  nit: '06142019-1',
  nrc: '317894-2',
  regimen: 'Contribuyente del Régimen Común',
  direccion: 'Av. San Óscar No. 1234, Col. Escalón, San Salvador',
  correo: 'facturas@pokevault.com',
  telefono: '+503 2261 8000'
};

/** Cuenta donde el comprador deposita. La conciliación la hace el equipo, no el navegador. */
export const BANCO = {
  nombre: 'Banco Cuscatlán',
  tipo: 'Cuenta corriente monetaria (USD)',
  numero: '1234 5678 9012 3456',
  titular: 'PokéVault El Salvador, S.A. de C.V.',
  plazoHoras: 72
};

export const DEPARTAMENTOS = [
  'San Salvador', 'La Libertad', 'Santa Ana', 'San Miguel', 'Sonsonate', 'Usulután',
  'Ahuachapán', 'Chalatenango', 'La Unión', 'La Paz', 'Cuscatlán', 'Cabañas',
  'San Vicente', 'Morazán'
];

export const CONDICIONES: Record<'C' | 'E' | 'P', string> = {
  C: 'Consumidor Final',
  E: 'Especial',
  P: 'Preferencial'
};

/** Códigos promocionales que acepta el campo de descuento. */
export const PROMOCIONES: Record<string, number> = {
  BOVEDA10: 0.1,
  ESTUDIANTE5: 0.05,
  PIEZA1: 0.15
};

export const IVA = 0.13;
export const ENVIO = 9;
export const ENVIO_GRATIS_DESDE = 250;

export const ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente: 'Pendiente de pago',
  verificacion: 'Pago en verificación',
  pagado: 'Pagado y conciliado',
  anulada: 'Anulada'
};

/**
 * Máquina de estados del pago.
 * El backend es dueño de esta transición; el front solo ofrece las acciones permitidas.
 */
export const TRANSICIONES: Record<EstadoPago, EstadoPago[]> = {
  pendiente: ['verificacion', 'anulada'],
  verificacion: ['pagado', 'pendiente'],
  pagado: [],
  anulada: []
};

export function puedeTransitar(de: EstadoPago, a: EstadoPago): boolean {
  return TRANSICIONES[de].includes(a);
}

export function lineaDesdeCarrito(it: LineaCarrito): LineaFactura {
  return {
    productoId: it.id,
    nombre: it.nombre,
    set: it.set,
    numero: it.numero,
    rareza: it.rareza,
    certificadora: it.certificadora,
    nota: it.nota,
    numeroCertificado: it.numeroCertificado,
    cantidad: it.cantidad,
    precio: it.precio,
    stock: it.stock,
    unica: it.unica
  };
}

export function calcularTotales(lineas: LineaFactura[], promo = ''): TotalesFactura {
  const qty = lineas.reduce((s, l) => s + l.cantidad, 0);
  const sub = round2(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0));
  const pct = PROMOCIONES[promo] || 0;
  const disc = round2(sub * pct);
  const base = round2(sub - disc);
  const ship = sub === 0 ? 0 : base >= ENVIO_GRATIS_DESDE ? 0 : ENVIO;
  const iva = round2(base * IVA);
  return {
    qty, sub, disc, base, ship, iva,
    total: round2(base + ship + iva),
    promo: pct ? promo : '',
    promoLabel: pct ? `${promo} (−${Math.round(pct * 100)}%)` : ''
  };
}

/** La referencia de la transferencia es el folio sin prefijo. */
export const referenciaDesdeFolio = (folio: string) => folio.replace(/[^0-9]/g, '');

export function vencimientoReserva(desde = Date.now()): string {
  return new Date(desde + BANCO.plazoHoras * 3600 * 1000).toISOString();
}

export function proximoFolio(historial: Factura[], fecha = new Date()): string {
  const anio = fecha.getFullYear();
  const delAnio = historial.filter(f => f.folio.startsWith(`PV-${anio}-`)).length;
  return `PV-${anio}-${String(delAnio + 1).padStart(4, '0')}`;
}

/** es-SV ya devuelve «p. m.»; nunca se añade un punto después de la marca de tiempo. */
export function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-SV', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function fmtDia(iso: string): string {
  return new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Emite la factura en el momento del pedido, con el pago pendiente. */
export function nuevaFactura(
  folio: string,
  lineas: LineaFactura[],
  comprador: CompradorFactura,
  pago: Factura['pago'],
  promo = ''
): Factura {
  const fecha = new Date().toISOString();
  return {
    folio,
    referencia: referenciaDesdeFolio(folio),
    fecha,
    vence: vencimientoReserva(),
    estado: 'pendiente',
    pago,
    comprador,
    lineas,
    totales: calcularTotales(lineas, promo),
    avisos: []
  };
}

export function resumenAviso(a: AvisoPago): string {
  return `${a.fecha} · ${a.banco} · ${usd(a.monto)} · autorización ${a.referencia} · depositante ${a.depositante}`;
}
