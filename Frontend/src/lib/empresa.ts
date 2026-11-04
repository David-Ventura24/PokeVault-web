/**
 * Datos de la empresa: los comparten la vista /contacto y el pie de página.
 * Cuando exista el backend, estos valores llegan de GET /empresa; el front no
 * cambia, solo deja de leer la constante.
 */
export const EMPRESA = {
  nombre: 'PokéVault',
  correoVentas: 'ventas@pokevault.com',
  correoSoporte: 'soporte@pokevault.com',
  correoFacturacion: 'facturacion@pokevault.com',
  telefono: '+503 2261 8000',
  whatsapp: '+503 7890 1234',
  direccion: 'Av. San Óscar No. 1234, Col. Escalón',
  ciudad: 'San Salvador, El Salvador',
  horario: 'Lunes a sábado · 9:00 a 19:00',
  horarioSoporte: 'Lunes a domingo · 9:00 a 21:00'
} as const;

/** tel: sin espacios ni signos, es el formato que entienden los marcadores. */
export const telHref = (numero: string) => `tel:${numero.replace(/[^\d+]/g, '')}`;

/** El número legible que se muestra en pantalla, sin el prefijo internacional. */
export const telVisible = (numero: string) => numero.replace('+503 ', '');
