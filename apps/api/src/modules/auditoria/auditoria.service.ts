import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export const EVENTOS_SESION = [
  'LOGIN',
  'LOGIN_FALLIDO',
  'LOGOUT',
  'CIERRE_INACTIVIDAD',
  'PRIMER_INGRESO',
  'CAMBIO_CLAVE',
] as const;
export type EventoSesion = (typeof EVENTOS_SESION)[number];

export interface ContextoPeticion {
  ip?: string | null;
  agente?: string | null;
}

export const filtroAuditoria = z.object({
  q: z.string().trim().max(80).optional(),
  tipo: z.enum(['todos', 'sesiones', 'fallidos', 'cambios']).default('todos'),
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(30),
});

/** Resume el navegador y el sistema para la bitácora, sin guardar la cadena completa. */
export function resumirAgente(ua?: string | null): string | null {
  if (!ua) return null;
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Otro navegador';
  const sistema = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'otro sistema';
  return `${navegador} en ${sistema}`;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Un fallo al auditar nunca debe impedir el inicio de sesión. */
  async sesion(
    evento: EventoSesion,
    ctx: ContextoPeticion,
    d: { usuarioId?: number | null; documento?: string; detalle?: string } = {},
  ) {
    try {
      const partes = [d.detalle, resumirAgente(ctx.agente)].filter(Boolean).join(' · ');
      await this.prisma.auditoria.create({
        data: {
          usuarioId: d.usuarioId ?? null,
          accion: evento,
          entidad: 'sesion',
          entidadId: d.documento?.slice(0, 40) ?? null,
          ip: ctx.ip?.slice(0, 60) ?? null,
          detalle: partes ? partes.slice(0, 300) : null,
        },
      });
    } catch (e) {
      this.logger.error(`No se pudo auditar ${evento}: ${String(e)}`);
    }
  }

  async consultar(f: z.output<typeof filtroAuditoria>) {
    const and: Prisma.AuditoriaWhereInput[] = [];
    if (f.tipo === 'sesiones') and.push({ entidad: 'sesion' });
    if (f.tipo === 'fallidos') and.push({ accion: 'LOGIN_FALLIDO' });
    if (f.tipo === 'cambios') and.push({ NOT: { entidad: 'sesion' } });
    if (f.desde) and.push({ creadaEn: { gte: new Date(`${f.desde}T00:00:00-05:00`) } });
    if (f.hasta) and.push({ creadaEn: { lte: new Date(`${f.hasta}T23:59:59.999-05:00`) } });
    if (f.q) {
      const personas = await this.prisma.usuario.findMany({
        where: {
          OR: [
            { documento: { contains: f.q } },
            { nombreCompleto: { contains: f.q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 500,
      });
      const texto = { contains: f.q, mode: 'insensitive' as const };
      and.push({
        OR: [
          { accion: texto },
          { entidad: texto },
          { entidadId: texto },
          { ip: texto },
          { detalle: texto },
          ...(personas.length ? [{ usuarioId: { in: personas.map((p) => p.id) } }] : []),
        ],
      });
    }
    const where: Prisma.AuditoriaWhereInput = and.length ? { AND: and } : {};
    const [filas, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (f.pagina - 1) * f.tamano,
        take: f.tamano,
      }),
      this.prisma.auditoria.count({ where }),
    ]);
    const ids = [...new Set(filas.map((x) => x.usuarioId).filter((x): x is number => x !== null))];
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombreCompleto: true, documento: true, rol: true },
    });
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    return {
      datos: filas.map((x) => ({
        ...x,
        id: x.id.toString(),
        usuario: x.usuarioId ? (porId.get(x.usuarioId) ?? null) : null,
      })),
      total,
      pagina: f.pagina,
      tamano: f.tamano,
    };
  }
}
