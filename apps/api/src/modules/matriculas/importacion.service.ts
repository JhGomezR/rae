import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { claveInicial, normalizarNombreUnidad, parsearNombre, Rol } from '@rae/shared';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FilaConsolidado, leerConsolidado } from './lector-consolidado';

const LOTE = 500;
const CONCURRENCIA_HASH = 4;

const lotes = <T>(lista: T[]): T[][] => {
  const r: T[][] = [];
  for (let i = 0; i < lista.length; i += LOTE) r.push(lista.slice(i, i + LOTE));
  return r;
};

const claveCurso = (p: number, s: number, g: number, u: number, grupo: string, d: number) =>
  `${p}|${s}|${g}|${u}|${grupo}|${d}`;

@Injectable()
export class ImportacionService {
  constructor(private readonly prisma: PrismaService) {}

  private async mapaUnidades(): Promise<Map<string, number>> {
    const [unidades, alias] = await Promise.all([
      this.prisma.unidadFormacion.findMany({
        where: { activo: true },
        select: { id: true, nombreClave: true },
      }),
      this.prisma.aliasUnidad.findMany(),
    ]);
    const mapa = new Map(unidades.map((u) => [u.nombreClave, u.id]));
    for (const a of alias) mapa.set(a.alias, a.unidadId);
    return mapa;
  }

  async previsualizar(nombre: string, archivo: Buffer, usuarioId: number) {
    let lectura;
    try {
      lectura = await leerConsolidado(archivo, await this.mapaUnidades());
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error && e.message.startsWith('Faltan')
          ? e.message
          : 'No se pudo leer el archivo. Verifica que sea un Excel válido.',
      );
    }
    const { filas, errores, unidadesSinEmparejar, ambiguos, totalFilas } = lectura;
    const estudiantes = new Set(filas.map((f) => f.idEstudiante));
    const docentes = new Set(filas.map((f) => f.idDocente));
    const existentes = new Set(
      (
        await this.prisma.usuario.findMany({
          where: { documento: { in: [...estudiantes, ...docentes] } },
          select: { documento: true },
        })
      ).map((u) => u.documento),
    );
    const cuenta = (s: Set<string>) => {
      const ya = [...s].filter((d) => existentes.has(d)).length;
      return { nuevos: s.size - ya, existentes: ya };
    };
    const resumen = {
      filas: totalFilas,
      validas: filas.length,
      periodos: [...new Set(filas.map((f) => f.periodo))],
      sedes: [...new Set(filas.map((f) => f.sede))],
      programas: [...new Set(filas.map((f) => f.programa))],
      estudiantes: cuenta(estudiantes),
      docentes: cuenta(docentes),
      cursos: new Set(
        filas.map((f) =>
          [f.periodo, f.sede, f.programa, f.unidadId, f.grupo, f.idDocente].join('|'),
        ),
      ).size,
      inscripciones: filas.length,
      nombresPorRevisar: ambiguos,
      unidadesSinEmparejar,
    };
    const fila = await this.prisma.importacion.create({
      data: {
        archivo: nombre.slice(0, 200),
        usuarioId,
        resumen,
        errores: errores as unknown as Prisma.InputJsonValue,
        filas: filas as unknown as Prisma.InputJsonValue,
      },
    });
    return { importacionId: fila.id, resumen, errores };
  }

  async aplicar(id: number) {
    const imp = await this.prisma.importacion.findUnique({ where: { id } });
    if (!imp) throw new NotFoundException('Importación no encontrada.');
    if (imp.estado !== 'PREVISUALIZADA' || !imp.filas) {
      throw new ConflictException('Esta importación ya fue procesada.');
    }
    const filas = imp.filas as unknown as FilaConsolidado[];
    const nuevos = await this.prepararUsuarios(filas);
    await this.prisma.$transaction((tx) => this.escribir(tx, filas, nuevos), {
      timeout: 240_000,
      maxWait: 20_000,
    });
    await this.prisma.importacion.update({
      where: { id },
      data: { estado: 'APLICADA', filas: Prisma.DbNull },
    });
    return { aplicada: true, usuariosNuevos: nuevos.length };
  }

  /** Calcula las claves fuera de la transacción: argon2 es costoso a propósito. */
  private async prepararUsuarios(filas: FilaConsolidado[]) {
    const personas = new Map<string, { nombre: string; rol: Rol }>();
    for (const f of filas) {
      personas.set(f.idEstudiante, { nombre: f.estudiante, rol: Rol.ESTUDIANTE });
      personas.set(f.idDocente, { nombre: f.docente, rol: Rol.DOCENTE });
    }
    const ya = new Set(
      (
        await this.prisma.usuario.findMany({
          where: { documento: { in: [...personas.keys()] } },
          select: { documento: true },
        })
      ).map((u) => u.documento),
    );
    const pendientes = [...personas].filter(([d]) => !ya.has(d));
    const salida: Prisma.UsuarioCreateManyInput[] = [];
    for (let i = 0; i < pendientes.length; i += CONCURRENCIA_HASH) {
      const grupo = pendientes.slice(i, i + CONCURRENCIA_HASH);
      salida.push(
        ...(await Promise.all(
          grupo.map(async ([documento, p]) => {
            const n = parsearNombre(p.nombre);
            return {
              documento,
              nombreCompleto: p.nombre.slice(0, 150),
              primerApellido: n.primerApellido.slice(0, 60),
              primerNombre: n.primerNombre.slice(0, 60),
              rol: p.rol,
              passwordHash: await argon2.hash(claveInicial(documento, p.nombre, p.rol)),
            };
          }),
        )),
      );
    }
    return salida;
  }

  private async escribir(
    tx: Prisma.TransactionClient,
    filas: FilaConsolidado[],
    nuevos: Prisma.UsuarioCreateManyInput[],
  ): Promise<void> {
    const periodos = new Map<string, number>();
    const hayActivo = (await tx.periodo.count({ where: { activo: true } })) > 0;
    for (const [i, codigo] of [...new Set(filas.map((f) => f.periodo))]
      .sort()
      .reverse()
      .entries()) {
      const [anio, numero] = codigo.split('-').map(Number) as [number, number];
      const p = await tx.periodo.upsert({
        where: { codigo },
        update: {},
        create: { codigo, anio, numero, activo: !hayActivo && i === 0 },
      });
      periodos.set(codigo, p.id);
    }
    const sedes = new Map<string, number>();
    for (const codigo of new Set(filas.map((f) => f.sede))) {
      const s = await tx.sede.upsert({ where: { codigo }, update: {}, create: { codigo } });
      sedes.set(codigo, s.id);
    }
    const programas = new Map<string, number>();
    for (const nombre of new Set(filas.map((f) => f.programa))) {
      const ciclo = /TECNOLOG/i.test(normalizarNombreUnidad(nombre))
        ? 'TECNOLOGICO'
        : 'PROFESIONAL';
      const p = await tx.programa.upsert({
        where: { nombre },
        update: {},
        create: { nombre, ciclo },
      });
      programas.set(nombre, p.id);
    }
    for (const l of lotes(nuevos)) await tx.usuario.createMany({ data: l, skipDuplicates: true });

    const docs = [...new Set(filas.flatMap((f) => [f.idEstudiante, f.idDocente]))];
    const usuarios = new Map<string, number>();
    for (const l of lotes(docs)) {
      const encontrados = await tx.usuario.findMany({
        where: { documento: { in: l } },
        select: { id: true, documento: true },
      });
      for (const u of encontrados) usuarios.set(u.documento, u.id);
    }
    const id = <T>(m: Map<T, number>, k: T) => m.get(k) as number;
    const cursosData = new Map<string, Prisma.CursoCreateManyInput>();
    for (const f of filas) {
      const d = {
        periodoId: id(periodos, f.periodo),
        sedeId: id(sedes, f.sede),
        programaId: id(programas, f.programa),
        unidadId: f.unidadId,
        grupo: f.grupo,
        docenteId: id(usuarios, f.idDocente),
      };
      const k = claveCurso(d.periodoId, d.sedeId, d.programaId, d.unidadId, d.grupo, d.docenteId);
      if (!cursosData.has(k)) cursosData.set(k, { ...d, semestreOferta: f.semestre });
    }
    for (const l of lotes([...cursosData.values()])) {
      await tx.curso.createMany({ data: l, skipDuplicates: true });
    }
    const idsPeriodo = [...periodos.values()];
    const cursos = await tx.curso.findMany({ where: { periodoId: { in: idsPeriodo } } });
    const porClave = new Map(
      cursos.map((c) => [
        claveCurso(c.periodoId, c.sedeId, c.programaId, c.unidadId, c.grupo, c.docenteId),
        c.id,
      ]),
    );
    const inscripciones = new Map<string, Prisma.InscripcionCreateManyInput>();
    for (const f of filas) {
      const cursoId = id(
        porClave,
        claveCurso(
          id(periodos, f.periodo),
          id(sedes, f.sede),
          id(programas, f.programa),
          f.unidadId,
          f.grupo,
          id(usuarios, f.idDocente),
        ),
      );
      const estudianteId = id(usuarios, f.idEstudiante);
      inscripciones.set(`${cursoId}|${estudianteId}`, {
        cursoId,
        estudianteId,
        semestreEstudiante: f.semestre,
      });
    }
    // Quien ya no aparece en el archivo queda inactivo; quien aparece se reactiva.
    await tx.inscripcion.updateMany({
      where: { curso: { periodoId: { in: idsPeriodo } } },
      data: { activa: false },
    });
    const lista = [...inscripciones.values()];
    for (const l of lotes(lista)) {
      await tx.inscripcion.createMany({ data: l, skipDuplicates: true });
      await tx.inscripcion.updateMany({
        where: { OR: l.map((x) => ({ cursoId: x.cursoId, estudianteId: x.estudianteId })) },
        data: { activa: true },
      });
    }
  }
}
