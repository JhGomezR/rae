import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RolSistema } from '@prisma/client';
import { GRUPOS_PERMISOS, PERMISOS, ROL_ADMINISTRADOR, TODOS_LOS_PERMISOS } from '@rae/shared';
import { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PermisosService } from './permisos.service';
import { Actor, exigir, puedeEditarRol, puedeEliminarRol, RolObjetivo } from './politicas';

const permisos = z
  .array(z.string().refine((p) => p in PERMISOS, 'Permiso no válido.'))
  .max(TODOS_LOS_PERMISOS.length)
  .transform((p) => [...new Set(p)].sort());

export const esquemasRoles = {
  crear: z.object({
    nombre: z.string().trim().min(3, 'Escribe el nombre del rol.').max(80),
    descripcion: z.string().trim().max(300).nullable().optional(),
    permisos: permisos.refine((p) => p.length > 0, 'Elige al menos un permiso.'),
  }),
  editar: z.object({
    nombre: z.string().trim().min(3).max(80).optional(),
    descripcion: z.string().trim().max(300).nullable().optional(),
    permisos: permisos.optional(),
    activo: z.boolean().optional(),
  }),
};
type D<K extends keyof typeof esquemasRoles> = z.output<(typeof esquemasRoles)[K]>;

export function aRolObjetivo(r: RolSistema, usuarios: number): RolObjetivo {
  return {
    id: r.id,
    clave: r.clave,
    base: r.base,
    sistema: r.sistema,
    activo: r.activo,
    permisos: new Set(r.clave === ROL_ADMINISTRADOR ? TODOS_LOS_PERMISOS : r.permisos),
    usuarios,
  };
}

const clave = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);

/** Roles con permisos (RBAC). Los personalizados son administrativos: dan acceso parcial. */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: PermisosService,
  ) {}

  async actor(id: number): Promise<Actor> {
    const a = await this.acceso.de(id);
    return { id, rolId: a.rol.id, rolClave: a.rol.clave, permisos: a.permisos };
  }

  catalogo() {
    return GRUPOS_PERMISOS;
  }

  /** Cuántos usuarios tiene cada rol (los sin rol asignado cuentan en el rol fijo de su tipo). */
  async listar(actorId: number) {
    const actor = await this.actor(actorId);
    const [roles, sinRol] = await Promise.all([
      this.prisma.rolSistema.findMany({
        orderBy: [{ sistema: 'desc' }, { nombre: 'asc' }],
        include: { _count: { select: { usuarios: true } } },
      }),
      this.prisma.usuario.groupBy({
        by: ['rol'],
        where: { rolSistemaId: null },
        _count: { _all: true },
      }),
    ]);
    return roles.map((r) => {
      const implicitos = r.sistema ? (sinRol.find((g) => g.rol === r.base)?._count._all ?? 0) : 0;
      const o = aRolObjetivo(r, r._count.usuarios + implicitos);
      const edicion = puedeEditarRol(actor, o, new Set(r.permisos));
      return {
        id: r.id,
        clave: r.clave,
        nombre: r.nombre,
        descripcion: r.descripcion,
        base: r.base,
        sistema: r.sistema,
        activo: r.activo,
        permisos: [...o.permisos],
        usuarios: o.usuarios,
        editable: edicion.permitido && !(r.sistema && r.base !== 'ADMIN'),
        motivo: edicion.permitido ? null : edicion.motivo,
      };
    });
  }

  async crear(actorId: number, d: D<'crear'>) {
    const actor = await this.actor(actorId);
    const nuevo: RolObjetivo = {
      id: -1,
      clave: '',
      base: 'ADMIN',
      sistema: false,
      activo: true,
      permisos: new Set(d.permisos),
      usuarios: 0,
    };
    exigir(puedeEditarRol(actor, nuevo, nuevo.permisos));
    try {
      const r = await this.prisma.rolSistema.create({
        data: {
          clave: `${clave(d.nombre) || 'ROL'}_${Date.now().toString(36).toUpperCase()}`.slice(
            0,
            40,
          ),
          nombre: d.nombre,
          descripcion: d.descripcion ?? null,
          base: 'ADMIN',
          permisos: d.permisos,
        },
      });
      return { id: r.id };
    } catch (e) {
      throw this.duplicado(e);
    }
  }

  async editar(actorId: number, id: number, d: D<'editar'>) {
    const actor = await this.actor(actorId);
    const r = await this.uno(id);
    const o = aRolObjetivo(r, r._count.usuarios);
    if (
      r.sistema &&
      (d.nombre !== undefined || d.activo !== undefined || d.permisos !== undefined)
    ) {
      exigir({ permitido: false, motivo: 'Los roles del sistema no se modifican.' });
    }
    exigir(puedeEditarRol(actor, o, d.permisos ? new Set(d.permisos) : undefined));
    if (d.activo === false && r.activo && r._count.usuarios > 0) {
      throw new ConflictException(
        'El rol tiene usuarios asignados; cámbialos de rol antes de inactivarlo.',
      );
    }
    if (d.permisos && !d.permisos.length) throw new ConflictException('Elige al menos un permiso.');
    try {
      await this.prisma.rolSistema.update({ where: { id }, data: d });
    } catch (e) {
      throw this.duplicado(e);
    }
    this.acceso.limpiar();
    return { ok: true };
  }

  async eliminar(actorId: number, id: number) {
    const actor = await this.actor(actorId);
    const r = await this.uno(id);
    exigir(puedeEliminarRol(actor, aRolObjetivo(r, r._count.usuarios)));
    await this.prisma.rolSistema.delete({ where: { id } });
    this.acceso.limpiar();
    return { ok: true };
  }

  private async uno(id: number) {
    const r = await this.prisma.rolSistema.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true } } },
    });
    if (!r) throw new NotFoundException('El rol no existe.');
    return r;
  }

  private duplicado(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('Ya existe un rol con ese nombre.');
    }
    return e;
  }
}
