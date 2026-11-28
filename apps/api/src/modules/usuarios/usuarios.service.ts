import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Rol } from '@prisma/client';
import {
  claveInicial,
  documentoSchema,
  normalizarClave,
  parsearNombre,
  ROL_ADMINISTRADOR,
  PERMISO_GESTOR_ROLES,
} from '@rae/shared';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PermisosService } from '../acceso/permisos.service';
import {
  Actor,
  conservaGestorDeRoles,
  CuentaObjetivo,
  Decision,
  exigir,
  puedeAsignarRol,
  puedeCambiarTipo,
  puedeEliminar,
  puedeGestionarCuenta,
} from '../acceso/politicas';
import { aRolObjetivo } from '../acceso/roles.service';

const vinculacion = z.enum(['PLANTA', 'OCASIONAL', 'PROVISIONAL', 'CATEDRA']).nullable();
const nombre = z.string().trim().min(3, 'Escribe el nombre completo.').max(150);
const email = z.string().trim().toLowerCase().email('Correo no válido.').max(150);

export const esquemas = {
  filtro: z.object({
    q: z.string().trim().max(80).optional(),
    rol: z.enum(['ADMIN', 'DOCENTE', 'ESTUDIANTE']).optional(),
    rolSistemaId: z.coerce.number().int().positive().optional(),
    estado: z.enum(['activos', 'inactivos', 'todos']).default('todos'),
    vinculacion: z.enum(['PLANTA', 'OCASIONAL', 'PROVISIONAL', 'CATEDRA', 'SIN']).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    tamano: z.coerce.number().int().min(1).max(100).default(20),
  }),
  crear: z.object({
    documento: documentoSchema,
    nombreCompleto: nombre,
    email: email.nullable().optional(),
    rolSistemaId: z.number().int().positive(),
    vinculacion: vinculacion.optional(),
  }),
  editar: z.object({
    documento: documentoSchema.optional(),
    nombreCompleto: nombre.optional(),
    email: email.nullable().optional(),
    rolSistemaId: z.number().int().positive().optional(),
    vinculacion: vinculacion.optional(),
    activo: z.boolean().optional(),
  }),
  estado: z.object({
    ids: z.array(z.number().int().positive()).min(1, 'Selecciona al menos un usuario.').max(500),
    activo: z.boolean(),
  }),
};
type D<K extends keyof typeof esquemas> = z.output<(typeof esquemas)[K]>;

const publico = {
  id: true,
  documento: true,
  nombreCompleto: true,
  rol: true,
  email: true,
  activo: true,
  debeCambiarClave: true,
  ultimoIngreso: true,
  vinculacion: true,
  rolSistema: { select: { id: true, nombre: true, clave: true } },
} satisfies Prisma.UsuarioSelect;

const conDatos = {
  rolSistema: true,
  _count: {
    select: {
      cursosDocente: true,
      inscripciones: true,
      encuestas: true,
      informesDocente: true,
      informesRevisados: true,
    },
  },
} satisfies Prisma.UsuarioInclude;

/** Cuentas que pueden gestionar roles (para no dejar el sistema sin ninguna). */
const GESTORES: Prisma.UsuarioWhereInput = {
  activo: true,
  rol: 'ADMIN',
  OR: [
    { rolSistemaId: null },
    { rolSistema: { clave: ROL_ADMINISTRADOR } },
    { rolSistema: { activo: true, permisos: { has: PERMISO_GESTOR_ROLES } } },
  ],
};

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: PermisosService,
  ) {}

  async actor(id: number): Promise<Actor> {
    const a = await this.acceso.de(id);
    return { id, rolId: a.rol.id, rolClave: a.rol.clave, permisos: a.permisos };
  }

  async listar(f: D<'filtro'>) {
    const where: Prisma.UsuarioWhereInput = {
      ...(f.rol ? { rol: f.rol } : {}),
      ...(f.rolSistemaId ? { rolSistemaId: f.rolSistemaId } : {}),
      ...(f.estado === 'activos'
        ? { activo: true }
        : f.estado === 'inactivos'
          ? { activo: false }
          : {}),
      ...(f.vinculacion === 'SIN'
        ? { rol: 'DOCENTE', vinculacion: null }
        : f.vinculacion
          ? { vinculacion: f.vinculacion }
          : {}),
      ...(f.q
        ? {
            OR: [
              { documento: { contains: f.q, mode: 'insensitive' } },
              { nombreCompleto: { contains: f.q, mode: 'insensitive' } },
              { email: { contains: f.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [datos, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: publico,
        orderBy: { nombreCompleto: 'asc' },
        skip: (f.pagina - 1) * f.tamano,
        take: f.tamano,
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { datos, total, pagina: f.pagina, tamano: f.tamano };
  }

  /** Roles activos y si quien consulta puede asignarlos (para los formularios). */
  async opciones(actorId: number) {
    const actor = await this.actor(actorId);
    const roles = await this.prisma.rolSistema.findMany({
      where: { activo: true },
      orderBy: [{ sistema: 'desc' }, { nombre: 'asc' }],
      include: { _count: { select: { usuarios: true } } },
    });
    return roles.map((r) => {
      const d = puedeAsignarRol(actor, aRolObjetivo(r, r._count.usuarios));
      return {
        id: r.id,
        nombre: r.nombre,
        clave: r.clave,
        base: r.base,
        asignable: d.permitido,
        motivo: d.permitido ? null : d.motivo,
      };
    });
  }

  async crear(actorId: number, d: D<'crear'>) {
    const actor = await this.actor(actorId);
    const rol = await this.rol(d.rolSistemaId);
    exigir(puedeAsignarRol(actor, aRolObjetivo(rol, 0)));
    await this.documentoLibre(d.documento);
    const n = parsearNombre(d.nombreCompleto);
    try {
      const u = await this.prisma.usuario.create({
        data: {
          documento: d.documento,
          nombreCompleto: d.nombreCompleto.toUpperCase(),
          email: d.email ?? null,
          rol: rol.base,
          rolSistemaId: rol.id,
          vinculacion: rol.base === 'DOCENTE' ? (d.vinculacion ?? null) : null,
          primerApellido: n.primerApellido.slice(0, 60),
          primerNombre: n.primerNombre.slice(0, 60),
          passwordHash: await argon2.hash(this.claveBase(d.documento, d.nombreCompleto, rol.base)),
        },
        select: publico,
      });
      return u;
    } catch (e) {
      throw this.duplicado(e);
    }
  }

  async editar(actorId: number, id: number, d: D<'editar'>) {
    const actor = await this.actor(actorId);
    const campos = Object.keys(d).filter((k) => d[k as keyof typeof d] !== undefined);
    if (campos.some((k) => k !== 'activo') && !actor.permisos.has('usuarios.editar')) {
      throw new ForbiddenException('Tu rol no tiene permiso para editar usuarios.');
    }
    if (d.activo !== undefined && !actor.permisos.has('usuarios.estado')) {
      throw new ForbiddenException('Tu rol no tiene permiso para activar o inactivar usuarios.');
    }
    const o = await this.objetivo(id);
    exigir(puedeGestionarCuenta(actor, o.cuenta, 'editar'));
    let base: Rol = o.cuenta.rol;
    let quitaGestion = false;
    if (d.rolSistemaId !== undefined && d.rolSistemaId !== o.u.rolSistemaId) {
      const rol = await this.rol(d.rolSistemaId);
      exigir(puedeGestionarCuenta(actor, o.cuenta, 'rol'));
      exigir(puedeAsignarRol(actor, aRolObjetivo(rol, 0)));
      exigir(puedeCambiarTipo(o.cuenta, rol.base));
      base = rol.base;
      const nuevos = this.acceso.resolver(id, { activo: true, rol: rol.base, rolSistema: rol });
      quitaGestion =
        o.cuenta.permisos.has(PERMISO_GESTOR_ROLES) && !nuevos.permisos.has(PERMISO_GESTOR_ROLES);
    }
    if (d.activo === false && o.u.activo) {
      exigir(puedeGestionarCuenta(actor, o.cuenta, 'estado'));
      quitaGestion = quitaGestion || o.cuenta.permisos.has(PERMISO_GESTOR_ROLES);
    }
    if (quitaGestion) exigir(conservaGestorDeRoles(o.cuenta, await this.otrosGestores([id])));
    if (d.documento && d.documento !== o.u.documento) await this.documentoLibre(d.documento);
    if (d.vinculacion && base !== 'DOCENTE') {
      throw new ConflictException('Solo los docentes tienen tipo de vinculación.');
    }
    const n = d.nombreCompleto ? parsearNombre(d.nombreCompleto) : null;
    try {
      const u = await this.prisma.$transaction(async (tx) => {
        const actualizado = await tx.usuario.update({
          where: { id },
          data: {
            ...(d.documento ? { documento: d.documento } : {}),
            ...(d.nombreCompleto && n
              ? {
                  nombreCompleto: d.nombreCompleto.toUpperCase(),
                  primerApellido: n.primerApellido.slice(0, 60),
                  primerNombre: n.primerNombre.slice(0, 60),
                }
              : {}),
            ...(d.email !== undefined ? { email: d.email } : {}),
            ...(d.rolSistemaId !== undefined ? { rolSistemaId: d.rolSistemaId, rol: base } : {}),
            ...(base !== 'DOCENTE'
              ? { vinculacion: null }
              : d.vinculacion !== undefined
                ? { vinculacion: d.vinculacion }
                : {}),
            ...(d.activo !== undefined ? { activo: d.activo } : {}),
          },
          select: publico,
        });
        // Al inactivar o cambiar de tipo, las sesiones abiertas dejan de servir.
        if (d.activo === false || base !== o.cuenta.rol) await this.revocar(tx, [id]);
        return actualizado;
      });
      this.acceso.limpiar(id);
      return u;
    } catch (e) {
      throw this.duplicado(e);
    }
  }

  /** Activa o inactiva varios usuarios; omite (con motivo) los que las políticas no permiten. */
  async estadoMasivo(actorId: number, d: D<'estado'>) {
    const actor = await this.actor(actorId);
    const ids = [...new Set(d.ids)];
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      include: conDatos,
    });
    const omitidos: { id: number; nombre: string; motivo: string }[] = [];
    const aplicar: number[] = [];
    const quitanGestion: CuentaObjetivo[] = [];
    for (const u of usuarios) {
      if (u.activo === d.activo) continue;
      const cuenta = this.cuenta(u);
      const decision: Decision = d.activo
        ? puedeGestionarCuenta(actor, cuenta, 'editar')
        : puedeGestionarCuenta(actor, cuenta, 'estado');
      if (!decision.permitido) {
        omitidos.push({ id: u.id, nombre: u.nombreCompleto, motivo: decision.motivo });
        continue;
      }
      if (!d.activo && cuenta.permisos.has(PERMISO_GESTOR_ROLES)) quitanGestion.push(cuenta);
      aplicar.push(u.id);
    }
    if (quitanGestion.length) {
      const otros = await this.otrosGestores(aplicar);
      if (otros === 0) {
        // Se conserva el primero para no dejar el sistema sin quien gestione roles.
        const conservado = quitanGestion[0] as CuentaObjetivo;
        aplicar.splice(aplicar.indexOf(conservado.id), 1);
        const u = usuarios.find((x) => x.id === conservado.id);
        omitidos.push({
          id: conservado.id,
          nombre: u?.nombreCompleto ?? '',
          motivo: 'Es la última cuenta activa que puede gestionar roles.',
        });
      }
    }
    if (ids.length > usuarios.length) {
      for (const id of ids.filter((x) => !usuarios.some((u) => u.id === x))) {
        omitidos.push({ id, nombre: '', motivo: 'El usuario no existe.' });
      }
    }
    if (aplicar.length) {
      await this.prisma.$transaction(async (tx) => {
        await tx.usuario.updateMany({ where: { id: { in: aplicar } }, data: { activo: d.activo } });
        if (!d.activo) await this.revocar(tx, aplicar);
      });
      aplicar.forEach((id) => this.acceso.limpiar(id));
    }
    return { actualizados: aplicar.length, omitidos };
  }

  async reiniciarClave(actorId: number, id: number): Promise<void> {
    const actor = await this.actor(actorId);
    const o = await this.objetivo(id);
    exigir(puedeGestionarCuenta(actor, o.cuenta, 'clave'));
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id },
        data: {
          passwordHash: await argon2.hash(
            this.claveBase(o.u.documento, o.u.nombreCompleto, o.u.rol),
          ),
          debeCambiarClave: true,
        },
      });
      await this.revocar(tx, [id]);
    });
  }

  async eliminar(actorId: number, id: number) {
    const actor = await this.actor(actorId);
    const o = await this.objetivo(id);
    exigir(puedeGestionarCuenta(actor, o.cuenta, 'eliminar'));
    exigir(puedeEliminar(o.cuenta));
    if (o.cuenta.permisos.has(PERMISO_GESTOR_ROLES) && o.u.activo) {
      exigir(conservaGestorDeRoles(o.cuenta, await this.otrosGestores([id])));
    }
    await this.prisma.usuario.delete({ where: { id } });
    this.acceso.limpiar(id);
    return { ok: true };
  }

  // ——— apoyo ———

  private cuenta(u: Prisma.UsuarioGetPayload<{ include: typeof conDatos }>): CuentaObjetivo {
    const c = u._count;
    return {
      id: u.id,
      rol: u.rol,
      permisos: this.acceso.resolver(u.id, u).permisos,
      datos:
        c.cursosDocente + c.inscripciones + c.encuestas + c.informesDocente + c.informesRevisados,
    };
  }

  private async objetivo(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id }, include: conDatos });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    return { u, cuenta: this.cuenta(u) };
  }

  private async rol(id: number) {
    const r = await this.prisma.rolSistema.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('El rol no existe.');
    return r;
  }

  private otrosGestores(excluir: number[]) {
    return this.prisma.usuario.count({ where: { ...GESTORES, id: { notIn: excluir } } });
  }

  private async documentoLibre(documento: string) {
    if (await this.prisma.usuario.findUnique({ where: { documento } })) {
      throw new ConflictException('Ya existe un usuario con ese documento.');
    }
  }

  private duplicado(e: unknown): unknown {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('Ya existe un usuario con ese documento o correo.');
    }
    return e;
  }

  private revocar(tx: Prisma.TransactionClient, ids: number[]) {
    return tx.refreshToken.updateMany({
      where: { usuarioId: { in: ids }, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  private claveBase(documento: string, nombreCompleto: string, rol: Rol): string {
    return rol === 'ADMIN'
      ? normalizarClave(documento + parsearNombre(nombreCompleto).primerApellido)
      : claveInicial(documento, nombreCompleto, rol);
  }
}
