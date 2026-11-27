import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { Rol } from '@prisma/client';
import { ROL_ADMINISTRADOR } from '@rae/shared';

/**
 * ABAC: reglas que dependen de atributos de quien actúa, de la cuenta o rol sobre el que actúa
 * y del contexto. Son funciones puras: deciden y explican el motivo; no tocan la base de datos.
 */
export type Decision =
  { permitido: true } | { permitido: false; motivo: string; conflicto?: boolean };

const SI: Decision = { permitido: true };
const NO = (motivo: string, conflicto = false): Decision => ({
  permitido: false,
  motivo,
  conflicto,
});

export interface Actor {
  id: number;
  rolId: number | null;
  rolClave: string;
  permisos: Set<string>;
}

export interface CuentaObjetivo {
  id: number;
  rol: Rol;
  permisos: Set<string>;
  /** Cursos, inscripciones, encuestas o informes asociados. */
  datos: number;
}

export interface RolObjetivo {
  id: number;
  clave: string;
  base: Rol;
  sistema: boolean;
  activo: boolean;
  permisos: Set<string>;
  usuarios: number;
}

export type AccionCuenta = 'editar' | 'estado' | 'clave' | 'eliminar' | 'rol';

const contiene = (mayor: Set<string>, menor: Set<string>) => [...menor].every((p) => mayor.has(p));

const VERBO: Record<AccionCuenta, string> = {
  editar: 'editar',
  estado: 'inactivar',
  clave: 'reiniciar la contraseña de',
  eliminar: 'eliminar',
  rol: 'cambiar el rol de',
};

/** Sobre qué cuentas puede actuar alguien. */
export function puedeGestionarCuenta(a: Actor, o: CuentaObjetivo, accion: AccionCuenta): Decision {
  if (a.id === o.id && accion !== 'editar' && accion !== 'clave') {
    return NO(`No puedes ${VERBO[accion]} tu propia cuenta.`);
  }
  if (o.rol === 'ADMIN' && a.id !== o.id && !a.permisos.has('usuarios.administrativos')) {
    return NO('No tienes permiso para gestionar cuentas administrativas.');
  }
  if (a.id !== o.id && !contiene(a.permisos, o.permisos)) {
    return NO(`No puedes ${VERBO[accion]} una cuenta con más permisos que los tuyos.`);
  }
  return SI;
}

/** Qué roles puede asignar: nunca uno con permisos que el actor no tiene (sin escalar privilegios). */
export function puedeAsignarRol(a: Actor, r: RolObjetivo): Decision {
  if (!r.activo) return NO('El rol está inactivo.');
  if (r.base === 'ADMIN' && !a.permisos.has('usuarios.administrativos')) {
    return NO('No tienes permiso para asignar roles administrativos.');
  }
  const efectivos = r.clave === ROL_ADMINISTRADOR ? null : r.permisos;
  if (efectivos === null ? a.rolClave !== ROL_ADMINISTRADOR : !contiene(a.permisos, efectivos)) {
    return NO('No puedes asignar un rol con permisos que tú no tienes.');
  }
  return SI;
}

/** Cambiar de tipo (administrativo, docente, estudiante) rompería sus cursos, encuestas o informes. */
export function puedeCambiarTipo(o: CuentaObjetivo, base: Rol): Decision {
  if (o.rol !== base && o.datos > 0) {
    return NO(
      'La cuenta tiene cursos, encuestas o informes asociados a su tipo actual; crea una cuenta nueva para el otro tipo.',
      true,
    );
  }
  return SI;
}

export function puedeEliminar(o: CuentaObjetivo): Decision {
  if (o.datos > 0) {
    return NO('La cuenta tiene información asociada; inactívala en lugar de eliminarla.', true);
  }
  return SI;
}

/** Siempre debe quedar al menos una cuenta activa que pueda gestionar roles. */
export function conservaGestorDeRoles(o: CuentaObjetivo, otrosGestoresActivos: number): Decision {
  if (o.permisos.has('roles.gestionar') && otrosGestoresActivos === 0) {
    return NO('Es la última cuenta activa que puede gestionar roles; no se puede quitar.', true);
  }
  return SI;
}

/** Edición de un rol: los de sistema son fijos y nadie puede ampliar su propio rol. */
export function puedeEditarRol(a: Actor, r: RolObjetivo, permisos?: Set<string>): Decision {
  if (r.clave === ROL_ADMINISTRADOR || (r.sistema && permisos && permisos.size > 0)) {
    return NO('Los roles del sistema no se modifican.');
  }
  if (a.rolId !== null && a.rolId === r.id) return NO('No puedes modificar tu propio rol.');
  if (permisos && !contiene(a.permisos, permisos)) {
    return NO('No puedes otorgar permisos que tú no tienes.');
  }
  if (r.base === 'ADMIN' && !a.permisos.has('usuarios.administrativos')) {
    return NO('No tienes permiso para gestionar roles administrativos.');
  }
  return SI;
}

export function puedeEliminarRol(a: Actor, r: RolObjetivo): Decision {
  if (r.sistema) return NO('Los roles del sistema no se eliminan.');
  if (r.usuarios > 0) return NO('El rol tiene usuarios asignados; cámbialos de rol primero.', true);
  return puedeEditarRol(a, r);
}

/** Convierte una decisión negativa en el error HTTP adecuado. */
export function exigir(d: Decision): void {
  if (d.permitido) return;
  throw d.conflicto ? new ConflictException(d.motivo) : new ForbiddenException(d.motivo);
}
