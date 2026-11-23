import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Periodo, Prisma } from '@prisma/client';
import { esquemaGeneral, EstadoEncuesta, Momento, Rol } from '@rae/shared';
import { UsuarioSesion } from '../../common/sesion';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EncuestaFactory, fraseDe, ItemConPreguntas, preguntaDe } from './encuesta.factory';
import { DatosItem, estrategiaPara, limpiarBorrador, RespuestaCruda } from './estrategias';

export interface EnvioEncuesta {
  general: Record<string, unknown>;
  items: Record<string, RespuestaCruda>;
  estrategias: number[];
  recomendaciones?: string[];
  seguimiento?: { recomendacionId: number; estado: 'APLICADA' | 'PARCIAL' | 'NO_APLICADA' }[];
}

type RolEncuesta = Exclude<Rol, 'ADMIN'>;
const estaAbierto = (p: Periodo, m: Momento) =>
  p.activo && (m === Momento.APRECIACION ? p.apreciacionAbierta : p.alcanceAbierto);

@Injectable()
export class EncuestasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly factory: EncuestaFactory,
  ) {}

  async misCursos(u: UsuarioSesion) {
    const cursos = await this.prisma.curso.findMany({
      where: {
        periodo: { activo: true },
        ...(u.rol === Rol.DOCENTE
          ? { docenteId: u.id }
          : { inscripciones: { some: { estudianteId: u.id, activa: true } } }),
      },
      include: {
        periodo: true,
        unidad: { select: { nombre: true, semestre: true } },
        sede: { select: { codigo: true } },
        programa: { select: { nombre: true } },
        docente: { select: { nombreCompleto: true } },
        encuestas: { where: { usuarioId: u.id }, select: { momento: true, estado: true } },
      },
      orderBy: [{ unidad: { semestre: 'asc' } }, { unidadId: 'asc' }, { grupo: 'asc' }],
    });
    return cursos.map((c) => {
      const estado = (m: Momento) => ({
        abierto: estaAbierto(c.periodo, m),
        estado: c.encuestas.find((e) => e.momento === m)?.estado ?? 'PENDIENTE',
      });
      return {
        id: c.id,
        periodo: c.periodo.codigo,
        unidad: c.unidad.nombre,
        semestre: c.unidad.semestre,
        grupo: c.grupo,
        sede: c.sede.codigo,
        programa: c.programa.nombre,
        docente: c.docente.nombreCompleto,
        apreciacion: estado(Momento.APRECIACION),
        alcance: estado(Momento.ALCANCE),
      };
    });
  }

  /** Solo el docente del curso o un estudiante con inscripción activa. */
  private async cursoAutorizado(u: UsuarioSesion, cursoId: number) {
    const curso = await this.prisma.curso.findUnique({
      where: { id: cursoId },
      include: {
        periodo: true,
        unidad: { select: { id: true, nombre: true, semestre: true } },
        sede: { select: { codigo: true } },
        inscripciones: { where: { estudianteId: u.id, activa: true }, select: { id: true } },
      },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado.');
    const autorizado =
      u.rol === Rol.DOCENTE ? curso.docenteId === u.id : curso.inscripciones.length > 0;
    if (!autorizado) throw new ForbiddenException('Este curso no está asignado a tu usuario.');
    return curso;
  }

  private itemsActivos(unidadId: number): Promise<ItemConPreguntas[]> {
    return this.prisma.itemEvaluable.findMany({
      where: { unidadId, activo: true },
      include: { preguntas: true, competencia: true },
      orderBy: { orden: 'asc' },
    });
  }

  private async recomendacionesPrevias(periodo: Periodo, unidadId: number) {
    const anterior = await this.prisma.periodo.findFirst({
      where: {
        OR: [
          { anio: { lt: periodo.anio } },
          { anio: periodo.anio, numero: { lt: periodo.numero } },
        ],
      },
      orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
    });
    if (!anterior) return [];
    return this.prisma.recomendacion.findMany({
      where: { periodoId: anterior.id, unidadId },
      select: { id: true, texto: true },
    });
  }

  async obtener(u: UsuarioSesion, cursoId: number, momento: Momento) {
    const curso = await this.cursoAutorizado(u, cursoId);
    const encuesta = await this.prisma.encuesta.findUnique({
      where: { cursoId_usuarioId_momento: { cursoId, usuarioId: u.id, momento } },
      include: { items: true, estrategias: { select: { estrategiaId: true } } },
    });
    if (!curso.periodo.activo && encuesta?.estado !== EstadoEncuesta.ENVIADA) {
      throw new NotFoundException('Esta encuesta no está disponible.');
    }
    const [items, estrategias, previas, seguimientos, propias] = await Promise.all([
      this.itemsActivos(curso.unidadId),
      this.prisma.estrategiaPedagogica.findMany({ orderBy: { id: 'asc' } }),
      u.rol === Rol.DOCENTE && momento === Momento.ALCANCE
        ? this.recomendacionesPrevias(curso.periodo, curso.unidadId)
        : Promise.resolve([]),
      this.prisma.seguimientoRecomendacion.findMany({
        where: { cursoId },
        select: { recomendacionId: true, estado: true },
      }),
      this.prisma.recomendacion.findMany({
        where: { cursoId, periodoId: curso.periodoId },
        select: { texto: true },
      }),
    ]);
    const respuestas: Record<number, DatosItem> = {};
    for (const r of encuesta?.items ?? []) {
      respuestas[r.itemId] = {
        nivel: r.nivel ?? undefined,
        evaluados: r.evaluados ?? undefined,
        alcanzan: r.alcanzan ?? undefined,
        evidencia: r.evidencia ?? undefined,
        instrumento: r.instrumento ?? undefined,
        opcionElegida: r.opcionElegida ?? undefined,
      };
    }
    return {
      curso: {
        id: curso.id,
        unidad: curso.unidad.nombre,
        semestre: curso.unidad.semestre,
        grupo: curso.grupo,
        sede: curso.sede.codigo,
        periodo: curso.periodo.codigo,
      },
      rol: u.rol,
      momento,
      abierto: estaAbierto(curso.periodo, momento),
      estado: encuesta?.estado ?? 'PENDIENTE',
      secciones: this.factory.secciones(items, u.rol, momento, u.id),
      general: encuesta?.general ?? {},
      respuestas,
      estrategiasCatalogo: estrategias,
      estrategias: encuesta?.estrategias.map((e) => e.estrategiaId) ?? [],
      recomendacionesPrevias: previas.map((p) => ({
        ...p,
        estado: seguimientos.find((s) => s.recomendacionId === p.id)?.estado ?? null,
      })),
      recomendaciones: propias.map((r) => r.texto),
    };
  }

  private async preparar(u: UsuarioSesion, cursoId: number, momento: Momento) {
    if (u.rol === Rol.ADMIN) throw new ForbiddenException('Solo docentes y estudiantes responden.');
    const curso = await this.cursoAutorizado(u, cursoId);
    if (!estaAbierto(curso.periodo, momento)) {
      throw new ConflictException('Este momento de la encuesta está cerrado.');
    }
    return { curso, rol: u.rol, items: await this.itemsActivos(curso.unidadId) };
  }

  private validarGeneral(rol: RolEncuesta, momento: Momento, general: Record<string, unknown>) {
    const r = esquemaGeneral(rol, momento).safeParse(general);
    if (!r.success) {
      throw new UnprocessableEntityException({
        message: 'Revisa las preguntas generales.',
        detalles: r.error.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message })),
      });
    }
    return r.data as Prisma.InputJsonObject;
  }

  async guardarBorrador(u: UsuarioSesion, cursoId: number, momento: Momento, d: EnvioEncuesta) {
    const { curso, rol, items } = await this.preparar(u, cursoId, momento);
    const general = this.validarGeneral(rol, momento, d.general);
    const filas = items.flatMap((it) => {
      const cruda = d.items[String(it.id)];
      if (!cruda) return [];
      const total = (preguntaDe(it, rol)?.opciones as string[] | undefined)?.length ?? 0;
      return [{ itemId: it.id, ...limpiarBorrador(cruda, total) }];
    });
    await this.prisma.$transaction(async (tx) => {
      const previa = await tx.encuesta.findUnique({
        where: { cursoId_usuarioId_momento: { cursoId, usuarioId: u.id, momento } },
      });
      if (previa?.estado === EstadoEncuesta.ENVIADA) {
        throw new ConflictException('Esta encuesta ya fue enviada; usa Enviar para actualizarla.');
      }
      const e = await tx.encuesta.upsert({
        where: { cursoId_usuarioId_momento: { cursoId, usuarioId: u.id, momento } },
        create: { cursoId, usuarioId: u.id, periodoId: curso.periodoId, rol, momento, general },
        update: { general },
      });
      await this.reemplazar(tx, e.id, filas, d.estrategias);
    });
    return { guardado: true };
  }

  async enviar(u: UsuarioSesion, cursoId: number, momento: Momento, d: EnvioEncuesta) {
    const { curso, rol, items } = await this.preparar(u, cursoId, momento);
    const general = this.validarGeneral(rol, momento, d.general);
    const estrategia = estrategiaPara(rol, momento);
    const faltantes: number[] = [];
    const filas: Prisma.RespuestaItemCreateManyEncuestaInput[] = [];

    for (const it of items) {
      const pregunta = momento === Momento.ALCANCE ? preguntaDe(it, rol) : null;
      const opciones = (pregunta?.opciones as string[] | undefined) ?? [];
      const datos = estrategia.validar(it.id, d.items[String(it.id)] ?? {}, opciones.length);
      if (!datos) {
        faltantes.push(it.id);
        continue;
      }
      const elegida = datos.opcionElegida;
      filas.push({
        itemId: it.id,
        ...datos,
        textoItem: fraseDe(it, rol, momento),
        ...(pregunta && elegida !== undefined
          ? {
              preguntaPracticaId: pregunta.id,
              acierto: elegida === pregunta.indiceCorrecta,
              enunciadoPregunta: pregunta.enunciado,
              textoRespuesta: opciones[elegida],
            }
          : {}),
      });
    }
    if (faltantes.length) {
      throw new UnprocessableEntityException({
        message: `Faltan ${faltantes.length} respuestas.`,
        detalles: faltantes.map((id) => ({ campo: `items.${id}`, motivo: 'Incompleto' })),
      });
    }

    const previas =
      rol === Rol.DOCENTE && momento === Momento.ALCANCE
        ? await this.recomendacionesPrevias(curso.periodo, curso.unidadId)
        : [];
    const permitidas = new Set(previas.map((p) => p.id));
    const seguimiento = (d.seguimiento ?? []).filter((s) => permitidas.has(s.recomendacionId));
    const nuevas =
      rol === Rol.DOCENTE && momento === Momento.ALCANCE
        ? [...new Set((d.recomendaciones ?? []).map((t) => t.trim()).filter(Boolean))]
        : [];

    await this.prisma.$transaction(async (tx) => {
      const datos = {
        general,
        estado: EstadoEncuesta.ENVIADA,
        enviadaEn: new Date(),
      };
      const e = await tx.encuesta.upsert({
        where: { cursoId_usuarioId_momento: { cursoId, usuarioId: u.id, momento } },
        create: { cursoId, usuarioId: u.id, periodoId: curso.periodoId, rol, momento, ...datos },
        update: datos,
      });
      await this.reemplazar(tx, e.id, filas, d.estrategias);
      if (rol === Rol.DOCENTE && momento === Momento.ALCANCE) {
        await tx.recomendacion.deleteMany({ where: { cursoId, periodoId: curso.periodoId } });
        await tx.recomendacion.createMany({
          data: nuevas.map((texto) => ({
            texto,
            cursoId,
            periodoId: curso.periodoId,
            unidadId: curso.unidadId,
          })),
        });
        for (const s of seguimiento) {
          await tx.seguimientoRecomendacion.upsert({
            where: { recomendacionId_cursoId: { recomendacionId: s.recomendacionId, cursoId } },
            create: { recomendacionId: s.recomendacionId, cursoId, estado: s.estado },
            update: { estado: s.estado },
          });
        }
      }
    });
    return { enviada: true };
  }

  private async reemplazar(
    tx: Prisma.TransactionClient,
    encuestaId: number,
    filas: Omit<Prisma.RespuestaItemCreateManyInput, 'encuestaId'>[],
    estrategias: number[],
  ): Promise<void> {
    await tx.respuestaItem.deleteMany({ where: { encuestaId } });
    if (filas.length) {
      await tx.respuestaItem.createMany({ data: filas.map((f) => ({ ...f, encuestaId })) });
    }
    await tx.encuestaEstrategia.deleteMany({ where: { encuestaId } });
    const validas = await tx.estrategiaPedagogica.findMany({
      where: { id: { in: [...new Set(estrategias)] } },
      select: { id: true },
    });
    if (validas.length) {
      await tx.encuestaEstrategia.createMany({
        data: validas.map((v) => ({ encuestaId, estrategiaId: v.id })),
      });
    }
  }
}
