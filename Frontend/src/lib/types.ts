/**
 * Contrato de datos de PokéVault.
 * El frontend y el backend comparten estas formas: si el equipo del servidor
 * cambia un campo, cambia aquí y en backend/README.md en la misma entrega.
 */

export type Rol = 'comprador' | 'vendedor' | 'administrador';

export type EstadoUsuario = 'activo' | 'suspendido';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  rol: Rol;
  estado: EstadoUsuario;
  creado: string;
}

/** Sesión que emite el backend al iniciar sesión. `token` se envía como Bearer. */
export interface Sesion {
  token: string;
  usuario: Usuario;
  emitida: string;
}

export type Categoria = 'carta' | 'paquete';

/** 'tienda' = catálogo propio · 'comunidad' = publicado por un usuario. */
export type Origen = 'tienda' | 'comunidad';

/** Publicación comunitaria: pasa por revisión antes de verse en la vitrina. */
export type EstadoProducto = 'publicado' | 'en_revision' | 'rechazado';

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: Categoria;
  set: string;
  numero: string;
  rareza: string;
  /** Etiqueta corta que se muestra en la esquina de la carta, p. ej. «1/1 Charizard». */
  etiqueta: string;
  codigo: string;
  /** Certificadora que graduó la carta: CGC, PSA, BGS, SGS o «Sin graduar». */
  certificadora: string;
  /** Nota de graduación tal como la emite la certificadora, p. ej. «Pristine 10». */
  nota: string;
  numeroCertificado: string;
  /** Datos finos que muestra la ficha detallada de la carta. */
  anio?: string;
  idioma?: string;
  centrado?: string;
  conservacion?: string;
  /** Precio en USD, moneda de curso legal en El Salvador. */
  precio: number;
  stock: number;
  /** Ruta de imagen: /img/... para el catálogo de la tienda, data: o URL para la comunidad. */
  imagen: string;
  origen: Origen;
  vendedorId: string | null;
  vendedorNombre: string | null;
  estado: EstadoProducto;
  /** Pieza única (1/1): la vitrina la resalta y el stock no puede pasar de 1. */
  unica: boolean;
  creado: string;
}

/** Datos que el vendedor envía al crear o editar una publicación. */
export type ProductoBorrador = Omit<
  Producto,
  'id' | 'origen' | 'vendedorId' | 'vendedorNombre' | 'estado' | 'creado'
> & { id?: string };

export type EstadoPago = 'pendiente' | 'verificacion' | 'pagado' | 'anulada';

export interface LineaFactura {
  productoId: string;
  nombre: string;
  set: string;
  numero: string;
  rareza: string;
  certificadora: string;
  nota: string;
  numeroCertificado: string;
  cantidad: number;
  precio: number;
  stock: number;
  unica: boolean;
}

export interface TotalesFactura {
  sub: number;
  disc: number;
  base: number;
  iva: number;
  ship: number;
  total: number;
  qty: number;
  promo: string;
  promoLabel: string;
}

export interface CompradorFactura {
  nombre: string;
  /** DUI o NIT del comprador. */
  rfc: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  cp: string;
  /** C = Consumidor Final · E = Especial · P = Preferencial. */
  condicion: 'C' | 'E' | 'P';
  condicionLabel: string;
}

/** Aviso de transferencia que reporta el comprador; lo concilia el vendedor. */
export interface AvisoPago {
  banco: string;
  referencia: string;
  fecha: string;
  monto: number;
  depositante: string;
  hora: string;
}

export interface FormaPago {
  metodo: string;
  tipo: 'Transferencia' | 'Efectivo';
}

export interface Factura {
  folio: string;
  /** Referencia numérica para la transferencia bancaria. */
  referencia: string;
  fecha: string;
  vence: string;
  estado: EstadoPago;
  pago: FormaPago;
  comprador: CompradorFactura;
  lineas: LineaFactura[];
  totales: TotalesFactura;
  avisos: AvisoPago[];
  /** Registro de la conciliación hecha por PokéVault. */
  pagado?: string;
  registro?: AvisoPago;
  anulada?: string;
}

/** Item del carrito (Pokédex) antes de emitir la factura. */
export interface LineaCarrito {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
  imagen: string;
  certificadora: string;
  nota: string;
  numeroCertificado: string;
  rareza: string;
  etiqueta: string;
  set: string;
  numero: string;
  codigo: string;
  unica: boolean;
}

export interface PedidoNuevo {
  comprador: CompradorFactura;
  pago: FormaPago;
  promo?: string;
}
