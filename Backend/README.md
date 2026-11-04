# Backend de PokéVault — carpeta preparada para el equipo del servidor

Esta carpeta es **un andamio de documentación**: no contiene código, solo el contrato que el
frontend ya consume, la estructura sugerida y un `.env.example`. Quien construye el backend
empieza aquí sin tener que leer el `Frontend/` completo.

Lo que **sí** está definido por el frontend (no negociable sin una entrega conjunta):
los paths, los métodos, los nombres de campo y la forma del error. Lo que **no** está definido:
lenguaje, framework, base de datos y estilo de código — son decisión del equipo del servidor.

> Fuente de verdad de los tipos: `Frontend/src/lib/types.ts`, compilada a `Frontend/js/types.js`.
> Referencia compacta de cuerpos JSON: [CONTRATO.md](./CONTRATO.md). Cambia un campo → cambia
> los dos archivos en la misma entrega.

---

## 1. Cómo se conecta el frontend

El frontend que se entrega es estático (`Frontend/`) y nunca elige el backend: la fachada
`Frontend/js/api.js` decide entre el mock local (`Frontend/js/mock.js`, localStorage) y el HTTP real
(`Frontend/js/http.js`). Esos archivos son la compilación de `Frontend/src/lib/*.ts`
(`cd Frontend && npm install && npx tsc -p tsconfig.sitio.json`), así que la lógica se lee mejor en el TS.

La elección vive en `Frontend/js/config.js` —se edita y se recarga, sin build ni variables de
entorno—:

```js
export const CONFIG = { URL_BASE: 'http://localhost:4000', modo: 'http' };
```

| Valor | Efecto |
| --- | --- |
| `modo: 'mock'` | Fuerza el mock local; el sitio funciona sin servidor. Es el defecto del repo. |
| `modo: 'http'` | Fuerza HTTP aunque `URL_BASE` esté vacía (fallará si no hay URL). |
| `URL_BASE` | Base de todas las rutas. Si `modo` no está fijado, una `URL_BASE` con valor pone el modo en `http`. |

Reglas del cliente:

- Las rutas se concatenan **tal cual** a la URL base: `pedir('/auth/login')` →
  `http://localhost:4000/auth/login`. **No hay prefijo `/api`**; si el servidor quiere uno,
  el frontend lo ajusta en `CONFIG.URL_BASE` (p. ej. `http://localhost:4000/api`), no en el código.
- Se quita la `/` final de la base, así que `http://localhost:4000/` y `http://localhost:4000` dan igual.
- Cabeceras que envía siempre: `Accept: application/json`, y `Content-Type: application/json`
  cuando hay cuerpo JSON.
- Si hay sesión guardada en `localStorage` (`pokevault_sesion`), añade `Authorization: Bearer <token>`.
- El token lo emite `POST /auth/login` o `POST /auth/registro`; el frontend no renueva tokens ni
  llama a un endpoint de logout.

Hasta que el backend exista, el equipo del frontend trabaja en modo `mock`, así que ninguna de
estas rutas es bloqueante para la interfaz.

---

## 2. Convenciones generales

1. **Errores.** Todo error se responde con `Content-Type: application/json` y un cuerpo de una sola
   clave: `{ "mensaje": "texto legible en español" }`. El frontend toma ese valor **literal** y lo
   muestra al usuario (`http.ts`, línea del `if (!res.ok)`); si falta la clave, se ve
   «El servidor respondió 400.» en lugar de la explicación. Nada de `error`, `detail` o `message`.
   El mensaje no debe exponer stack traces ni datos internos: es texto público.
2. **Códigos sugeridos:** `400` datos inválidos · `401` falta o expiró el token · `403` rol sin permiso
   (incluidos «suspendido» y «no es tu publicación») · `404` no existe · `409` conflicto (correo duplicado,
   sin stock) · `413` archivo demasiado grande · `422` transición de estado inválida.
3. **Éxito sin cuerpo:** `DELETE /productos/:id` y `DELETE /usuarios/:id` responden **`204 No Content`**.
   El frontend interpreta 204 como «sin dato» y **no** intenta leer JSON. Cualquier otro método devuelve JSON.
4. **Ids en string** (el mock genera formato `pv-...`, `u-...`): no se asuma numérico.
5. **Fechas** en ISO 8601 con zona (`2026-11-03T15:20:41.000Z`); el frontend las formatea en `es-SV`.
6. **Moneda:** USD, dos decimales numéricos (no string). El frontend redondea a 2 decimales al mostrar.
7. **Nunca** se devuelve el hash ni la contraseña en ningún cuerpo de respuesta.

---

## 3. Endpoints

Resumen (todo bajo la URL base, sin prefijo):

| # | Método | Path | Autorización | Respuesta |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/auth/login` | pública | `Sesion` |
| 2 | `POST` | `/auth/registro` | pública | `Sesion` |
| 3 | `GET` | `/productos` | pública | `Producto[]` |
| 4 | `POST` | `/productos` | Bearer | `Producto` (201) |
| 5 | `PUT` | `/productos/:id` | Bearer (dueño o administrador) | `Producto` |
| 6 | `DELETE` | `/productos/:id` | Bearer (dueño o administrador) | `204` |
| 7 | `POST` | `/archivos` | Bearer | `{ url }` |
| 8 | `GET` | `/usuarios` | Bearer administrador | `Usuario[]` |
| 9 | `POST` | `/usuarios` | Bearer administrador | `Usuario` |
| 10 | `PUT` | `/usuarios/:id` | Bearer administrador | `Usuario` |
| 11 | `DELETE` | `/usuarios/:id` | Bearer administrador | `204` |
| 12 | `GET` | `/facturas` | Bearer | `Factura[]` |
| 13 | `POST` | `/facturas` | pública (o Bearer si el comprador tiene cuenta) | `Factura` (201) |
| 14 | `POST` | `/facturas/:folio/avisos` | pública | `Factura` |
| 15 | `POST` | `/facturas/:folio/estado` | Bearer administrador | `Factura` |

### 3.1 Autenticación

**`POST /auth/login`** — pública.

```json
{ "email": "lucia@pokevault.com", "password": "secreta1" }
```

`200` → `Sesion`: `{ "token": "<jwt>", "usuario": { Usuario sin password }, "emitida": "<ISO>" }`.

Validaciones obligatorias en el servidor (la página de login ya comprueba el formato del correo y los
6 caracteres antes de llamar, pero **el backend no puede confiar en eso**: hay que repetir ambas
comprobaciones): credenciales correctas
(`401` → `{"mensaje":"Correo o contraseña no coinciden."}`) y **cuenta suspendida**
(`403` → `{"mensaje":"Tu cuenta está suspendida. Escríbenos a facturas@pokevault.com"}`).
El mock «registra al que inicia sesión con un correo nuevo»; el backend **no** debe hacer eso:
login con correo inexistente es `401`.

**`POST /auth/registro`** — pública.

```json
{ "nombre": "Lucía Fuentes", "email": "lucia@pokevault.com", "telefono": "7890-1234",
  "direccion": "Col. Escalón, San Salvador", "rol": "vendedor", "password": "secreta1" }
```

`200` → `Sesion` (la misma forma que login: el frontend inicia sesión de inmediato tras registrarse).
`409` si el correo ya existe → `{"mensaje":"Ese correo ya tiene una cuenta. Inicia sesión o recupérala."}`.
`400` si `password` tiene menos de 6 caracteres o falta nombre/correo. El `rol` viene del formulario
(`comprador` | `vendedor` | `administrador`): **nunca** dejar que el cliente se autoasigne `administrador`
sin una verificación adicional; validar el email en minúsculas y sin duplicados.

> El token se guarda en `localStorage` y se envía como Bearer. Debe ser autoverificable (JWT) y
> llevar el `rol` o permitir recuperarlo barato, porque autorización por rol es responsabilidad del servidor.

### 3.2 Productos

**`GET /productos`** — pública, sin parámetros de consulta.

`200` → `Producto[]`.

Importante para que la vitrina no se rompa:

- El frontend **no** manda filtros, paginación ni búsqueda; trae el catálogo completo y filtra en memoria.
- Debe devolver **todos** los orígenes y **todos** los estados (`publicado`, `en_revision`, `rechazado`),
  porque el panel del vendedor y el del administrador se pintan con esa misma respuesta.
- La vitrina y la sección de comunidad filtran en el navegador: solo `estado === 'publicado'`,
  `origen === 'tienda'` en la portada y `origen === 'comunidad'` en la sección comunitaria.

**`POST /productos`** — Bearer obligatorio (lo llama el formulario de publicación de un vendedor).

Cuerpo: `ProductoBorrador` (ver CONTRATO.md). No envía `id`, `origen`, `vendedorId`, `vendedorNombre`,
`estado` ni `creado`: **esos los fija el servidor**, ignorando cualquier valor que el cliente intente mandar.

- `origen`: `tienda` si el token es de un `administrador`, `comunidad` para cualquier otro rol
  (un comprador también puede vender).
- `estado`: `publicado` solo para administrador; **toda publicación de usuario entra en `en_revision`**
  y la aprueba el administrador.
- `vendedorId` / `vendedorNombre`: del token. `id` y `creado`: generados por el servidor.
- `unica: true` ⇒ `stock` se topa a 1 (pieza única 1/1).
- `etiqueta`, `codigo` y `numeroCertificado` tienen valores por defecto derivados en el mock
  (`etiqueta` ← `rareza`, `codigo` ← `SET NUMERO`, `numeroCertificado` ← `—`); conviene replicarlos
  para que la ficha detallada no salga en blanco.

`201` → `Producto` completo (el frontend usa la respuesta tal cual).

**`PUT /productos/:id`** — Bearer; solo el dueño de la publicación o un administrador.

Cuerpo: parche parcial (`Partial<Producto>`), p. ej. `{ "precio": 120, "stock": 2 }` o
`{ "estado": "publicado" }` (alta del administrador) o `{ "estado": "en_revision" }`
(retiro que hace el propio vendedor desde su panel). Respuesta: `Producto` ya combinado.

**`DELETE /productos/:id`** — Bearer; dueño o administrador. `204` sin cuerpo.
El borrado es físico o lógico, decisión del equipo; el frontend solo espera `204`.

### 3.3 Archivos

**`POST /archivos`** — Bearer, `multipart/form-data`, el campo se llama **`archivo`** (un solo archivo).

`200` → `{ "url": "https://.../uploads/ab12cd.jpg" }`. Esa `url` se guarda luego en `Producto.imagen`,
así que debe ser **accesible desde el navegador** (servido estático o bucket público) sin cabecera
de autenticación. Lo que el servidor **sí** controla es el nombre del archivo: generado por él, nunca
el nombre original. Si filtra por MIME o por tamaño, está cerrando un vector que la rúbrica (§4/§5)
pide dejar abierto: decisión del equipo, no default — ver `UPLOAD_MAX_BYTES` y `UPLOAD_ALLOWED_MIME`.

> Detalle de integración: el front fija `Content-Type: application/json` **solo cuando el cuerpo
> es JSON**; en `POST /archivos` manda un `FormData` sin cabecera, para que el navegador escriba
> el `boundary` del multipart (`Frontend/js/http.js`, compilado desde `Frontend/src/lib/http.ts`).
> Si su framework rechaza la petición, revisen el parser multipart antes de tocar el front: el
> backend no debe «adaptarse» aceptando JSON en una ruta de archivos.

### 3.4 Usuarios (panel de administración)

**`GET /usuarios`** — Bearer administrador. `200` → `Usuario[]` (sin credenciales).
**`POST /usuarios`** — Bearer administrador. Alta desde el panel, **sin** tocar la sesión actual:
la respuesta es `Usuario`, no `Sesion`. Mismo cuerpo que `/auth/registro`, con la misma regla de
`password` ≥ 6 y correo único.
**`PUT /usuarios/:id`** — Bearer administrador. Parche parcial (`Partial<Usuario>`): `rol`,
`estado` (`activo` | `suspendido`) y datos de contacto. Nunca `password` por esta ruta
(ver endpoints sugeridos, §6).
**`DELETE /usuarios/:id`** — Bearer administrador. `204`. **Rechazar con `409` si es el último
administrador** → `{"mensaje":"No se puede eliminar al último administrador."}` (el mock ya lo hace;
si falta, el proyecto se queda sin acceso al panel).

### 3.5 Facturas y pago

**`GET /facturas`** — Bearer.

`200` → `Factura[]`. Lo consumen dos vistas: el historial del comprador (`/carrito`) y el panel de
conciliación (`/admin`). Sugerencia: `administrador` → todas; cualquier otro rol → solo las cuya
`comprador.email`/`vendedorId` le pertenezca. Si se decide otro criterio, avisen al frontend:
la vista de carrito ignora el error y muestra historial vacío, así que un `403` no rompe la compra.

**`POST /facturas`** — pública en la práctica (se puede comprar sin cuenta); si hay Bearer,
vincular la factura al usuario.

```json
{
  "lineas": [ { "productoId": "pv-1", "nombre": "…", "cantidad": 1, "precio": 320, "stock": 3, "unica": false } ],
  "comprador": { "nombre": "…", "rfc": "06142019-1", "email": "…", "telefono": "…", "direccion": "…",
                 "ciudad": "…", "departamento": "…", "cp": "1101", "condicion": "C", "condicionLabel": "C — Consumidor Final · …" },
  "pago": { "metodo": "Transferencia entre bancos", "tipo": "Transferencia" },
  "promo": "BOVEDA10"
}
```

Cada `lineas[i]` es `LineaFactura` completa (incluye `set`, `numero`, `rareza`, `certificadora`,
`nota`, `numeroCertificado`, `stock`, `unica`): **el frontend manda lo que ve en el carrito, el
backend recalcula lo que cobra.** Recalculen `precio` y `stock` desde la base de datos e ignoren el
precio del cuerpo; si el cliente mandó un precio distinto, se usa el del catálogo (no es un error).

El servidor responde `Factura` completa, con:

- `folio` `PV-YYYY-NNNN`, consecutivo por año y **único**; generar dentro de la misma transacción
  (dos pedidos simultáneos no pueden quedar con el mismo folio).
- `referencia`: los dígitos del folio sin el prefijo (`PV-2026-0042` → `0042`), es lo que el comprador
  escribe en la transferencia.
- `fecha` ahora, `vence` ahora + **72 h** (la reserva expira).
- `estado` siempre `pendiente`, `avisos: []`.
- `totales` calculados por el servidor (ver §4), **nunca** los que envíe el cliente.
- Descuenta `stock` de cada línea **en la misma transacción** de la factura; si alguna pieza no tiene
  stock suficiente, toda la operación se revierte (`409`, `{"mensaje":"La pieza X ya no tiene stock disponible."}`).
  Pieza única (`unica: true`): máximo 1 en la factura y máximo 1 en vitrina ajena.

**`POST /facturas/:folio/avisos`** — pública (es el botón «ya transfiero» del comprador).

Cuerpo: `AvisoPago` → `{ "banco": "Banco Cuscatlán", "referencia": "0042", "fecha": "03/11/2026",
"monto": 372.40, "depositante": "Juan Pérez", "hora": "14:22" }`.

`200` → `Factura` con el aviso añadido a `avisos` y `estado` cambiado a `verificacion`. Solo es legal
desde `pendiente` (`TRANSICIONES`); desde cualquier otro estado responder `422`
→ `{"mensaje":"Esta factura no puede pasar a verificación."}`.

**`POST /facturas/:folio/estado`** — Bearer administrador (conciliación).

Cuerpo: `{ "estado": "pagado" }` | `{ "estado": "pendiente" }` | `{ "estado": "anulada" }`.

`200` → `Factura` actualizada. Efectos que el frontend espera:

- `pagado`: además de `estado`, fijar `registro` (copia del último aviso con `hora` = timestamp ISO del
  registro) y `pagado` (ISO). Solo legal desde `verificacion`.
- `anulada`: fijar `anulada` (ISO) y **devolver el stock** de cada línea (`stock + cantidad`,
  nunca por debajo de 0), en la misma transacción. Legal desde `pendiente` o `verificacion`.
- `pendiente`: reabrir una factura en `verificacion` (el administrador no encontró el depósito).
- `verificacion`: solo legal desde `pendiente`; no se usa desde el panel pero hay que aceptarlo.

`422` si la transición no existe → `{"mensaje":"No se puede pasar de pagado a pendiente."}`.
`404` si el folio no existe → `{"mensaje":"No encontramos esa factura."}`.

---

## 4. Reglas de negocio (de `Frontend/src/lib/factura.ts`)

| Regla | Valor |
| --- | --- |
| Moneda | USD (curso legal en El Salvador); no hay colón ni tipo de cambio. |
| IVA | 13 % sobre la base gravable. |
| Envío | US$9 fijo; **gratis** cuando la base (después del descuento) es ≥ US$250. Si el subtotal es 0, envío 0. |
| Redondeo | 2 decimales en cada componente (`sub`, `disc`, `base`, `iva`, `ship`, `total`). |
| Promociones | `BOVEDA10` = −10 %, `ESTUDIANTE5` = −5 %, `PIEZA1` = −15 %. Código desconocido ⇒ sin descuento (el frontend ya lo filtra; el servidor recalcula igual). |
| Orden del cálculo | `sub = Σ precio·cantidad` → `disc = sub·pct` → `base = sub − disc` → `iva = base·0.13` → `total = base + ship + iva`. |
| Reserva | 72 h desde la emisión (`vence`). |
| Folio | `PV-YYYY-NNNN`, consecutivo **por año civil**, con ceros a la izquierda. |
| Pago | Transferencia bancaria nacional o efectivo contra entrega. |

Datos fiscales de la emisora (van en el documento, no en el JSON de la API): razón social
«PokéVault El Salvador, S.A. de C.V.», NIT `06142019-1`, NRC `317894-2`, Contribuyente del Régimen Común,
correo `facturas@pokevault.com`. Cuenta de depósito: Cuscatlán, corriente monetaria USD
(`Frontend/src/lib/factura.ts`, `EMPRESA` y `BANCO`).

Reglas de estado y seguridad que el mock impone y el servidor debe heredar:

1. Publicación de usuario ⇒ `en_revision`; la aprueba un administrador con `PUT /productos/:id`.
2. Solo un administrador publica directo en `publicado`.
3. `unica: true` ⇒ `stock ≤ 1`, también en la edición.
4. `POST /facturas` descuenta stock atómicamente; `anulada` lo restaura.
5. Pago: `pendiente → verificacion → pagado`, `pendiente → anulada`, `verificacion → pendiente`,
   `verificacion → pagado`. `pagado` y `anulada` son estados finales.
6. Correo único en registro y en alta de usuario.
7. Usuario `suspendido` no puede iniciar sesión.
8. No se elimina ni se degrada al último administrador.
9. Validación de entrada en el servidor en las 15 rutas: el frontend valida la UX, no la seguridad.
   Se refiere a **reglas de negocio** (formatos, rangos, estados, roles), no a escapar ni sanitizar
   el texto que escribe el usuario: ver la nota de vulnerabilidades en la sección 5.

### ¿Hay pasarela de pago?

**No. No hay pasarela de pago, ni webhook, ni tarjeta, ni PayPal, ni Stripe, ni PSE.** El flujo es
transferencia bancaria o depósito en ventanilla/cajero: el comprador transfiere por su banco, reporta
el aviso (`POST /facturas/:folio/avisos`), y una persona del equipo concilia mirando el estado de cuenta
y marca `pagado` o devuelve a `pendiente`. Por eso la API no expone ningún endpoint de cobro ni acepta
datos de tarjeta: **no los almacenen ni los acepten en el cuerpo de una petición**. El único movimiento
de dinero verificable es el que confirma el administrador.

---

## 5. CORS y seguridad perimetral

El frontend llama la API **directamente desde el navegador** (en desarrollo `Frontend/` servido por
`node Frontend/servidor-local.mjs` en `http://localhost:4173`), así que el servidor debe responder preflight:

| Cabecera de respuesta | Valor mínimo |
| --- | --- |
| `Access-Control-Allow-Origin` | el origen del front: `http://localhost:4173` en desarrollo y, en el laboratorio, el que devuelva Nginx/Apache (configurable vía `CORS_ORIGIN`). Si el front y la API quedan en el mismo origen no hace falta preflight, pero conviene tenerlo. No usar `*` si luego se agregan cookies. |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | `Authorization, Content-Type, Accept` |
| `Access-Control-Max-Age` | `86400` |
| `Access-Control-Expose-Headers` | no hace falta (el cliente solo lee el cuerpo) |

- `OPTIONS` sobre cualquier ruta debe responder **`204` con esas cabeceras y sin cuerpo**; `PUT`,
  `DELETE` y todo `POST` con `Content-Type: application/json` disparan preflight, así que sin
  manejo de `OPTIONS` el panel de administración no funciona.
- El frontend **no** usa cookies ni credenciales CORS: la autenticación viaja solo en
  `Authorization: Bearer`. No hace falta `Access-Control-Allow-Credentials`.
- Las URLs devueltas por `POST /archivos` se consumen como `<img src>`: deben permitir lectura pública
  sin cabecera de autenticación.
- **No endurezcas lo que la entrega pide dejar vulnerable.** La definición del proyecto (§4,
  "Vulnerabilidades obligatorias") exige **al menos una vulnerabilidad a nivel de código y una a
  nivel de servidor**, explotables, reproducibles y documentadas. Este proyecto ya tiene la de
  código montada del lado del front: el nombre, la descripción y los datos del vendedor de las
  piezas de la comunidad se pintan **sin escapar** en `Frontend/js/carta.js` (XSS almacenado), así que
  el servidor tampoco debe sanitizar ni escapar esos campos al guardarlos ni al devolverlos — si
  los limpia, la vulnerabilidad desaparece y se pierde el punto de la rúbrica.
- Para la de servidor, el equipo elige una de la misma lista (puertos abiertos innecesarios o
  `Content-Type` / `X-Content-Type-Options: nosniff` mal configurado) y **no la tapa por accidente**
  con un `helmet()` genérico. Por eso, en la medida de lo posible: sin límite de intentos ni bloqueo
  en `POST /auth/login` (fuerza bruta, si la eligen como vulnerabilidad de código alternativa), sin
  límite de tamaño ni lista blanca de MIME en `POST /archivos`, y contraseña guardada como decida el
  equipo. Endurecer cualquiera de estos puntos es un cambio de alcance: se habla con el docente.
- Lo que **sí** debe quedar bien: las reglas de negocio de la sección 2 (estados, stock, folios,
  roles), la respuesta `{ "mensaje": ... }` y que nunca se devuelva la contraseña ni su hash.

---

## 6. Endpoints sugeridos (**el front aún no los usa**)

Ninguno de estos lo usa hoy el frontend; añadir solo cuando exista la pantalla correspondiente y avisar
en `CONTRATO.md`.

| Método | Path | Para qué |
| --- | --- | --- |
| `GET` | `/auth/yo` | validar el token al arrancar y renovar `usuario` (hoy el front confía en `localStorage`). |
| `POST` | `/auth/logout` | invalidar el token; hoy el front solo borra el `localStorage`. |
| `POST` | `/auth/password/recuperar` | enviar correo con enlace de restablecimiento. |
| `PUT` | `/auth/password` | cambiar la contraseña autenticado (hoy no hay forma de cambiarla). |
| `GET` | `/productos/:id` | ficha directa por id (la vitrina filtra en memoria). |
| `GET` | `/facturas/:folio` | consultar una factura sin traer el listado. |
| `GET` | `/salud` | sondeo de despliegue. |

Si se implementa `/auth/yo`, el frontend puede dejar de fiarse del rol guardado en `localStorage`;
mientras tanto, **el servidor es la única autoridad real**: un usuario puede editar su token en el
navegador y ver pantallas de administrador, y el backend debe responder `403` a cualquier operación
no autorizada pase lo que pase en la interfaz.

---

## 7. Estructura de carpetas sugerida

```
backend/
├── README.md            ← este documento (contrato HTTP)
├── CONTRATO.md          ← cuerpos JSON espejo de Frontend/src/lib/types.ts
├── .env.example         ← placeholders comentados, sin secretos
├── .gitignore
├── src/
│   ├── routes/          ← definición de rutas (sin lógica)
│   ├── controllers/     ← leer petición, revisar permiso, responder JSON
│   ├── services/        ← reglas de negocio y transacciones
│   ├── models/          ← entidades y validaciones de campo
│   ├── middlewares/     ← Bearer, roles, CORS, subida de archivos, error {mensaje}
│   ├── db/              ← conexión y semilla
│   │   └── migrations/  ← migraciones versionadas y reversibles
│   └── utils/           ← JWT, folios, redondeo, DUI/NIT
└── tests/               ← pruebas de servicios y endpoints
```

Cada carpeta tiene un `README.md` de una línea diciendo qué va ahí. Nada impide renombrar o
adoptar otra arquitectura (monolito, capas, hexagonal); lo que no cambia es el contrato de §2 a §5.

---

## 8. Variables de entorno

Copiar `.env.example` a `.env` (ignorada por git) y completar. Son **placeholders**: nunca
subir secretos reales ni tokens de ejemplo que parezcan válidos. El backend elige cómo leerlas;
el único detalle que importa al frontend es que `PORT` y `CORS_ORIGIN` coincidan con el
`URL_BASE` que el front tenga en `Frontend/js/config.js`.

---

## 9. Checklist antes de dar por «integrado»

1. Poner en `Frontend/js/config.js` `{ URL_BASE: 'http://localhost:PORT', modo: 'http' }`, recargar
   el sitio y la vitrina pinta el catálogo real.
2. Login de administrador y de vendedor; cuenta suspendida bloqueada con su `{"mensaje": …}` visible.
3. Publicación de vendedor queda `en_revision`, la vitrina no la muestra, el panel del admin sí, y
   al aprobarla aparece en la tienda.
4. Subida de imagen desde `/vender` devuelve `url` visible en `<img>`.
5. Compra sin sesión: factura con folio correcto, totales recalculados, stock descontado.
6. Aviso de pago → `verificacion`; conciliación → `pagado` con `registro` y `pagado` poblados.
7. Anulación → stock restaurado; transición inválida → `422` con mensaje legible.
8. Último administrador no se borra; correo duplicado → `409`.
9. Preflight `OPTIONS` correcto en `PUT`, `DELETE` y `/archivos`.
