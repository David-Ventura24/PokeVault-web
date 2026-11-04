import { http, modo } from "./http.js";
import { actualizarProductoMock, actualizarUsuarioMock, cambiarEstadoPagoMock, crearFacturaMock, crearProductoMock, eliminarProductoMock, eliminarUsuarioMock, facturasMock, iniciarSesionMock, notificarPagoMock, productosMock, registrarseMock, usuariosMock } from "./mock.js";
export const API_MODO = modo();
async function aDataURL(archivo) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('No pudimos leer esa imagen.'));
        r.readAsDataURL(archivo);
    });
}
export const api = {
    modo: API_MODO,
    productos: () => API_MODO === 'http' ? http.productos() : Promise.resolve(productosMock()),
    crearProducto: (b, vendedor) => API_MODO === 'http' ? http.crearProducto(b) : crearProductoMock(b, vendedor),
    actualizarProducto: (id, p) => API_MODO === 'http' ? http.actualizarProducto(id, p) : actualizarProductoMock(id, p),
    eliminarProducto: (id) => API_MODO === 'http' ? http.eliminarProducto(id) : eliminarProductoMock(id),
    /** En mock la foto viaja como data URL; en HTTP se sube y se guarda la URL devuelta. */
    subirImagen: async (archivo) => {
        if (API_MODO === 'http') {
            const { url } = await http.subirImagen(archivo);
            return url;
        }
        return aDataURL(archivo);
    },
    usuarios: () => API_MODO === 'http' ? http.usuarios() : Promise.resolve(usuariosMock()),
    /** Alta de usuario desde el panel de administración: crea la cuenta sin tocar la sesión actual. */
    crearUsuario: async (d) => {
        if (API_MODO === 'http')
            return http.crearUsuario(d);
        if (d.password.length < 6)
            throw new Error('La contraseña temporal debe tener al menos 6 caracteres.');
        const s = await registrarseMock(d);
        return s.usuario;
    },
    actualizarUsuario: (id, p) => API_MODO === 'http' ? http.actualizarUsuario(id, p) : actualizarUsuarioMock(id, p),
    eliminarUsuario: (id) => API_MODO === 'http' ? http.eliminarUsuario(id) : eliminarUsuarioMock(id),
    iniciarSesion: (email, password) => API_MODO === 'http' ? http.iniciarSesion(email, password) : iniciarSesionMock(email, password),
    registrarse: (d) => {
        if (API_MODO === 'http')
            return http.registrarse(d);
        return d.password.length < 6
            ? Promise.reject(new Error('La contraseña debe tener al menos 6 caracteres.'))
            : registrarseMock(d);
    },
    facturas: () => API_MODO === 'http' ? http.facturas() : Promise.resolve(facturasMock()),
    crearFactura: (lineas, comprador, pago, promo = '') => API_MODO === 'http'
        ? http.crearFactura(lineas, comprador, pago, promo)
        : crearFacturaMock(lineas, comprador, pago, promo).then(r => r.factura),
    notificarPago: (folio, aviso) => API_MODO === 'http' ? http.notificarPago(folio, aviso) : notificarPagoMock(folio, aviso),
    cambiarEstadoPago: (folio, estado) => API_MODO === 'http' ? http.cambiarEstadoPago(folio, estado) : cambiarEstadoPagoMock(folio, estado)
};
