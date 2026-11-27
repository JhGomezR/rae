import { z } from 'zod';

/** Actividad del formato F-DOC-004 «Informe de ejecución de la agenda semanal docente». */
export interface ActividadEjecucion {
  clave: string;
  actividad: string;
}

export interface LaborEjecucion {
  clave: string;
  titulo: string;
  actividades: ActividadEjecucion[];
}

/** Labores y actividades tal como aparecen en el F-DOC-004 (las claves coinciden con la agenda). */
export const LABORES_EJECUCION: LaborEjecucion[] = [
  {
    clave: 'directa',
    titulo: 'DOCENCIA DIRECTA',
    actividades: [
      {
        clave: 'dir-encuentro',
        actividad:
          'Encuentro presencial con la utilización de diferentes estrategias didácticas sincrónicas o asincrónicas donde el profesor acompañe al estudiante (unidades de formación)',
      },
    ],
  },
  {
    clave: 'indirecta',
    titulo: 'DOCENCIA INDIRECTA',
    actividades: [
      {
        clave: 'ind-preparacion',
        actividad: 'Preparación y evaluación de clases presencial o virtual',
      },
      { clave: 'ind-atencion', actividad: 'Atención estudiantil' },
      { clave: 'ind-validacion', actividad: 'Validación por suficiencia / habilitación' },
    ],
  },
  {
    clave: 'investigacion',
    titulo: 'LABOR DE INVESTIGACIÓN',
    actividades: [
      {
        clave: 'inv-principal',
        actividad:
          'a. Formulación, desarrollo e implementación de un proyecto de investigación (Investigador Principal)',
      },
      {
        clave: 'inv-coinvestigador',
        actividad:
          'b. Ejecutar tareas específicas en el desarrollo de un proyecto (Coinvestigador)',
      },
      {
        clave: 'inv-auxiliar',
        actividad:
          'c. Ejecutar tareas de apoyo bajo la dirección y supervisión del equipo de investigadores (Auxiliar de investigación)',
      },
      {
        clave: 'inv-semillero',
        actividad:
          'd. Trabajar en pro de la producción de ideas y proyectos de investigación formativa para ser elaborados con los mismos estudiantes miembros del semillero (Líder de semillero de investigación)',
      },
      {
        clave: 'inv-lider',
        actividad:
          'e. Liderazgo académico y de gestión del grupo (Líder de grupo de investigación)',
      },
      {
        clave: 'inv-asesor',
        actividad:
          'f. Dirigir y acompañar a los estudiantes en el desarrollo de la modalidad de grado (Asesor de trabajo de grado)',
      },
      {
        clave: 'inv-evaluador',
        actividad:
          'g. Evalúa, conceptúa y/o califica la propuesta, avances, informes finales y sustentación final de los trabajos de grado presentados por los estudiantes (Evaluador de trabajo de grado)',
      },
    ],
  },
  {
    clave: 'extension',
    titulo: 'LABOR DE EXTENSIÓN Y PROYECCIÓN SOCIAL',
    actividades: [
      { clave: 'ext-continuada', actividad: 'Educación continuada' },
      { clave: 'ext-asesoria', actividad: 'Asesoría y consultoría externa' },
      { clave: 'ext-comunitario', actividad: 'Actividades de servicio comunitario' },
      { clave: 'ext-otras', actividad: 'Otras actividades de extensión' },
    ],
  },
  {
    clave: 'administrativa',
    titulo: 'LABOR ACADÉMICO ADMINISTRATIVO',
    actividades: [
      {
        clave: 'adm-apoyo',
        actividad:
          'Apoyo al trabajo administrativo desarrollado en los programas académicos y coordinaciones académicas de la institución (para docentes que apoyan procesos académico-administrativos)',
      },
      {
        clave: 'adm-organos',
        actividad:
          'Miembro de los Órganos de Gobierno y Dirección de la institución (Consejo Directivo, Consejo Académico, Consejo de Facultad, Comité Curricular, Comité de Investigación entre otros)',
      },
      {
        clave: 'adm-consejos',
        actividad: 'Como miembro de consejos asesores, y que por designación rectoral se requiera',
      },
      {
        clave: 'adm-direccion',
        actividad:
          'Funciones de dirección o coordinación de procesos misionales y/o de programas académicos: Decano de facultad, director de programa, director de postgrados, Coordinador de autoevaluación, director de CIECYT o como se denomine en adelante',
      },
    ],
  },
];

const texto = (max: number) => z.string().trim().max(max).default('');
const porcentaje = z.number().min(0).max(100).nullable().default(null);

export const filaEjecucionSchema = z.object({
  actividad: z.string().max(40),
  tarea: texto(2000),
  meta: texto(1000),
  indicador: texto(1000),
  horas: z.number().min(0).max(2000).nullable().default(null),
  corte1: porcentaje,
  corte2: porcentaje,
  evidencias: texto(1000),
  meses: z
    .array(z.number().int().min(1).max(12))
    .max(12)
    .transform((m) => [...new Set(m)].sort((a, b) => a - b))
    .default([]),
  observaciones: texto(1000),
});
export type FilaEjecucion = z.infer<typeof filaEjecucionSchema>;

export const datosEjecucionSchema = z.object({
  /** Corte académico que se reporta: 1 (primer corte) o 2 (cierre del semestre). */
  corte: z.union([z.literal(1), z.literal(2)]).default(1),
  facultad: texto(200),
  escalafon: texto(100),
  fechaElaboracion: texto(10),
  filas: z.array(filaEjecucionSchema).max(120).default([]),
});
export type DatosEjecucion = z.infer<typeof datosEjecucionSchema>;

const promedio = (v: number[]) =>
  v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;

/** Cumplimiento promedio por labor y total, en el corte indicado (solo filas con tarea). */
export function cumplimientoEjecucion(d: Pick<DatosEjecucion, 'filas'>, corte: 1 | 2) {
  const campo = corte === 1 ? 'corte1' : 'corte2';
  const deLabor = (clave: string) => {
    const claves = LABORES_EJECUCION.find((l) => l.clave === clave)?.actividades.map(
      (a) => a.clave,
    );
    return d.filas.filter((f) => claves?.includes(f.actividad) && f.tarea);
  };
  const valores = (filas: FilaEjecucion[]) =>
    filas.map((f) => f[campo]).filter((x): x is number => x !== null);
  return {
    porLabor: LABORES_EJECUCION.map((l) => ({
      clave: l.clave,
      titulo: l.titulo,
      tareas: deLabor(l.clave).length,
      cumplimiento: promedio(valores(deLabor(l.clave))),
    })),
    total: promedio(valores(d.filas.filter((f) => f.tarea))),
    tareas: d.filas.filter((f) => f.tarea).length,
  };
}
