import { Rol } from './enums';

const PARTICULAS = new Set([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'LOS',
  'SAN',
  'SANTA',
  'DA',
  'DI',
  'VAN',
  'VON',
  'Y',
]);

export interface NombreParseado {
  primerApellido: string;
  primerNombre: string;
  grupos: string[];
}

/** Agrupa las partículas con la palabra siguiente: «DE LA CRUZ» es un solo grupo. */
function agrupar(nombreCompleto: string): string[] {
  const grupos: string[] = [];
  let pendiente: string[] = [];
  for (const palabra of nombreCompleto.trim().split(/\s+/).filter(Boolean)) {
    pendiente.push(palabra);
    if (!PARTICULAS.has(palabra.toUpperCase())) {
      grupos.push(pendiente.join(' '));
      pendiente = [];
    }
  }
  if (pendiente.length) grupos.push(pendiente.join(' '));
  return grupos;
}

/** El consolidado escribe primero los apellidos: APELLIDO APELLIDO NOMBRE NOMBRE. */
export function parsearNombre(nombreCompleto: string): NombreParseado {
  const grupos = agrupar(nombreCompleto);
  const primerApellido = grupos[0] ?? '';
  const primerNombre = grupos.length >= 3 ? (grupos[2] ?? '') : (grupos[1] ?? primerApellido);
  return { primerApellido, primerNombre, grupos };
}

/** Mayúsculas, sin tildes, Ñ→N y solo caracteres alfanuméricos. */
export function normalizarClave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Clave inicial: documento + primer apellido (estudiante) o primer nombre (docente). */
export function claveInicial(documento: string, nombreCompleto: string, rol: Rol): string {
  const { primerApellido, primerNombre } = parsearNombre(nombreCompleto);
  return normalizarClave(documento + (rol === Rol.DOCENTE ? primerNombre : primerApellido));
}

/**
 * Indica si no se puede asegurar la parte del nombre usada en la clave.
 * Con tres grupos el apellido es seguro, pero el tercero puede ser primer o segundo nombre.
 */
export function nombreAmbiguo(nombreCompleto: string, rol: Rol): boolean {
  const total = agrupar(nombreCompleto).length;
  return rol === Rol.DOCENTE ? total <= 3 : total <= 1;
}
