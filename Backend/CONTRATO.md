# Contrato de datos de PokéVault

> **Fuente de verdad:** `Frontend/src/lib/types.ts`, que el frontend entregado (`Frontend/`) ejecuta
> ya compilada en `Frontend/js/types.js`. Este archivo es un espejo legible desde el
> backend; si algún campo cambia, se cambia **en los dos archivos en la misma entrega**, se
> recompila (`npx tsc -p tsconfig.sitio.json` desde `Frontend/`) y se avisa al otro equipo.
> Aquí no se decide nada nuevo: se documenta lo que ya viaja por la red.

Convenciones que aplican a todos los cuerpos:

- Fechas: string ISO 8601 (`creado`, `emitida`, `fecha`, `vence`, `pagado`, `anulada`).
- Dinero: número USD con 2 decimales (`precio`, `monto`, `totales.*`).
- `?` después del nombre = campo opcional (puede venir ausente o `null` según se indique).
- Error en cualquier respuesta no-2xx: `{ "mensaje": string }`.

## Uniones de literales

| Tipo | Valores posibles |
| --- | --- |
| `Rol` | `'comprador'` \| `'vendedor'` \| `'administrador'` |
| `EstadoUsuario` | `'activo'` \| `'suspendido'` |
| `Categoria` | `'carta'` \| `'paquete'` |
| `Origen` | `'tienda'` \| `'comunidad'` (`tienda` = catálogo propio, `comunidad` = publicado por un usuario) |
| `EstadoProducto` | `'publicado'` \| `'en_revision'` \| `'rechazado'` |
| `EstadoPago` | `'pendiente'` \| `'verificacion'` \| `'pagado'` \| `'anulada'` |
| `CompradorFactura.condicion` | `'C'` \| `'E'` \| `'P'` |
| `FormaPago.tipo` | `'Transferencia'` \| `'Efectivo'` |

## Usuario

```ts
interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  rol: Rol;                       // 'comprador' | 'vendedor' | 'administrador'
  estado: EstadoUsuario;          // 'activo' | 'suspendido'
  creado: string;                 // ISO
}
```

Nunca se expone la contraseña ni su hash en ninguna respuesta.

## Sesion

```ts
interface Sesion {
  token: string;                  // se envía como Authorization: Bearer <token>
  usuario: Usuario;
  emitida: string;                // ISO
}
```

Sale de `POST /auth/login` y `POST /auth/registro`. El frontend lo guarda en `localStorage`
(clave `pokevault_sesion`) y no renueva el token.

## Producto

```ts
interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: Categoria;           // 'carta' | 'paquete'
  set: string;
  numero: string;
  rareza: string;
  etiqueta: string;               // esquina de la carta, p. ej. «1/1 Charizard»
  codigo: string;
  certificadora: string;          // CGC | PSA | BGS | SGS | 'Sellado'
  nota: string;                   // nota de graduación literal, p. ej. 'Pristine 10'
  numeroCertificado: string;
  anio?: string;                  // opcionales: datos finos de la ficha
  idioma?: string;
  centrado?: string;
  conservacion?: string;
  precio: number;                 // USD
  stock: number;
  imagen: string;                 // /img/... catálogo · data: o URL · comunidad
  origen: Origen;
  vendedorId: string | null;
  vendedorNombre: string | null;
  estado: EstadoProducto;
  unica: boolean;                 // pieza 1/1: stock no puede pasar de 1
  creado: string;                 // ISO
}
```

## ProductoBorrador

Cuerpo de `POST /productos`. Es `Producto` **sin** `id`, `origen`, `vendedorId`, `vendedorNombre`,
`estado` y `creado` (esos los fija el servidor) y con `id` opcional:

```ts
type ProductoBorrador = Omit<
  Producto,
  'id' | 'origen' | 'vendedorId' | 'vendedorNombre' | 'estado' | 'creado'
> & { id?: string };
```

`PUT /productos/:id` envía un parche parcial (`Partial<Producto>`): solo los campos que cambian.

## LineaFactura

```ts
interface LineaFactura {
  productoId: string;
  nombre: string;
  set: string;
  numero: string;
  rareza: string;
  certificadora: string;
  nota: string;
  numeroCertificado: string;
  cantidad: number;
  precio: number;                 // el servidor recalcula con el precio del catálogo
  stock: number;                  // foto del stock en el momento del carrito
  unica: boolean;
}
```

## TotalesFactura

Los calcula el servidor; el cliente manda `promo` (código) como entrada.

```ts
interface TotalesFactura {
  sub: number;                    // Σ precio·cantidad
  disc: number;                   // sub · pct
  base: number;                   // sub − disc
  iva: number;                    // base · 0.13
  ship: number;                   // 9 | 0 (gratis si base ≥ 250; 0 si sub = 0)
  total: number;                  // base + ship + iva
  qty: number;                    // Σ cantidad
  promo: string;                  // código aplicado o ''
  promoLabel: string;             // 'BOVEDA10 (−10%)' o ''
}
```

Promociones vigentes: `BOVEDA10` 0.10 · `ESTUDIANTE5` 0.05 · `PIEZA1` 0.15.

## CompradorFactura

```ts
interface CompradorFactura {
  nombre: string;
  rfc: string;                    // DUI 12345678-9 o NIT 1234567-8
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;           // uno de los 14 departamentos de El Salvador
  cp: string;                     // 4 dígitos
  condicion: 'C' | 'E' | 'P';     // C = Consumidor Final · E = Especial · P = Preferencial
  condicionLabel: string;         // etiqueta impresa en el documento
}
```

## FormaPago · AvisoPago

```ts
interface FormaPago {
  metodo: string;                 // 'Transferencia entre bancos' | 'Depósito en ventanilla' |
                                  // 'Depósito por Cajeros automáticos' | 'Efectivo contra entrega'
  tipo: 'Transferencia' | 'Efectivo';
}

interface AvisoPago {             // reporte del comprador; lo concilia una persona
  banco: string;
  referencia: string;             // autorización o referencia de la transferencia
  fecha: string;
  monto: number;
  depositante: string;
  hora: string;                   // el front manda 'HH:mm'; en `registro` se guarda ISO
}
```

## Factura

```ts
interface Factura {
  folio: string;                  // 'PV-2026-0042'
  referencia: string;             // dígitos del folio sin prefijo: '0042'
  fecha: string;                  // ISO
  vence: string;                  // ISO, fecha + 72 h
  estado: EstadoPago;
  pago: FormaPago;
  comprador: CompradorFactura;
  lineas: LineaFactura[];
  totales: TotalesFactura;
  avisos: AvisoPago[];            // en orden cronológico; puede quedar vacío
  pagado?: string;                // ISO, solo cuando estado = 'pagado'
  registro?: AvisoPago;           // copia del último aviso con hora = ISO de conciliación
  anulada?: string;               // ISO, solo cuando estado = 'anulada'
}
```

## Cuerpos por endpoint (rápido)

| Endpoint | Petición | Respuesta |
| --- | --- | --- |
| `POST /auth/login` | `{ email, password }` | `Sesion` |
| `POST /auth/registro` | `{ nombre, email, telefono, direccion, rol, password }` | `Sesion` |
| `GET /productos` | — (sin query) | `Producto[]` |
| `POST /productos` | `ProductoBorrador` | `Producto` |
| `PUT /productos/:id` | `Partial<Producto>` | `Producto` |
| `DELETE /productos/:id` | — | `204` sin cuerpo |
| `POST /archivos` | `multipart/form-data`, campo `archivo` | `{ url: string }` |
| `GET /usuarios` | — | `Usuario[]` |
| `POST /usuarios` | `{ nombre, email, telefono, direccion, rol, password }` | `Usuario` |
| `PUT /usuarios/:id` | `Partial<Usuario>` | `Usuario` |
| `DELETE /usuarios/:id` | — | `204` sin cuerpo |
| `GET /facturas` | — | `Factura[]` |
| `POST /facturas` | `{ lineas, comprador, pago, promo }` | `Factura` |
| `POST /facturas/:folio/avisos` | `AvisoPago` | `Factura` |
| `POST /facturas/:folio/estado` | `{ estado: EstadoPago }` | `Factura` |

## Tipos auxiliares del frontend (no viajan por la red)

`LineaCarrito` (estado local del carrito en `localStorage`) y `PedidoNuevo` son internos del cliente:
`lineaDesdeCarrito()` los convierte en `LineaFactura` antes de llamar `POST /facturas`. No hace falta
modelarlos en el servidor.

## Máquina de estados del pago

```
pendiente     → verificacion | anulada
verificacion  → pagado       | pendiente
pagado        → (final)
anulada       → (final)
```

Cualquier otra transición se rechaza con `422` y `{ "mensaje": "No se puede pasar de <de> a <a>." }`.
