import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoInformeDocente } from '@prisma/client';
import {
  datosAgendaSchema,
  datosCatedraSchema,
  EDITABLE,
  EstadoInformeDocente,
  Vinculacion,
  VINCULACIONES_AGENDA,
  VINCULACIONES_CATEDRA,
} from '@rae/shared';
import { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { agendaDocx } from './agenda-docx';
import { catedraDocx } from './catedra-docx';
import { ContextoInforme } from './contexto';
import { agendaPdf, catedraPdf } from './pdf-docentes';

const tipo = z.nativeEnum(TipoInformeDocente);
export const esquemas = {
  tipo: z.object({ tipo }),
  crear: z.object({
    tipo,
    periodoId: z.number().int().positive(),
    cursoId: z.number().int().positive().optional(),
  }),
  guardar: z.object({ datos: z.unknown() }),
  filtro: z.object({
    tipo: tipo.optional(),
    estado: z.enum(['BORRADOR', 'ENTREGADO', 'AJUSTES', 'APROBADO']).optional(),
    periodoId: z.coerce.number().int().positive().optional(),
    q: z.string().trim().max(80).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    tamano: z.coerce.number().int().min(1).max(100).default(20),
  }),
  revisar: z
    .object({
      decision: z.enum(['APROBAR', 'AJUSTES']),
      observacion: z.string().trim().max(3000).default(''),
    })
    .refine((v) => v.decision === 'APROBAR' || v.observacion.length >= 5, {
      message: 'Escribe los ajustes o cambios que debe hacer el docente.',
      path: ['observacion'],
    }),
  firmantes: z.object({
    decano: z.string().trim().max(150),
    vicerrector: z.string().trim().max(150),
  }),
  descarga: z.object({ formato: z.enum(['docx', 'pdf']) }),
};
type D<K extends keyof typeof esquemas> = z.output<(typeof esquemas)[K]>;

const PERMITIDAS: Record<TipoInformeDocente, Vinculacion[]> = {
  AGENDA: VINCULACIONES_AGENDA,
  CATEDRA: VINCULACIONES_CATEDRA,
};
const NOMBRE: Record<TipoInformeDocente, string> = {
  AGENDA: 'la agenda docente',
  CATEDRA: 'el informe de hora cátedra',
};
const CLAVE_DECANO = 'informes.decano';
const CLAVE_VICERRECTOR = 'informes.vicerrector';

const incluir = {
  docente: { select: { id: true, nombreCompleto: true, documento: true, vinculacion: true } },
  periodo: { select: { id: true, codigo: true, numero: true } },
  revisor: { select: { nombreCompleto: true } },
  eventos: { orderBy: { creadoEn: 'desc' } },
} satisfies Prisma.InformeDocenteInclude;
type Completo = Prisma.InformeDocenteGetPayload<{ include: typeof incluir }>;

const resumen = {
  id: true,
  tipo: true,
  titulo: true,
  estado: true,
  entregadoEn: true,
  revisadoEn: true,
  actualizadoEn: true,
  observacion: true,
  periodo: { select: { codigo: true } },
} satisfies Prisma.InformeDocenteSelect;

export const leerDatos = (t: TipoInformeDocente, datos: unknown) =>
  t === 'AGENDA' ? datosAgendaSchema.parse(datos ?? {}) : datosCatedraSchema.parse(datos ?? {});

function tituloCatedra(d: z.output<typeof datosCatedraSchema>): string {
  const rango = d.desde && d.hasta ? `${d.desde} a ${d.hasta}` : 'sin periodo';
  return `${d.unidad || 'Unidad sin definir'} · ${rango}`.slice(0, 200);
}

@Injectable()
export class InformesDocentesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vinculación del docente y si puede presentar ese tipo de informe. */
  async acceso(docenteId: number, t: TipoInformeDocente) {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id: docenteId } });
    const vinculacion = u.vinculacion;
    return { vinculacion, permitido: !!vinculacion && PERMITIDAS[t].includes(vinculacion) };
  }

  private async exigirAcceso(docenteId: number, t: TipoInformeDocente) {
    const a = await this.acceso(docenteId, t);
    if (!a.permitido) {
      throw new ForbiddenException(
        `Tu vinculación no corresponde a ${NOMBRE[t]}. Si es un error, pide al administrador que la actualice.`,
      );
    }
  }

  async mios(docenteId: number, t: TipoInformeDocente) {
    const [acceso, informes, periodos, cursos] = await Promise.all([
      this.acceso(docenteId, t),
      this.prisma.informeDocente.findMany({
        where: { docenteId, tipo: t },
        select: resumen,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.periodo.findMany({ orderBy: [{ anio: 'desc' }, { numero: 'desc' }] }),
      this.prisma.curso.findMany({
        where: { docenteId, activo: true },
        select: {
          id: true,
          grupo: true,
          semestreOferta: true,
          periodoId: true,
          unidad: { select: { nombre: true } },
        },
        orderBy: { unidad: { nombre: 'asc' } },
      }),
    ]);
    return { ...acceso, informes, periodos, cursos };
  }

  async crear(docenteId: number, d: D<'crear'>) {
    await this.exigirAcceso(docenteId, d.tipo);
    const periodo = await this.prisma.periodo.findUnique({ where: { id: d.periodoId } });
    if (!periodo) throw new BadRequestException('El periodo no existe.');
    let datos: object;
    let titulo: string;
    if (d.tipo === 'AGENDA') {
      const previa = await this.prisma.informeDocente.findFirst({
        where: { docenteId, tipo: 'AGENDA', periodoId: d.periodoId },
      });
      if (previa)
        throw new ConflictException(`Ya tienes una agenda del periodo ${periodo.codigo}.`);
      const cursos = await this.prisma.curso.findMany({
        where: { docenteId, periodoId: d.periodoId, activo: true },
        include: { unidad: true },
      });
      const hoy = new Date();
      datos = datosAgendaSchema.parse({
        fechaDiligenciamiento: `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`,
        facultad: 'Facultad de Tecnologías de la Información y la Comunicación',
        programa: 'Ingeniería de Sistemas',
        actividades: cursos.length
          ? {
              'dir-encuentro': {
                descripcion: `Impartir las unidades de formación: ${cursos
                  .map((c) => `${c.unidad.nombre} (semestre ${c.semestreOferta}, grupo ${c.grupo})`)
                  .join('; ')}`.slice(0, 2000),
              },
            }
          : {},
      });
      titulo = `Agenda ${periodo.codigo}`;
    } else {
      const curso = d.cursoId
        ? await this.prisma.curso.findFirst({
            where: { id: d.cursoId, docenteId },
            include: { unidad: true, programa: true },
          })
        : null;
      if (d.cursoId && !curso) throw new BadRequestException('El curso no es tuyo.');
      const v = datosCatedraSchema.parse({
        programa: curso?.programa.nombre ?? 'INGENIERÍA DE SISTEMAS',
        unidad: curso?.unidad.nombre ?? '',
        semestre: curso ? String(curso.semestreOferta) : '',
        fecha: new Date().toISOString().slice(0, 10),
      });
      datos = v;
      titulo = tituloCatedra(v);
    }
    const informe = await this.prisma.informeDocente.create({
      data: {
        tipo: d.tipo,
        docenteId,
        periodoId: d.periodoId,
        titulo,
        datos,
        eventos: { create: { accion: 'CREADO', usuarioId: docenteId } },
      },
    });
    return { id: informe.id };
  }

  /** Detalle para el docente dueño o para el administrador. */
  async uno(id: number, usuario?: { id: number }) {
    const i = await this.prisma.informeDocente.findUnique({ where: { id }, include: incluir });
    if (!i || (usuario && i.docenteId !== usuario.id)) {
      throw new NotFoundException('El informe no existe.');
    }
    return { ...i, datos: leerDatos(i.tipo, i.datos) };
  }

  async guardar(id: number, docenteId: number, d: D<'guardar'>) {
    const i = await this.editable(id, docenteId);
    const parsed = (i.tipo === 'AGENDA' ? datosAgendaSchema : datosCatedraSchema).safeParse(
      d.datos,
    );
    if (!parsed.success)
      throw new BadRequestException('Revisa los datos del informe: hay valores no válidos.');
    await this.prisma.informeDocente.update({
      where: { id },
      data: {
        datos: parsed.data,
        ...(i.tipo === 'CATEDRA'
          ? { titulo: tituloCatedra(parsed.data as z.output<typeof datosCatedraSchema>) }
          : {}),
      },
    });
    return { ok: true };
  }

  async entregar(id: number, docenteId: number) {
    const i = await this.editable(id, docenteId);
    await this.prisma.informeDocente.update({
      where: { id },
      data: {
        estado: 'ENTREGADO',
        entregadoEn: new Date(),
        eventos: { create: { accion: 'ENTREGADO', usuarioId: docenteId } },
      },
    });
    return { ok: true, estado: 'ENTREGADO' as EstadoInformeDocente, tipo: i.tipo };
  }

  private async editable(id: number, docenteId: number) {
    const i = await this.prisma.informeDocente.findUnique({ where: { id } });
    if (!i || i.docenteId !== docenteId) throw new NotFoundException('El informe no existe.');
    await this.exigirAcceso(docenteId, i.tipo);
    if (!EDITABLE.includes(i.estado)) {
      throw new ConflictException(
        i.estado === 'APROBADO'
          ? 'El informe ya fue aprobado y no se puede modificar.'
          : 'El informe fue entregado y está bloqueado hasta que lo revisen.',
      );
    }
    return i;
  }

  // ——— Validación (administrador) ———

  async listar(f: D<'filtro'>) {
    const where: Prisma.InformeDocenteWhereInput = {
      ...(f.tipo ? { tipo: f.tipo } : {}),
      ...(f.estado ? { estado: f.estado } : { estado: { not: 'BORRADOR' } }),
      ...(f.periodoId ? { periodoId: f.periodoId } : {}),
      ...(f.q
        ? {
            OR: [
              { titulo: { contains: f.q, mode: 'insensitive' } },
              { docente: { nombreCompleto: { contains: f.q, mode: 'insensitive' } } },
              { docente: { documento: { contains: f.q } } },
            ],
          }
        : {}),
    };
    const [datos, total] = await Promise.all([
      this.prisma.informeDocente.findMany({
        where,
        select: {
          ...resumen,
          docente: { select: { nombreCompleto: true, documento: true, vinculacion: true } },
        },
        // Primero lo que espera revisión, luego lo más reciente.
        orderBy: [{ estado: 'asc' }, { entregadoEn: 'desc' }, { actualizadoEn: 'desc' }],
        skip: (f.pagina - 1) * f.tamano,
        take: f.tamano,
      }),
      this.prisma.informeDocente.count({ where }),
    ]);
    return { datos, total, pagina: f.pagina, tamano: f.tamano };
  }

  /** Conteos por estado y docentes que aún no presentan informe en el periodo. */
  async resumen(periodoId?: number) {
    const periodo = periodoId
      ? await this.prisma.periodo.findUnique({ where: { id: periodoId } })
      : await this.prisma.periodo.findFirst({ where: { activo: true } });
    const donde = periodo ? { periodoId: periodo.id } : {};
    const [grupos, docentes] = await Promise.all([
      this.prisma.informeDocente.groupBy({
        by: ['tipo', 'estado'],
        where: donde,
        _count: { _all: true },
      }),
      this.prisma.usuario.findMany({
        where: { rol: 'DOCENTE', activo: true, vinculacion: { not: null } },
        select: {
          id: true,
          nombreCompleto: true,
          documento: true,
          vinculacion: true,
          informesDocente: {
            where: { ...donde, estado: { not: 'BORRADOR' } },
            select: { id: true },
          },
        },
        orderBy: { nombreCompleto: 'asc' },
      }),
    ]);
    const sinVinculacion = await this.prisma.usuario.count({
      where: { rol: 'DOCENTE', activo: true, vinculacion: null },
    });
    return {
      periodo: periodo ? { id: periodo.id, codigo: periodo.codigo } : null,
      conteos: grupos.map((g) => ({ tipo: g.tipo, estado: g.estado, total: g._count._all })),
      pendientes: docentes
        .filter((d) => !d.informesDocente.length)
        .map((d) => ({
          id: d.id,
          nombreCompleto: d.nombreCompleto,
          documento: d.documento,
          vinculacion: d.vinculacion,
        })),
      sinVinculacion,
    };
  }

  async revisar(id: number, revisorId: number, d: D<'revisar'>) {
    const i = await this.prisma.informeDocente.findUnique({ where: { id } });
    if (!i) throw new NotFoundException('El informe no existe.');
    const permitido =
      d.decision === 'APROBAR'
        ? i.estado === 'ENTREGADO'
        : ['ENTREGADO', 'APROBADO'].includes(i.estado);
    if (!permitido) {
      throw new ConflictException(
        i.estado === 'BORRADOR' || i.estado === 'AJUSTES'
          ? 'El docente aún no ha entregado este informe.'
          : 'El informe ya fue aprobado.',
      );
    }
    const estado = d.decision === 'APROBAR' ? 'APROBADO' : 'AJUSTES';
    await this.prisma.informeDocente.update({
      where: { id },
      data: {
        estado,
        observacion: d.observacion || null,
        revisadoEn: new Date(),
        revisorId,
        eventos: {
          create: { accion: estado, usuarioId: revisorId, comentario: d.observacion || null },
        },
      },
    });
    return { ok: true, estado };
  }

  async firmantes() {
    const filas = await this.prisma.configuracion.findMany({
      where: { clave: { in: [CLAVE_DECANO, CLAVE_VICERRECTOR] } },
    });
    const valor = (k: string) => filas.find((f) => f.clave === k)?.valor ?? '';
    return { decano: valor(CLAVE_DECANO), vicerrector: valor(CLAVE_VICERRECTOR) };
  }

  async guardarFirmantes(d: D<'firmantes'>) {
    await this.prisma.$transaction(
      [
        [CLAVE_DECANO, d.decano],
        [CLAVE_VICERRECTOR, d.vicerrector],
      ].map(([clave, valor]) =>
        this.prisma.configuracion.upsert({
          where: { clave: clave as string },
          create: { clave: clave as string, valor: valor as string },
          update: { valor: valor as string },
        }),
      ),
    );
    return this.firmantes();
  }

  /** Genera el Word o PDF del informe con el formato institucional. */
  async documento(i: Completo, formato: 'docx' | 'pdf') {
    const c: ContextoInforme = {
      docente: {
        nombre: i.docente.nombreCompleto,
        documento: i.docente.documento,
        vinculacion: i.docente.vinculacion,
      },
      periodo: { codigo: i.periodo.codigo, numero: i.periodo.numero },
      estado: i.estado,
      observacion: i.observacion,
      firmantes: await this.firmantes(),
    };
    const archivo =
      i.tipo === 'AGENDA'
        ? formato === 'docx'
          ? await agendaDocx(datosAgendaSchema.parse(i.datos), c)
          : await agendaPdf(datosAgendaSchema.parse(i.datos), c)
        : formato === 'docx'
          ? await catedraDocx(datosCatedraSchema.parse(i.datos), c)
          : await catedraPdf(datosCatedraSchema.parse(i.datos), c);
    const base =
      i.tipo === 'AGENDA'
        ? `Agenda - ${i.docente.nombreCompleto} - ${i.periodo.codigo}`
        : `Informe docencia - ${i.docente.nombreCompleto} - ${i.titulo}`;
    return { archivo, nombre: `${base.replace(/[\\/:*?"<>|]/g, '-').slice(0, 150)}.${formato}` };
  }

  async completo(id: number, usuario?: { id: number }): Promise<Completo> {
    const i = await this.prisma.informeDocente.findUnique({ where: { id }, include: incluir });
    if (!i || (usuario && i.docenteId !== usuario.id))
      throw new NotFoundException('El informe no existe.');
    return i;
  }
}
