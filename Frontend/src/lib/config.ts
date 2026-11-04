export type ModoConfig = '' | 'mock' | 'http';

/**
 * Configuración del frontend estático. Editar `Frontend/js/config.js` y recargar:
 * no hace falta compilación para cambiar de modo. `URL_BASE` vacío (o modo
 * `mock`) deja el sitio funcionando con datos locales en localStorage;
 * `modo: 'http'` manda todo al backend real del equipo del servidor.
 *
 * Este archivo es la fuente del `config.js` que lee el navegador: si se recompila
 * la capa de datos, los valores de abajo son los que se escriben.
 */
export const CONFIG: { URL_BASE: string; modo: ModoConfig } = {
  URL_BASE: '',
  modo: 'mock'
};
