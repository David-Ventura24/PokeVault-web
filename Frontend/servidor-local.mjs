/**
 * Servidor estático de desarrollo para este carpeta (el frontend entregable).
 * Sirve solo para probar sin levantar Nginx ni Apache; el despliegue del
 * laboratorio usa el servidor web real.
 *
 *   node servidor-local.mjs [puerto]     →  http://localhost:4173
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('./', import.meta.url));
const PUERTO = Number(process.argv[2] || 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

createServer(async (req, res) => {
  /* sin caché: el servidor es de desarrollo y un js viejo en disco daría errores falsos */
  const cabecera = { 'Cache-Control': 'no-store' };
  const url = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
  const ruta = normalize(join(RAIZ, url === '/' ? 'index.html' : url));
  if (!ruta.startsWith(RAIZ)) { res.writeHead(403, cabecera).end('Fuera del sitio'); return; }
  try {
    const cuerpo = await readFile(ruta);
    res.writeHead(200, { ...cabecera, 'Content-Type': TIPOS[extname(ruta).toLowerCase()] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch {
    /* sin extensión: se intenta como .html, igual que try_files de Nginx */
    try {
      const cuerpo = await readFile(ruta + '.html');
      res.writeHead(200, { ...cabecera, 'Content-Type': TIPOS['.html'] });
      res.end(cuerpo);
    } catch {
      res.writeHead(404, { ...cabecera, 'Content-Type': 'text/plain; charset=utf-8' }).end('No existe');
    }
  }
}).listen(PUERTO, () => console.log(`Frontend en http://localhost:${PUERTO}`));
