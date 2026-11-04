import { CATALOGO_COMUNIDAD, CATALOGO_TIENDA, USUARIOS_SEMILLA } from './semilla.ts';
import { nuevaFactura, proximoFolio, puedeTransitar } from './factura.ts';
import type {
  AvisoPago, CompradorFactura, EstadoPago, Factura, LineaFactura, Producto,
  ProductoBorrador, Sesion, Usuario
} from './types.ts';
import { nombreDesde } from './sesion.ts';

/**
 * Repositorio local del modo mock.
 * Imita el contrato de backend/src (ver backend/README.md) para que el front
 * funcione sin servidor: mismos métodos, mismos cuerpos de respuesta, misma
 * máquina de estados del pago. Nada de esto sustituye la validación real del backend.
 */

const K_PRODUCTOS = 'pokevault:productos';
const K_USUARIOS = 'pokevault:usuarios';
const K_FACTURAS = 'pokevault:facturas';
const K_VERSION = 'pokevault:version-semilla';

/**
 * Cambiar la semilla no se nota en un navegador que ya guardó la anterior: los
 * datos viven en localStorage. Subir este número descarta el catálogo, los
 * usuarios y las facturas guardados en el modo mock y vuelve a sembrar.
 */
const VERSION_SEMILLA = 3;

const retardo = (ms = 120) => new Promise<void>(r => setTimeout(r, ms));

function reSembrar(): void {
  localStorage.removeItem(K_PRODUCTOS);
  localStorage.removeItem(K_USUARIOS);
  localStorage.removeItem(K_FACTURAS);
  localStorage.setItem(K_VERSION, String(VERSION_SEMILLA));
}

function leer<T>(k: string, semilla: T[]): T[] {
  if (localStorage.getItem(K_VERSION) !== String(VERSION_SEMILLA)) reSembrar();
  try {
    const v = JSON.parse(localStorage.getItem(k) || 'null');
    if (Array.isArray(v)) return v as T[];
  } catch {
    /* datos corruptos: se re-sembrarían abajo */
  }
  localStorage.setItem(k, JSON.stringify(semilla));
  return semilla.slice();
}

const escribir = <T,>(k: string, v: T[]) => localStorage.setItem(k, JSON.stringify(v));

const idNuevo = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function productosMock(): Producto[] {
  return leer<Producto>(K_PRODUCTOS, [...CATALOGO_TIENDA, ...CATALOGO_COMUNIDAD]);
}

export async function crearProductoMock(b: ProductoBorrador, vendedor: Usuario | null): Promise<Producto> {
  await retardo();
  const lista = productosMock();
  const p: Producto = {
    id: b.id || idNuevo('pv'),
    nombre: b.nombre.trim(),
    descripcion: b.descripcion.trim(),
    categoria: b.categoria,
    set: b.set.trim(),
    numero: b.numero.trim(),
    rareza: b.rareza.trim(),
    etiqueta: (b.etiqueta || b.rareza).trim(),
    codigo: (b.codigo || `${b.set} ${b.numero}`).toUpperCase().trim(),
    certificadora: b.certificadora,
    nota: b.nota,
    numeroCertificado: b.numeroCertificado || '—',
    precio: Number(b.precio),
    stock: Number(b.stock),
    imagen: b.imagen,
    origen: vendedor && vendedor.rol !== 'administrador' ? 'comunidad' : 'tienda',
    vendedorId: vendedor ? vendedor.id : null,
    vendedorNombre: vendedor ? vendedor.nombre : null,
    // Una publicación de un usuario entra en revisión; la aprueba el administrador.
    estado: vendedor && vendedor.rol === 'administrador' ? 'publicado' : 'en_revision',
    unica: !!b.unica,
    anio: b.anio, idioma: b.idioma, centrado: b.centrado, conservacion: b.conservacion,
    creado: new Date().toISOString()
  };
  if (p.unica) p.stock = Math.min(1, p.stock);
  lista.push(p);
  escribir(K_PRODUCTOS, lista);
  return p;
}

export async function actualizarProductoMock(id: string, parche: Partial<Producto>): Promise<Producto> {
  await retardo();
  const lista = productosMock();
  const i = lista.findIndex(p => p.id === id);
  if (i === -1) throw new Error('La pieza ya no existe en la bóveda.');
  lista[i] = { ...lista[i], ...parche, precio: Number(parche.precio ?? lista[i].precio), stock: Number(parche.stock ?? lista[i].stock) };
  if (lista[i].unica) lista[i].stock = Math.min(1, lista[i].stock);
  escribir(K_PRODUCTOS, lista);
  return lista[i];
}

export async function eliminarProductoMock(id: string): Promise<void> {
  await retardo();
  escribir(K_PRODUCTOS, productosMock().filter(p => p.id !== id));
}

export function usuariosMock(): Usuario[] {
  return leer<Usuario>(K_USUARIOS, USUARIOS_SEMILLA);
}

export async function actualizarUsuarioMock(id: string, parche: Partial<Usuario>): Promise<Usuario> {
  await retardo();
  const lista = usuariosMock();
  const i = lista.findIndex(u => u.id === id);
  if (i === -1) throw new Error('Ese usuario no está registrado.');
  lista[i] = { ...lista[i], ...parche };
  escribir(K_USUARIOS, lista);
  return lista[i];
}

export async function eliminarUsuarioMock(id: string): Promise<void> {
  await retardo();
  const lista = usuariosMock();
  const objetivo = lista.find(u => u.id === id);
  if (!objetivo) throw new Error('Ese usuario no está registrado.');
  if (objetivo.rol === 'administrador' && lista.filter(u => u.rol === 'administrador').length === 1) {
    throw new Error('No se puede eliminar al último administrador.');
  }
  escribir(K_USUARIOS, lista.filter(u => u.id !== id));
}

export async function registrarseMock(d: {
  nombre: string; email: string; telefono: string; direccion: string; rol: Usuario['rol'];
}): Promise<Sesion> {
  await retardo();
  const lista = usuariosMock();
  const email = d.email.trim().toLowerCase();
  if (lista.some(u => u.email.toLowerCase() === email)) {
    throw new Error('Ese correo ya tiene una cuenta. Inicia sesión o recupérala.');
  }
  const u: Usuario = {
    id: idNuevo('u'),
    nombre: d.nombre.trim() || nombreDesde(email),
    email,
    telefono: d.telefono.trim(),
    direccion: d.direccion.trim(),
    rol: d.rol,
    estado: 'activo',
    creado: new Date().toISOString()
  };
  lista.push(u);
  escribir(K_USUARIOS, lista);
  return { token: `mock.${u.id}.${Date.now().toString(36)}`, usuario: u, emitida: new Date().toISOString() };
}

/**
 * En el mock cualquier correo con forma válida y una contraseña de 6+ caracteres
 * entra: no hay servidor ni hash. Si el correo ya existe, se reutiliza ese usuario.
 */
export async function iniciarSesionMock(email: string, password: string): Promise<Sesion> {
  await retardo();
  const correo = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) throw new Error('El correo no tiene un formato válido.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const lista = usuariosMock();
  let u = lista.find(x => x.email.toLowerCase() === correo);
  if (!u) u = (await registrarseMock({ nombre: nombreDesde(correo), email: correo, telefono: '', direccion: '', rol: 'comprador' })).usuario;
  if (u.estado === 'suspendido') throw new Error('Tu cuenta está suspendida. Escríbenos a facturas@pokevault.com');
  return { token: `mock.${u.id}.${Date.now().toString(36)}`, usuario: u, emitida: new Date().toISOString() };
}

export function facturasMock(): Factura[] {
  return leer<Factura>(K_FACTURAS, []);
}

const indexFolio = (lista: Factura[], folio: string) => {
  const i = lista.findIndex(f => f.folio === folio);
  if (i === -1) throw new Error('No encontramos esa factura.');
  return i;
};

export async function crearFacturaMock(
  lineas: LineaFactura[], comprador: CompradorFactura, pago: Factura['pago'], promo = ''
): Promise<{ factura: Factura; stockAfectado: boolean }> {
  await retardo();
  const lista = facturasMock();
  const f = nuevaFactura(proximoFolio(lista), lineas, comprador, pago, promo);
  lista.push(f);
  escribir(K_FACTURAS, lista);
  // El mock descuenta el stock; el backend lo hace en la misma transacción que la factura.
  const productos = productosMock();
  productos.forEach(p => {
    const l = lineas.find(x => x.productoId === p.id);
    if (l) p.stock = Math.max(0, p.stock - l.cantidad);
  });
  escribir(K_PRODUCTOS, productos);
  return { factura: f, stockAfectado: true };
}

export async function notificarPagoMock(folio: string, aviso: AvisoPago): Promise<Factura> {
  await retardo();
  const lista = facturasMock();
  const i = indexFolio(lista, folio);
  if (!puedeTransitar(lista[i].estado, 'verificacion')) throw new Error('Esta factura no puede pasar a verificación.');
  lista[i].avisos.push(aviso);
  lista[i].estado = 'verificacion';
  escribir(K_FACTURAS, lista);
  return lista[i];
}

export async function cambiarEstadoPagoMock(folio: string, estado: EstadoPago): Promise<Factura> {
  await retardo();
  const lista = facturasMock();
  const i = indexFolio(lista, folio);
  const f = lista[i];
  if (!puedeTransitar(f.estado, estado)) throw new Error(`No se puede pasar de ${f.estado} a ${estado}.`);
  if (estado === 'pagado') {
    const ultimo = f.avisos[f.avisos.length - 1];
    f.registro = { ...ultimo, hora: new Date().toISOString() };
    f.pagado = new Date().toISOString();
  }
  if (estado === 'anulada') {
    f.anulada = new Date().toISOString();
    const productos = productosMock();
    f.lineas.forEach(l => {
      const p = productos.find(x => x.id === l.productoId);
      if (p) p.stock = Math.max(0, p.stock + l.cantidad);
    });
    escribir(K_PRODUCTOS, productos);
  }
  f.estado = estado;
  escribir(K_FACTURAS, lista);
  return f;
}
