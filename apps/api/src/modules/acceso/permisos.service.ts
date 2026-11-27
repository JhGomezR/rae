import { Injectable } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { ROL_ADMINISTRADOR, TODOS_LOS_PERMISOS } from '@rae/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface Acceso {
  usuarioId: number;
  activo: boolean;
  base: Rol;
  rol: { id: number | null; clave: string; nombre: string };
  permisos: Set<string>;
}

/** Vida corta: en Vercel hay varias instancias y los cambios deben notarse pronto. */
const VIGENCIA_MS = 30_000;
const NOMBRES_BASE: Record<Rol, string> = {
  ADMIN: 'Administrador',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
};

/**
 * RBAC: resuelve el rol efectivo y sus permisos. Sin rol asignado, un usuario toma el rol fijo
 * de su tipo; el rol ADMINISTRADOR tiene siempre todos los permisos.
 */
@Injectable()
export class PermisosService {
  private readonly cache = new Map<number, { acceso: Acceso; hasta: number }>();

  constructor(private readonly prisma: PrismaService) {}

  limpiar(usuarioId?: number): void {
    if (usuarioId === undefined) this.cache.clear();
    else this.cache.delete(usuarioId);
  }

  async de(usuarioId: number): Promise<Acceso> {
    const guardado = this.cache.get(usuarioId);
    if (guardado && guardado.hasta > Date.now()) return guardado.acceso;
    const u = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { activo: true, rol: true, rolSistema: true },
    });
    const acceso = u ? this.resolver(usuarioId, u) : this.vacio(usuarioId);
    this.cache.set(usuarioId, { acceso, hasta: Date.now() + VIGENCIA_MS });
    return acceso;
  }

  resolver(
    usuarioId: number,
    u: {
      activo: boolean;
      rol: Rol;
      rolSistema: {
        id: number;
        clave: string;
        nombre: string;
        base: Rol;
        permisos: string[];
        activo: boolean;
      } | null;
    },
  ): Acceso {
    const r = u.rolSistema && u.rolSistema.base === u.rol ? u.rolSistema : null;
    const clave = r?.clave ?? (u.rol === 'ADMIN' ? ROL_ADMINISTRADOR : u.rol);
    const total = u.rol === 'ADMIN' && clave === ROL_ADMINISTRADOR;
    // Un rol inactivo no concede permisos administrativos.
    const permisos = total
      ? TODOS_LOS_PERMISOS
      : r && r.activo && u.rol === 'ADMIN'
        ? r.permisos
        : [];
    return {
      usuarioId,
      activo: u.activo,
      base: u.rol,
      rol: { id: r?.id ?? null, clave, nombre: r?.nombre ?? NOMBRES_BASE[u.rol] },
      permisos: new Set(permisos),
    };
  }

  private vacio(usuarioId: number): Acceso {
    return {
      usuarioId,
      activo: false,
      base: 'ESTUDIANTE',
      rol: { id: null, clave: 'ESTUDIANTE', nombre: 'Estudiante' },
      permisos: new Set(),
    };
  }
}
