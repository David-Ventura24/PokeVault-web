/** Moneda y formato numérico. El dólar es la moneda de curso legal en El Salvador. */
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function usd(n) {
    return ('US$' +
        Number(n || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
}
const UN = [
    '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho',
    'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro',
    'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'
];
const DEC = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
function menor1000(n) {
    if (n < 30)
        return UN[n];
    if (n < 100)
        return DEC[Math.floor(n / 10)] + (n % 10 ? ' y ' + UN[n % 10] : '');
    if (n === 100)
        return 'cien';
    return CEN[Math.floor(n / 100)] + ' ' + menor1000(n % 100);
}
function millar(n) {
    if (n < 1000)
        return menor1000(n);
    const m = Math.floor(n / 1000);
    const r = n % 1000;
    const p = m === 1 ? 'mil' : menor1000(m) + ' mil';
    return r ? p + ' ' + menor1000(r) : p;
}
function entero(n) {
    if (!n)
        return 'cero';
    const M = Math.floor(n / 1e6);
    const r = n % 1e6;
    let s = M === 1 ? 'un millón' : M ? millar(M) + ' millones' : '';
    if (r)
        s += (s ? ' ' : '') + millar(r);
    return s;
}
/** «Con letra» obligatorio en la factura salvadoreña. */
export function conLetra(v) {
    const ent = Math.floor(v);
    const dec = Math.round((v - ent) * 100);
    return ((ent === 1 ? 'UN' : entero(ent).toUpperCase()) +
        ' ' + String(dec).padStart(2, '0') +
        '/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA');
}
