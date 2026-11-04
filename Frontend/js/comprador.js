import { CONDICIONES } from "./factura.js";
/** Condición de la operación en el sentido comercial del pedido. */
export const OPERACIONES = {
    C: 'Contado — transfiero antes del despacho',
    E: 'Contra entrega — pago en efectivo al recibirla',
    P: 'Abono parcial — transfiero una parte hoy'
};
export const FORMAS_PAGO = [
    { texto: 'Transferencia', metodo: 'Transferencia entre bancos', tipo: 'Transferencia' },
    { texto: 'Efectivo contra entrega', metodo: 'Efectivo contra entrega', tipo: 'Efectivo' }
];
export const DATOS_INICIALES = {
    nombre: '', rfc: '', email: '', telefono: '', direccion: '', ciudad: '',
    departamento: '', cp: '', condicion: 'C',
    pago: { metodo: FORMAS_PAGO[0].metodo, tipo: FORMAS_PAGO[0].tipo }
};
const DUI = /^\d{8}-\d$/;
const TEL = /^(\+\d{2,3}[\s-]?)?\d{4}[\s-]?\d{4}$/;
/** El DUI son 9 dígitos (8 + verificador). Deja pasar solo números y pone el guion solo. */
export function mascaraDui(v) {
    const d = v.replace(/\D+/g, '').slice(0, 9);
    return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8)}` : d;
}
/** Un solo lugar donde se valida el dato fiscal: lo usan el formulario y la página. */
export function erroresDe(d) {
    const e = {};
    if (d.nombre.trim().length < 3)
        e.nombre = 'Escribe el nombre tal como debe salir en la factura.';
    if (!DUI.test(d.rfc.trim()))
        e.rfc = 'El DUI lleva 9 dígitos: 12345678-9.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email.trim()))
        e.email = 'Revisa el correo: ahí llega la factura.';
    if (!TEL.test(d.telefono.trim()))
        e.telefono = '8 dígitos, necesario para la mensajería.';
    if (d.direccion.trim().length < 8)
        e.direccion = 'Falta la dirección de entrega.';
    if (d.ciudad.trim().length < 3)
        e.ciudad = 'Falta el municipio.';
    if (!d.departamento)
        e.departamento = 'Selecciona el departamento.';
    if (!/^\d{4}$/.test(d.cp.trim()))
        e.cp = '4 dígitos.';
    return e;
}
export function esValido(d) {
    return Object.keys(erroresDe(d)).length === 0;
}
/** La condición fiscal impresa es Consumidor Final / Especial / Preferencial. */
export function compradorDesde(d) {
    return {
        nombre: d.nombre.trim(),
        rfc: d.rfc.trim().toUpperCase(),
        email: d.email.trim().toLowerCase(),
        telefono: d.telefono.trim(),
        direccion: d.direccion.trim(),
        ciudad: d.ciudad.trim(),
        departamento: d.departamento,
        cp: d.cp.trim(),
        condicion: d.condicion,
        condicionLabel: `${d.condicion} — ${CONDICIONES[d.condicion]} · ${OPERACIONES[d.condicion]}`
    };
}
/** Para que el cliente logueado no vuelva a escribir sus datos. */
export function desdeUsuario(u) {
    if (!u)
        return DATOS_INICIALES;
    return {
        ...DATOS_INICIALES,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        direccion: u.direccion.split(',')[0] ?? ''
    };
}
