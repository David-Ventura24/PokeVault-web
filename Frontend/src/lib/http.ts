import { leerSesion } from './sesion.ts';
import { CONFIG } from './config.ts';
import type {
  AvisoPago, CompradorFactura, EstadoPago, Factura, FormaPago, LineaFactura,
  Producto, ProductoBorrador, Sesion, Usuario
} from './types.ts';

/**
 * Cliente HTTP del backend del equipo. La URL base y el modo viven en
 * `config.js`, que en el sitio entregado se edita y se recarga sin compilar.
 * Con `URL_BASE` vacío y sin modo fijado, api.ts usa el mock local y el sitio
 * sigue funcionando sin servidor.
 */
export const URL_BASE = CONFIG.URL_BASE || '';

export function modo(): 'mock' | 'http' {
  if (CONFIG.modo === 'http') return 'http';
  if (CONFIG.modo === 'mock') return 'mock';
  return URL_BASE ? 'http' : 'mock';
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const sesion = leerSesion();
  // FormData viaja sin Content-Type: el navegador pone el boundary del multipart.
  const esJson = typeof opciones.body === 'string';
  const res = await fetch(URL_BASE.replace(/\/$/, '') + ruta, {
    ...opciones,
    headers: {
      Accept: 'application/json',
      ...(esJson ? { 'Content-Type': 'application/json' } : {}),
      ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
      ...opciones.headers
    }
  });
  if (!res.ok) {
    let mensaje = `El servidor respondió ${res.status}.`;
    try {
      const c = await res.json();
      if (c?.mensaje) mensaje = c.mensaje;
    } catch {
      /* cuerpo no JSON */
    }
    throw new Error(mensaje);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const http = {
  iniciarSesion: (email: string, password: string) =>
    pedir<Sesion>('/auth/login', json({ email, password })),

  registrarse: (d: { nombre: string; email: string; telefono: string; direccion: string; rol: Usuario['rol']; password: string }) =>
    pedir<Sesion>('/auth/registro', json(d)),

  productos: () => pedir<Producto[]>('/productos'),
  crearProducto: (b: ProductoBorrador) => pedir<Producto>('/productos', json(b)),
  actualizarProducto: (id: string, p: Partial<Producto>) =>
    pedir<Producto>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  eliminarProducto: (id: string) => pedir<void>(`/productos/${id}`, { method: 'DELETE' }),

  subirImagen: (archivo: File) => {
    const forma = new FormData();
    forma.append('archivo', archivo);
    return pedir<{ url: string }>('/archivos', { method: 'POST', body: forma });
  },

  usuarios: () => pedir<Usuario[]>('/usuarios'),
  crearUsuario: (d: { nombre: string; email: string; telefono: string; direccion: string; rol: Usuario['rol']; password: string }) =>
    pedir<Usuario>('/usuarios', json(d)),
  actualizarUsuario: (id: string, p: Partial<Usuario>) =>
    pedir<Usuario>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  eliminarUsuario: (id: string) => pedir<void>(`/usuarios/${id}`, { method: 'DELETE' }),

  facturas: () => pedir<Factura[]>('/facturas'),
  crearFactura: (lineas: LineaFactura[], comprador: CompradorFactura, pago: FormaPago, promo: string) =>
    pedir<Factura>('/facturas', json({ lineas, comprador, pago, promo })),
  notificarPago: (folio: string, aviso: AvisoPago) =>
    pedir<Factura>(`/facturas/${folio}/avisos`, json(aviso)),
  cambiarEstadoPago: (folio: string, estado: EstadoPago) =>
    pedir<Factura>(`/facturas/${folio}/estado`, json({ estado }))
};
