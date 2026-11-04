import { http, modo } from './http.ts';
import {
  actualizarProductoMock, actualizarUsuarioMock, cambiarEstadoPagoMock, crearFacturaMock,
  crearProductoMock, eliminarProductoMock, eliminarUsuarioMock, facturasMock, iniciarSesionMock,
  notificarPagoMock, productosMock, registrarseMock, usuariosMock
} from './mock.ts';
import type {
  AvisoPago, CompradorFactura, EstadoPago, Factura, FormaPago, LineaFactura,
  Producto, ProductoBorrador, Sesion, Usuario
} from './types.ts';

/**
 * Fachada única de datos. Las páginas nunca eligen backend: hablan con `api`
 * y este archivo decide entre el mock local y el HTTP real según el entorno.
 */
export type Modo = 'mock' | 'http';

export const API_MODO: Modo = modo();

async function aDataURL(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No pudimos leer esa imagen.'));
    r.readAsDataURL(archivo);
  });
}

export const api = {
  modo: API_MODO,

  productos: (): Promise<Producto[]> =>
    API_MODO === 'http' ? http.productos() : Promise.resolve(productosMock()),

  crearProducto: (b: ProductoBorrador, vendedor: Usuario | null): Promise<Producto> =>
    API_MODO === 'http' ? http.crearProducto(b) : crearProductoMock(b, vendedor),

  actualizarProducto: (id: string, p: Partial<Producto>): Promise<Producto> =>
    API_MODO === 'http' ? http.actualizarProducto(id, p) : actualizarProductoMock(id, p),

  eliminarProducto: (id: string): Promise<void> =>
    API_MODO === 'http' ? http.eliminarProducto(id) : eliminarProductoMock(id),

  /** En mock la foto viaja como data URL; en HTTP se sube y se guarda la URL devuelta. */
  subirImagen: async (archivo: File): Promise<string> => {
    if (API_MODO === 'http') {
      const { url } = await http.subirImagen(archivo);
      return url;
    }
    return aDataURL(archivo);
  },

  usuarios: (): Promise<Usuario[]> =>
    API_MODO === 'http' ? http.usuarios() : Promise.resolve(usuariosMock()),

  /** Alta de usuario desde el panel de administración: crea la cuenta sin tocar la sesión actual. */
  crearUsuario: async (d: {
    nombre: string; email: string; telefono: string; direccion: string;
    rol: Usuario['rol']; password: string;
  }): Promise<Usuario> => {
    if (API_MODO === 'http') return http.crearUsuario(d);
    if (d.password.length < 6) throw new Error('La contraseña temporal debe tener al menos 6 caracteres.');
    const s = await registrarseMock(d);
    return s.usuario;
  },

  actualizarUsuario: (id: string, p: Partial<Usuario>): Promise<Usuario> =>
    API_MODO === 'http' ? http.actualizarUsuario(id, p) : actualizarUsuarioMock(id, p),

  eliminarUsuario: (id: string): Promise<void> =>
    API_MODO === 'http' ? http.eliminarUsuario(id) : eliminarUsuarioMock(id),

  iniciarSesion: (email: string, password: string): Promise<Sesion> =>
    API_MODO === 'http' ? http.iniciarSesion(email, password) : iniciarSesionMock(email, password),

  registrarse: (d: {
    nombre: string; email: string; telefono: string; direccion: string;
    rol: Usuario['rol']; password: string;
  }): Promise<Sesion> => {
    if (API_MODO === 'http') return http.registrarse(d);
    return d.password.length < 6
      ? Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres.'))
      : registrarseMock(d);
  },

  facturas: (): Promise<Factura[]> =>
    API_MODO === 'http' ? http.facturas() : Promise.resolve(facturasMock()),

  crearFactura: (
    lineas: LineaFactura[], comprador: CompradorFactura, pago: FormaPago, promo = ''
  ): Promise<Factura> =>
    API_MODO === 'http'
      ? http.crearFactura(lineas, comprador, pago, promo)
      : crearFacturaMock(lineas, comprador, pago, promo).then(r => r.factura),

  notificarPago: (folio: string, aviso: AvisoPago): Promise<Factura> =>
    API_MODO === 'http' ? http.notificarPago(folio, aviso) : notificarPagoMock(folio, aviso),

  cambiarEstadoPago: (folio: string, estado: EstadoPago): Promise<Factura> =>
    API_MODO === 'http' ? http.cambiarEstadoPago(folio, estado) : cambiarEstadoPagoMock(folio, estado)
};
