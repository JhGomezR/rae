import { z } from 'zod';

/** Informes que presentan los docentes según su vinculación (submódulos del POA). */
export const VINCULACIONES = {
  PLANTA: 'Planta (carrera)',
  OCASIONAL: 'Ocasional',
  PROVISIONAL: 'Provisional',
  CATEDRA: 'Hora cátedra',
} as const;
export type Vinculacion = keyof typeof VINCULACIONES;

/** Agenda (F-DOC-056) para planta, ocasional y provisional; informe de docencia (F-DOC-047) para cátedra. */
export const VINCULACIONES_AGENDA: Vinculacion[] = ['PLANTA', 'OCASIONAL', 'PROVISIONAL'];
export const VINCULACIONES_CATEDRA: Vinculacion[] = ['CATEDRA'];

export const ESTADOS_INFORME_DOCENTE = {
  BORRADOR: 'Borrador',
  ENTREGADO: 'Entregado · en revisión',
  AJUSTES: 'Requiere ajustes',
  APROBADO: 'Aprobado',
} as const;
export type EstadoInformeDocente = keyof typeof ESTADOS_INFORME_DOCENTE;
/** El docente solo edita mientras el informe no está entregado ni aprobado. */
export const EDITABLE: EstadoInformeDocente[] = ['BORRADOR', 'AJUSTES'];

export const DEDICACIONES = {
  MEDIO_TIEMPO: 'Medio tiempo',
  TIEMPO_COMPLETO: 'Tiempo completo',
} as const;
export const ESCALAFONES = {
  AUXILIAR: 'Auxiliar',
  ASISTENTE: 'Asistente',
  ASOCIADO: 'Asociado',
  TITULAR: 'Titular',
} as const;

export interface ActividadAgenda {
  clave: string;
  actividad: string;
  fuente: string;
  evidencias: string;
  /** Texto fijo en la columna de horas (p. ej. «Lo define el Consejo Académico»). */
  horasTexto?: string;
}

export interface SeccionAgenda {
  clave: string;
  titulo: string;
  texto?: string;
  /** La planeación no lleva horas semanales. */
  conHoras: boolean;
  nota?: string;
  actividades: ActividadAgenda[];
  /** Subtotal que se muestra al final de la sección (agrupa secciones). */
  subtotal?: { titulo: string; secciones: string[]; maximo?: number };
}

/** Actividades del formato F-DOC-056 «Agenda semanal docente», tal como aparecen en el documento. */
export const SECCIONES_AGENDA: SeccionAgenda[] = [
  {
    clave: 'planeacion',
    titulo: '2. PLANEACIÓN ACADÉMICA',
    texto:
      '“Toma anticipada de decisiones”, en este sentido, toda decisión de planeación se basa en el conocimiento previo de la realidad para controlar las acciones presentes, encaminadas al logro de un objetivo deseado y satisfactorio y proveer sus consecuencias futuras, y alinear la práctica pedagógica a las características particulares de los estudiantes, adicional corresponde al apoyo en la planeación y organización del programa académico. Art. 15 Estatuto Profesoral',
    nota: '*Nota: Periodo A: Enero - febrero y Periodo B: Julio – Agosto según calendario académico',
    conHoras: false,
    actividades: [
      {
        clave: 'plan-contenidos',
        actividad: 'Actualización de contenidos de unidades de formación',
        fuente: 'Facultad\nDirectores de Programa',
        evidencias:
          'F-DOC-051 Actualización de syllabus (envío a comité curricular)\nF-DOC-052 Programador de clases',
      },
      {
        clave: 'plan-material',
        actividad: 'Diseño de material de apoyo para las respectivas asignaturas',
        fuente: 'Facultad\nDirectores de Programa',
        evidencias:
          'F-DOC-055 Informe salidas académicas visitas eventos académicos\nF-CYM-005 Acta de reunión (comité curricular)',
      },
      { clave: 'plan-otras', actividad: 'Otras', fuente: 'Facultad', evidencias: '' },
    ],
  },
  {
    clave: 'directa',
    titulo: '3.1.1 DOCENCIA DIRECTA',
    texto:
      'Implica un contacto permanente con los estudiantes ya sea en actividades teóricas, prácticas o teórico-prácticas. (Artículo 18º Estatuto Profesoral)',
    nota: 'Nota: Los profesores de Tiempo Completo tendrán una asignación semanal de docencia directa mínima de 14 horas y máxima de 18 horas. Los profesores de Medio Tiempo tendrán una asignación semanal de docencia directa máximo de 14 horas y mínima de 10 horas. Art. 28° Estatuto profesoral',
    conHoras: true,
    actividades: [
      {
        clave: 'dir-encuentro',
        actividad:
          'Encuentro presencial con la utilización de diferentes estrategias didácticas sincrónicas o asincrónicas donde el profesor acompañe al estudiante (unidades de formación)',
        fuente: 'Facultad',
        evidencias:
          'F-DOC-046 Listado de asistencia a clase\nF-DOC-017 Acta de encuadre pedagógico',
      },
    ],
  },
  {
    clave: 'indirecta',
    titulo: '3.1.2 DOCENCIA INDIRECTA',
    texto:
      'La que no involucra un contacto permanente del profesor con los estudiantes o se desarrolla como actividad complementaria a la docencia directa. Art. 18 Estatuto Profesoral',
    nota: 'Nota: Se asignarán 0.5 hora por cada hora de docencia directa que se dedicarán a la Preparación y Evaluación de Clases, en modalidad Presencial o Virtual. Se asignarán 2 horas semanales para la atención estudiantil. Se asignará 1 hora semestral por cada examen de Validación y habilitación que se le asigne. Art. 29 Estatuto Profesoral',
    conHoras: true,
    actividades: [
      {
        clave: 'ind-preparacion',
        actividad: 'Preparación y evaluación de clases presencial o virtual',
        fuente: '',
        evidencias: 'Moodle\nPPT, guías, talleres, casos prácticos.',
      },
      {
        clave: 'ind-atencion',
        actividad: 'Atención estudiantil',
        fuente: '',
        evidencias: 'F-DOC-006 Asesoría y atención a estudiantes',
      },
      {
        clave: 'ind-validacion',
        actividad: 'Validación por suficiencia/habilitación',
        fuente: '',
        evidencias: 'Formato entrega de calificación',
      },
    ],
    subtotal: {
      titulo: 'SUBTOTAL HORAS SEMANALES (Docencia directa más Docencia Indirecta)',
      secciones: ['directa', 'indirecta'],
    },
  },
  {
    clave: 'investigacion',
    titulo: '3.1.3 LABOR DE INVESTIGACIÓN',
    texto:
      'Entiéndase por labores de investigación las desarrolladas por el profesor en la búsqueda o aplicación del conocimiento científico y tecnológico, con fines teóricos o prácticos, y que se concreten en los denominados productos de investigación. (Arts. 19, 20 y 30 Estatuto Profesoral)',
    nota: 'Nota: De las funciones asumidas de los literales a) al e) deberá resultar como producto un artículo científico o un capítulo de libro o una ponencia, un manuscrito para la revista institucional.',
    conHoras: true,
    actividades: [
      {
        clave: 'inv-principal',
        actividad:
          'a. Formulación, desarrollo e implementación de un proyecto de investigación (Investigador Principal)',
        fuente: 'CIECYT',
        evidencias:
          'Formato Plan de trabajo y diagrama de actividades\nF-INV-056 Seguimiento a investigador principal',
      },
      {
        clave: 'inv-coinvestigador',
        actividad:
          'b. Ejecutar tareas específicas en el desarrollo de un proyecto (Coinvestigador)',
        fuente: 'CIECYT',
        evidencias: 'Formato Plan de trabajo\nF-INV-051 Seguimiento productos de investigación',
      },
      {
        clave: 'inv-semillero',
        actividad:
          'c. Trabajar en pro de la producción de ideas y proyectos de investigación formativa para ser elaborados con los mismos estudiantes miembros del semillero (Líder de semillero de investigación)',
        fuente: 'CIECYT',
        evidencias:
          'Formato Plan de trabajo\nF-INV-052 Seguimiento de investigación formativa\nF-INV-010 Inscripción para semilleros de investigación\nF-INV-047 Inscripción de estudiantes a semilleros de investigación',
      },
      {
        clave: 'inv-asesor',
        actividad:
          'd. Dirigir y acompañar a los estudiantes en el desarrollo de la modalidad de grado (Asesor de trabajo de grado)',
        fuente: 'CIECYT',
        evidencias: 'F-INV-004 Ficha de seguimiento – asesor trabajos de grado',
      },
      {
        clave: 'inv-evaluador',
        actividad:
          'e. Evalúa, conceptúa y/o califica la propuesta, avances, informes finales y sustentación final de los trabajos de grado presentados por los estudiantes (Evaluador de trabajo de grado)',
        fuente: 'CIECYT',
        evidencias: 'F-INV-002 Rúbrica de viabilización y de seguimiento propuesta de grado',
      },
    ],
    subtotal: {
      titulo: 'SUBTOTAL HORAS SEMANALES (Máximo 10 horas semanales)',
      secciones: ['investigacion'],
      maximo: 10,
    },
  },
  {
    clave: 'extension',
    titulo: '3.1.4 LABOR DE EXTENSIÓN Y PROYECCIÓN SOCIAL',
    texto:
      'Entiéndase por labores de Extensión y proyección social, aquellas orientadas a extender su acción educativa mediante la difusión y promoción del conocimiento científico, tecnológico y de cultura fomentando acciones participativas. Incluyendo también la venta de servicios científico-tecnológicos, artístico, cultural de educación continuada, no formal y las demás designadas por la Ley (Arts. 21, 22 y 31 Estatuto Profesoral)',
    nota: 'Nota: En otras actividades de extensión el número de horas a asignar dependiendo el impacto de la actividad será definido por el consejo académico Art. 31 Estatuto Profesoral',
    conHoras: true,
    actividades: [
      {
        clave: 'ext-continuada',
        actividad: 'Educación continuada',
        fuente: 'Extensión / Facultad',
        evidencias:
          'F-EXT-002 Propuesta programa de educación continua\nF-EXT-003 Solicitud de educación continua\nF-EXT-006 Inscripción a cursos de educación continua\nF-EXT-008 Evaluación de la propuesta de educación continua\nF-EXT-011 Reporte notas programa educación continua',
      },
      {
        clave: 'ext-asesoria',
        actividad: 'Asesoría y Consultoría Externa',
        fuente: '',
        evidencias:
          'F-EXT-013 Inscripción consultoría y asesoría\nF-INV-014 Seguimiento a servicios de consultoría y asesoría',
      },
      {
        clave: 'ext-comunitario',
        actividad: 'Actividades de Servicio Comunitario',
        fuente: 'Facultad / Extensión',
        evidencias: 'F-EXT-012 Proyecto de servicio comunitario',
      },
      {
        clave: 'ext-otras',
        actividad: 'Otras Actividades de Extensión',
        fuente: 'Vicerrectoría Académica / Facultad',
        evidencias:
          'F-PYS-009 Ficha de inscripción feria de emprendimiento\nF-PYS-011 Convocatoria proyectos de proyección social',
        horasTexto: 'Lo define el Consejo Académico',
      },
    ],
    subtotal: {
      titulo: 'SUBTOTAL HORAS SEMANALES (Máximo 10 horas semanales)',
      secciones: ['extension'],
      maximo: 10,
    },
  },
  {
    clave: 'administrativa',
    titulo: '3.1.5 LABOR ACADÉMICO - ADMINISTRATIVA',
    texto:
      'Comprende las actividades que realizan los profesores como apoyo al trabajo administrativo desarrollado en los programas académicos de la institución, además a las que desarrollan como miembro de los órganos de gobierno y dirección de la institución. (Arts. 23, 24 y 32 Estatuto Profesoral)',
    nota: 'Nota: Los profesores tiempo completo podrán ejercer temporalmente funciones académico - administrativas cuando la entidad lo requiera. Art 24. Estatuto profesoral',
    conHoras: true,
    actividades: [
      {
        clave: 'adm-apoyo',
        actividad:
          'Apoyo al trabajo administrativo desarrollado en los programas académicos y coordinaciones académicas de la institución (para docentes que apoyan procesos académico-administrativos)',
        fuente: 'Facultad / Programa',
        evidencias: 'Plan de trabajo e informe de ejecución',
      },
      {
        clave: 'adm-organos',
        actividad:
          'Miembro de los Órganos de Gobierno y Dirección de la institución (Consejo Directivo, Consejo Académico, Consejo de Facultad, Comité Curricular, Comité de Investigación entre otros)',
        fuente: 'Facultad',
        evidencias: 'Resolución de asignación\nActas de reuniones',
      },
      {
        clave: 'adm-consejos',
        actividad: 'Como miembro de consejos asesores, y que por designación rectoral se requiera',
        fuente: 'Coordinación de Aseguramiento de la Calidad',
        evidencias: 'Actas\nResoluciones',
      },
      {
        clave: 'adm-direccion',
        actividad:
          'Funciones de dirección o coordinación de procesos misionales y/o de programas académicos: Decano de facultad, director de programa, director de postgrados, Coordinador de autoevaluación, director de CIECYT o como se denomine en adelante',
        fuente: 'Facultad / Dirección del Programa',
        evidencias: '',
      },
    ],
  },
];

export const RESPONSABILIDADES_AGENDA = [
  'Cumplir con su Asignación Académica correspondiente al semestre',
  'Cumplir con las actividades generales que desarrolla un profesor: planeación, desarrollo y evaluación',
  'Elaborar el informe del cumplimiento de la agenda semanal al finalizar cada semestre y dos informes de seguimiento cada uno al finalizar cada corte académico.',
];

const texto = (max: number) => z.string().trim().max(max).default('');
const horas = z.number().min(0).max(60).nullable().default(null);

export const filaAgendaSchema = z.object({
  horas,
  fuente: texto(300),
  descripcion: texto(2000),
  evidencias: texto(1000),
  observaciones: texto(1000),
});
export type FilaAgenda = z.infer<typeof filaAgendaSchema>;

export const datosAgendaSchema = z.object({
  fechaDiligenciamiento: texto(20),
  dedicacion: z.enum(['MEDIO_TIEMPO', 'TIEMPO_COMPLETO']).nullable().default(null),
  escalafon: z.enum(['AUXILIAR', 'ASISTENTE', 'ASOCIADO', 'TITULAR']).nullable().default(null),
  franjaHoraria: texto(60),
  facultad: texto(200),
  programa: texto(200),
  actividades: z.record(z.string().max(40), filaAgendaSchema).default({}),
  observacionesPlaneacion: texto(3000),
  observacionesEvaluacion: texto(3000),
});
export type DatosAgenda = z.infer<typeof datosAgendaSchema>;

export const sesionCatedraSchema = z.object({
  numero: z.number().int().min(1).max(99).nullable().default(null),
  fecha: texto(40),
  tema: texto(1000),
});

export const datosCatedraSchema = z.object({
  programa: texto(200),
  unidad: texto(200),
  semestre: texto(10),
  horasSemana: z.number().min(0).max(60).nullable().default(null),
  jornada: texto(40),
  expedida: texto(60),
  desde: texto(10),
  hasta: texto(10),
  sesiones: z.array(sesionCatedraSchema).max(40).default([]),
  avancePeriodo: z.number().min(0).max(100).nullable().default(null),
  avanceAcumulado: z.number().min(0).max(100).nullable().default(null),
  horasOrientadas: z.number().min(0).max(500).nullable().default(null),
  horasAusencias: z.number().min(0).max(500).nullable().default(null),
  horasReposicion: z.number().min(0).max(500).nullable().default(null),
  asistenciaPeriodo: z.number().min(0).max(100).nullable().default(null),
  asistenciaAcumulada: z.number().min(0).max(100).nullable().default(null),
  asistenciaEstudiantes: texto(3000),
  reporteNotas: texto(3000),
  anexos: texto(1000),
  fecha: texto(10),
});
export type DatosCatedra = z.infer<typeof datosCatedraSchema>;

/** Horas por sección y subtotales de la agenda. */
export function horasAgenda(d: Pick<DatosAgenda, 'actividades'>) {
  const porSeccion: Record<string, number> = {};
  for (const s of SECCIONES_AGENDA) {
    porSeccion[s.clave] = s.actividades.reduce(
      (t, a) => t + (s.conHoras ? (d.actividades[a.clave]?.horas ?? 0) : 0),
      0,
    );
  }
  const total = Object.values(porSeccion).reduce((t, h) => t + h, 0);
  return { porSeccion, total };
}

/** Alertas del Estatuto Profesoral (no bloquean la entrega; las ve el docente y el revisor). */
export function alertasAgenda(d: DatosAgenda): string[] {
  const { porSeccion, total } = horasAgenda(d);
  const alertas: string[] = [];
  const maximo = d.dedicacion === 'MEDIO_TIEMPO' ? 20 : 40;
  const directa = porSeccion.directa ?? 0;
  if (d.dedicacion && total > maximo) {
    alertas.push(`El total de horas (${total}) supera el máximo de ${maximo} horas semanales.`);
  }
  if (d.dedicacion === 'TIEMPO_COMPLETO' && directa && (directa < 14 || directa > 18)) {
    alertas.push('Tiempo completo: la docencia directa debe estar entre 14 y 18 horas semanales.');
  }
  if (d.dedicacion === 'MEDIO_TIEMPO' && directa && (directa < 10 || directa > 14)) {
    alertas.push('Medio tiempo: la docencia directa debe estar entre 10 y 14 horas semanales.');
  }
  if ((porSeccion.investigacion ?? 0) > 10)
    alertas.push('Investigación supera 10 horas semanales.');
  if ((porSeccion.extension ?? 0) > 10) alertas.push('Extensión supera 10 horas semanales.');
  return alertas;
}
