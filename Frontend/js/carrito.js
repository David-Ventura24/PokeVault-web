/**
 * Pokédex = carrito real. Espejo de frontend/src/lib/carrito.ts: la misma lógica,
 * sin React. El estado vive en localStorage y los oidores avisan a quien pinte.
 */
import { round2 } from './moneda.js';
import { hayVentana } from './sesion.js';

const CLAVE = 'pokevault:carrito';
const VACIO = [];

const oidores = new Set();
let cache = null;

function leerCrudo() {
  if (!hayVentana()) return VACIO;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return Array.isArray(v) ? v : VACIO;
  } catch {
    return VACIO;
  }
}

export function carrito() {
  if (!cache) cache = leerCrudo();
  return cache;
}

export function escribirCarrito(items) {
  cache = items;
  if (hayVentana()) localStorage.setItem(CLAVE, JSON.stringify(items));
  oidores.forEach(o => o());
}

export function suscribirCarrito(odore) {
  oidores.add(odore);
  window.addEventListener('storage', () => { cache = null; odore(); });
  return () => oidores.delete(odore);
}

export function lineaDe(p, cantidad = 1) {
  return {
    id: p.id, nombre: p.nombre, precio: p.precio, cantidad, stock: p.stock,
    imagen: p.imagen, certificadora: p.certificadora, nota: p.nota,
    numeroCertificado: p.numeroCertificado, rareza: p.rareza,
    etiqueta: p.etiqueta, set: p.set, numero: p.numero, codigo: p.codigo, unica: p.unica
  };
}

export function agregarAlCarrito(p, cantidad = 1) {
  if (p.estado !== 'publicado') return { ok: false, mensaje: 'Esa pieza aún no está publicada.' };
  if (p.stock <= 0) return { ok: false, mensaje: 'Sin stock en bóveda.' };
  const items = carrito().slice();
  const i = items.findIndex(x => x.id === p.id);
  if (i === -1) {
    if (cantidad > p.stock) return { ok: false, mensaje: `Solo hay ${p.stock} pieza(s).` };
    items.push(lineaDe(p, cantidad));
    escribirCarrito(items);
    return { ok: true, mensaje: `${p.nombre} fue a tu Pokédex` };
  }
  const nueva = items[i].cantidad + cantidad;
  if (nueva > p.stock) return { ok: false, mensaje: `Solo hay ${p.stock} pieza(s) disponibles.` };
  items[i] = { ...items[i], cantidad: nueva, stock: p.stock };
  escribirCarrito(items);
  return { ok: true, mensaje: `${p.nombre}: ${nueva} en tu Pokédex` };
}

export function cambiarCantidad(id, cantidad) {
  const items = carrito().slice();
  const i = items.findIndex(x => x.id === id);
  if (i === -1) return;
  const tope = Math.max(1, items[i].stock || 1);
  items[i] = { ...items[i], cantidad: Math.min(tope, Math.max(1, Math.round(cantidad))) };
  escribirCarrito(items);
}

export function quitarDelCarrito(id) {
  escribirCarrito(carrito().filter(x => x.id !== id));
}

export function vaciarCarrito() {
  escribirCarrito([]);
}

/** Anulación de la factura: las piezas vuelven a la Pokédex. */
export function devolverAlCarrito(lineas) {
  const items = carrito().slice();
  lineas.forEach(l => {
    const i = items.findIndex(x => x.id === l.id);
    if (i === -1) items.push({ ...l, cantidad: Math.min(l.cantidad, Math.max(1, l.stock)) });
    else items[i] = { ...items[i], cantidad: Math.min(items[i].cantidad + l.cantidad, Math.max(1, l.stock)) };
  });
  escribirCarrito(items);
}

export function resumen() {
  const items = carrito();
  return {
    items,
    unidades: items.reduce((s, it) => s + it.cantidad, 0),
    subtotal: round2(items.reduce((s, it) => s + it.precio * it.cantidad, 0))
  };
}
