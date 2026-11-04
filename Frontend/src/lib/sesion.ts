import type { Rol, Sesion, Usuario } from './types.ts';

const CLAVE = 'pokevault_sesion';

/** Deriva un nombre legible del correo para poder tratar al cliente por su nombre. */
export function nombreDesde(email: string): string {
  const base = String(email).split('@')[0].replace(/[._-]+/g, ' ').trim();
  return base.replace(/\s+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

export function hayVentana(): boolean {
  return typeof window !== 'undefined';
}

export function leerSesion(): Sesion | null {
  if (!hayVentana()) return null;
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return s && s.usuario ? (s as Sesion) : null;
  } catch {
    return null;
  }
}

type Oido = () => void;
const oidores = new Set<Oido>();

/** undefined = sin leer; el snapshot de useSyncExternalStore debe ser estable entre lecturas. */
let cache: Sesion | null | undefined;

function avisa(): void {
  cache = undefined;
  oidores.forEach(o => o());
}

export function sesionAlmacenada(): Sesion | null {
  if (cache === undefined) cache = leerSesion();
  return cache;
}

export function suscribirSesion(odore: Oido): () => void {
  if (!hayVentana()) return () => {};
  const enOtraPestana = (e: StorageEvent) => {
    if (e.key === CLAVE) {
      cache = undefined;
      odore();
    }
  };
  oidores.add(odore);
  window.addEventListener('storage', enOtraPestana);
  return () => {
    oidores.delete(odore);
    window.removeEventListener('storage', enOtraPestana);
  };
}

const K_VISITA = 'pokevault_visita';

/**
 * La tienda se abre una sola vez por pestaña sin sesión: el login es la puerta de
 * entrada, pero quien ya entró como invitado no vuelve a rebotar en cada enlace.
 * Se lee como snapshot de useSyncExternalStore, igual que la sesión.
 */
export function yaEntramosTienda(): boolean {
  return hayVentana() && !!sessionStorage.getItem(K_VISITA);
}

export function marcarEntradaTienda(): void {
  if (!hayVentana()) return;
  sessionStorage.setItem(K_VISITA, '1');
  avisa();
}

export function guardarSesion(s: Sesion): void {
  localStorage.setItem(CLAVE, JSON.stringify(s));
  avisa();
}

export function limpiarSesion(): void {
  localStorage.removeItem(CLAVE);
  sessionStorage.setItem('pokevault_sale', '1');
  sessionStorage.removeItem(K_VISITA);
  avisa();
}

export function seSalioDeSesion(): boolean {
  if (!hayVentana()) return false;
  const v = sessionStorage.getItem('pokevault_sale');
  if (v) sessionStorage.removeItem('pokevault_sale');
  return !!v;
}

export function rolActual(): Rol | null {
  return leerSesion()?.usuario.rol ?? null;
}

export function esAdmin(u: Sesion | Usuario | null): boolean {
  const usuario: Usuario = u && 'usuario' in u ? u.usuario : (u as Usuario);
  return usuario?.rol === 'administrador';
}

/** Un comprador puede vender: la rúbrica pide que los clientes también publiquen sus cartas. */
export function puedeVender(rol: Rol | null): boolean {
  return rol === 'vendedor' || rol === 'administrador' || rol === 'comprador';
}
