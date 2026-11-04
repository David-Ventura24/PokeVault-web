# PokéVault — repo del equipo

Bóveda en línea de cartas Pokémon originales y graduadas (CGC y PSA). El Salvador,
precios en USD, pago por transferencia con factura.

```
PokeVault-web/
  Frontend/          el frontend completo y entregable (HTML + módulos ES, sin compilar)
    *.html           index, login, registro, carrito, vender, admin, comunidad, perfil, contacto
    css/             una hoja por preocupación (base, acceso, vitrina, compra, paneles…)
    js/              vistas escritas a mano + la capa de datos compilada desde src/lib
    img/             arte del sitio
    src/lib/         fuente TypeScript de la capa de datos (13 módulos)
    servidor-local.mjs
    tsconfig.sitio.json
  Backend/           andamiaje y contrato para el equipo de servidor (sin lógica aún)
    README.md        los endpoints que el front ya consume, con sus códigos de respuesta
    CONTRATO.md      espejo legible de Frontend/src/lib/types.ts
    src/, tests/     carpetas con su README, vacías a propósito
    .env.example     valores sin endurecer (ver «Vulnerabilidades»)
```

## Arrancar el frontend

No hay nada que instalar: son HTML plano y módulos ES.

```powershell
cd "C:\Users\David Ventura\Desktop\PokeVault-web\Frontend"
node servidor-local.mjs          # http://localhost:4173
```

Si el puerto está ocupado: `node servidor-local.mjs 4174`. En el laboratorio ese mismo
árbol lo sirve el servidor web de la VM (Nginx o Apache) apuntando a `Frontend/`;
`servidor-local.mjs` es solo para probar sin levantar Nginx.

## Mock o backend real: un solo interruptor

No se elige con variables de entorno ni con un build, sino editando
`Frontend/js/config.js` y recargando:

```js
export const CONFIG = { URL_BASE: '', modo: 'mock' };
```

- `modo: 'mock'` (el defecto del repo) → catálogo, cuentas y facturas viven en el
  `localStorage` del navegador. El sitio funciona sin servidor alguno.
- `modo: 'http'` con `URL_BASE: 'http://localhost:4000'` → las mismas llamadas van al
  backend del otro equipo, con `Authorization: Bearer`.
- `modo: ''` → usa `http` si `URL_BASE` tiene valor y `mock` si está vacío.

`Frontend/js/api.js` es la fachada: ninguna vista habla con el transporte directamente, así
que cambiar de modo no toca una sola línea de las pantallas.

## La capa de datos se compila desde `Frontend/src/lib`

Los módulos `Frontend/js/{config,types,moneda,halo,empresa,sesion,factura,factura-documento,comprador,semilla,mock,http,api}.js`
son salida de `tsc` sobre `Frontend/src/lib/*.ts`, no se editan a mano:

```powershell
cd "C:\Users\David Ventura\Desktop\PokeVault-web\Frontend"
npm install          # solo para tener tsc; el sitio en sí no necesita dependencias
npm run compilar     # reescribe Frontend/js con los .js que lee el navegador
```

Dos reglas para que el árbol no se desincronice:

1. Un cambio en `src/lib/*.ts` sin recompilar deja `js/` atrás, y recompilar pisa cualquier
   edición hecha a mano sobre esos `.js`.
2. Los imports de esa capa se escriben terminados en `.ts`
   (`import { usd } from './moneda.ts'`). `tsconfig.sitio.json` activa
   `rewriteRelativeImportExtensions`, que los reescribe a `.js` al emitir —el navegador exige
   la extensión en los módulos ES— mientras el fuente sigue siendo legible y tipado.

Las vistas (`index.js`, `vitrina.js`, `carta.js`, `admin.js`, etc.) sí son escritas a mano:
ahí puedes tocar lo que quieras sin pasar por `tsc`.

## Vulnerabilidades a propósito: no las «arregles»

La definición del proyecto (§4) exige **al menos una vulnerabilidad a nivel de código y una a
nivel de servidor**, explotables, reproducibles y documentadas. Están metidas de forma
deliberada, así que un merge que las cierre le quita puntos a la entrega:

- **Código — XSS almacenado.** El nombre, la descripción y los datos del vendedor de las piezas
  que publica la comunidad se pintan sin escapar: `Frontend/js/carta.js` arma el HTML con
  plantilla (`cartaHtml`) y `innerHTML`, y lo mismo hacen `vitrina.js`, `rodaja.js` y
  `comunidad.js`.
- **Servidor — la elige el equipo de backend** (puertos abiertos innecesarios, o `Content-Type`
  / `X-Content-Type-Options: nosniff` mal configurado). Las reglas están en `Backend/README.md`,
  sección 5, y `Backend/.env.example` trae los valores sin endurecer. El servidor tampoco debe
  sanitizar esos campos al guardarlos ni al devolverlos.

## Qué cubre la entrega

| requisito | dónde |
| --- | --- |
| Índice público con vitrina 3D y catálogo | `Frontend/index.html` + `Frontend/js/{index,vitrina,rodaja}.js` |
| Login público | `Frontend/login.html` + `Frontend/js/login.js` |
| Registro público (comprador o vendedor) | `Frontend/registro.html` + `Frontend/js/registro.js` |
| Comprador: seleccionar piezas y generar factura | `Frontend/carrito.html` + `Frontend/js/{compra,factura-documento}.js` |
| Vendedor: subir foto, descripción, graduación, precio y stock | `Frontend/vender.html` + `Frontend/js/{vender,form-producto}.js` |
| Administrador: CRUD de productos, usuarios y pagos | `Frontend/admin.html` + `Frontend/js/admin.js` |
| Cartas de la comunidad, con el mismo render de la tienda | `Frontend/comunidad.html` + `Frontend/js/comunidad.js` |
| Perfil del usuario y sus publicaciones | `Frontend/perfil.html` + `Frontend/js/perfil.js` |
| Contacto y datos de la empresa | `Frontend/contacto.html` |

## Cuentas de prueba (modo mock)

La contraseña no se valida en mock; basta con 6 caracteres o más. Un correo inexistente se
autorregistra como `comprador`, así que el rol se fija por correo:

- `admin@pokevault.com` → administrador
- `marlon@correo.com` → vendedor
- `ana@correo.com` → comprador
