import { Injectable } from '@nestjs/common';
import { Momento, Rol } from '@rae/shared';
import { CURSO_VIGENTE } from '../../common/vigencia';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EncuestaCargada, nivelRespuesta } from './resultados.service';

const MOMENTOS = [Momento.APRECIACION, Momento.ALCANCE] as const;
const pct = (n: number, d: number) => (d ? Number(((n / d) * 100).toFixed(1)) : 0);

interface Esperada {
  cursoId: number;
  usuarioId: number;
  rol: Rol;
  semestre: number;
  sede: string;
  unidadId: number;
  unidad: string;
}

/** Estadísticas de avance: cuántos respondieron, cuántos faltan y cómo se distribuyen los niveles. */
@Injectable()
export class PanelService {
  constructor(private readonly prisma: PrismaService) {}

  async calcular(periodoId: number, enviadas: EncuestaCargada[]) {
    const [cursos, inscripciones, encuestas] = await Promise.all([
      this.prisma.curso.findMany({
        where: { periodoId, ...CURSO_VIGENTE },
        select: {
          id: true,
          docenteId: true,
          sede: { select: { codigo: true } },
          unidad: { select: { id: true, nombre: true, semestre: true } },
        },
      }),
      this.prisma.inscripcion.findMany({
        where: { activa: true, curso: { periodoId, ...CURSO_VIGENTE } },
        select: { cursoId: true, estudianteId: true },
      }),
      this.prisma.encuesta.findMany({
        where: { periodoId, curso: CURSO_VIGENTE },
        select: { cursoId: true, usuarioId: true, momento: true, estado: true },
      }),
    ]);
    const porCurso = new Map(cursos.map((c) => [c.id, c]));
    const fila = (cursoId: number, usuarioId: number, rol: Rol): Esperada => {
      const c = porCurso.get(cursoId) as (typeof cursos)[number];
      return {
        cursoId,
        usuarioId,
        rol,
        semestre: c.unidad.semestre,
        sede: c.sede.codigo,
        unidadId: c.unidad.id,
        unidad: c.unidad.nombre,
      };
    };
    const esperadas: Esperada[] = [
      ...inscripciones.map((i) => fila(i.cursoId, i.estudianteId, Rol.ESTUDIANTE)),
      ...cursos.map((c) => fila(c.id, c.docenteId, Rol.DOCENTE)),
    ];
    const estado = new Map(
      encuestas.map((e) => [`${e.cursoId}|${e.usuarioId}|${e.momento}`, e.estado]),
    );
    const de = (e: Esperada, m: Momento) => estado.get(`${e.cursoId}|${e.usuarioId}|${m}`);

    const ids = (rol: Rol) => [
      ...new Set(esperadas.filter((e) => e.rol === rol).map((e) => e.usuarioId)),
    ];
    const cuentas = await this.prisma.usuario.findMany({
      where: { id: { in: [...ids(Rol.ESTUDIANTE), ...ids(Rol.DOCENTE)] } },
      select: { id: true, debeCambiarClave: true },
    });
    const activada = new Set(cuentas.filter((c) => !c.debeCambiarClave).map((c) => c.id));
    const ingreso = (rol: Rol) => {
      const lista = ids(rol);
      const si = lista.filter((id) => activada.has(id)).length;
      return { ingresaron: si, pendientes: lista.length - si };
    };

    const resumen = (lista: Esperada[], m: Momento) => {
      const env = lista.filter((e) => de(e, m) === 'ENVIADA').length;
      const bor = lista.filter((e) => de(e, m) === 'BORRADOR').length;
      return {
        esperadas: lista.length,
        enviadas: env,
        borrador: bor,
        pendientes: lista.length - env - bor,
        pct: pct(env, lista.length),
      };
    };
    const personas = (rol: Rol, m: Momento) => {
      const grupos = new Map<number, Esperada[]>();
      for (const e of esperadas.filter((x) => x.rol === rol)) {
        grupos.set(e.usuarioId, [...(grupos.get(e.usuarioId) ?? []), e]);
      }
      let completaron = 0;
      let parcial = 0;
      for (const lista of grupos.values()) {
        const n = lista.filter((e) => de(e, m) === 'ENVIADA').length;
        if (n === lista.length) completaron++;
        else if (n > 0 || lista.some((e) => de(e, m) === 'BORRADOR')) parcial++;
      }
      return {
        total: grupos.size,
        completaron,
        parcial,
        ninguna: grupos.size - completaron - parcial,
      };
    };
    const agrupar = <K extends string | number>(clave: (e: Esperada) => K, m: Momento) => {
      const mapa = new Map<K, Esperada[]>();
      for (const e of esperadas) mapa.set(clave(e), [...(mapa.get(clave(e)) ?? []), e]);
      return [...mapa].map(([k, lista]) => ({
        clave: k,
        estudiantes: resumen(
          lista.filter((e) => e.rol === Rol.ESTUDIANTE),
          m,
        ).pct,
        docentes: resumen(
          lista.filter((e) => e.rol === Rol.DOCENTE),
          m,
        ).pct,
      }));
    };
    const niveles = (m: Momento, rol: Rol) => {
      const conteo = [0, 0, 0, 0];
      for (const e of enviadas.filter((x) => x.momento === m && x.rol === rol)) {
        for (const i of e.items) {
          const n = nivelRespuesta(i);
          if (n) conteo[n - 1] = (conteo[n - 1] ?? 0) + 1;
        }
      }
      return conteo;
    };

    const porMomento = Object.fromEntries(
      MOMENTOS.map((m) => {
        const unidades = new Map<number, { unidad: string; lista: Esperada[] }>();
        for (const e of esperadas.filter((x) => x.rol === Rol.ESTUDIANTE)) {
          const u = unidades.get(e.unidadId) ?? { unidad: e.unidad, lista: [] };
          u.lista.push(e);
          unidades.set(e.unidadId, u);
        }
        return [
          m,
          {
            estudiantes: resumen(
              esperadas.filter((e) => e.rol === Rol.ESTUDIANTE),
              m,
            ),
            docentes: resumen(
              esperadas.filter((e) => e.rol === Rol.DOCENTE),
              m,
            ),
            personasEstudiantes: personas(Rol.ESTUDIANTE, m),
            personasDocentes: personas(Rol.DOCENTE, m),
            porSemestre: agrupar((e) => e.semestre, m).sort((a, b) => a.clave - b.clave),
            porSede: agrupar((e) => e.sede, m).sort((a, b) => a.clave.localeCompare(b.clave)),
            menorParticipacion: [...unidades.values()]
              .map((u) => ({ unidad: u.unidad, ...resumen(u.lista, m) }))
              .sort((a, b) => a.pct - b.pct || b.esperadas - a.esperadas)
              .slice(0, 8),
            nivelesEstudiantes: niveles(m, Rol.ESTUDIANTE),
            nivelesDocentes: niveles(m, Rol.DOCENTE),
          },
        ];
      }),
    );
    return {
      ingreso: { estudiantes: ingreso(Rol.ESTUDIANTE), docentes: ingreso(Rol.DOCENTE) },
      momentos: porMomento,
    };
  }
}
