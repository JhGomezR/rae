import { TipoIndicadorPoa } from '@prisma/client';

export const MESES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];
export const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Nombre e interpretación de cada tipo de indicador, como en el instructivo del F-PIN-001. */
export const TIPOS_INDICADOR: Record<TipoIndicadorPoa, { nombre: string; interpretacion: string }> =
  {
    EFICIENCIA: {
      nombre: 'Eficiencia',
      interpretacion:
        'Mide la relación entre los recursos utilizados y los resultados obtenidos en la actividad.',
    },
    CALIDAD: {
      nombre: 'Calidad',
      interpretacion:
        'Evalúa el grado de cumplimiento de estándares o criterios de excelencia en la actividad.',
    },
    GESTION: {
      nombre: 'Gestión',
      interpretacion:
        'Analiza la efectividad en la planificación, coordinación y ejecución de la actividad.',
    },
    IMPACTO: {
      nombre: 'Impacto',
      interpretacion:
        'Valora los cambios o transformaciones significativas, generalmente a mediano o largo plazo, generadas por la actividad.',
    },
    LOGRO: {
      nombre: 'Logro',
      interpretacion:
        'Determina el nivel de cumplimiento de los objetivos establecidos para la actividad.',
    },
  };

export type EstadoActividad = 'CUMPLIDA' | 'EN_CURSO' | 'ATRASADA' | 'SIN_INICIAR';

export const ESTADOS: Record<EstadoActividad, string> = {
  CUMPLIDA: 'Cumplida',
  EN_CURSO: 'En curso',
  ATRASADA: 'Atrasada',
  SIN_INICIAR: 'Sin iniciar',
};

export type Semaforo = 'SATISFACTORIO' | 'ACEPTABLE' | 'CRITICO';

export const SEMAFOROS: Record<Semaforo, { nombre: string; rango: string }> = {
  SATISFACTORIO: { nombre: 'Satisfactorio', rango: '90 % o más' },
  ACEPTABLE: { nombre: 'Aceptable', rango: 'entre 70 % y 89 %' },
  CRITICO: { nombre: 'Crítico', rango: 'menos de 70 %' },
};

/** Datos mínimos de una actividad para calcular su desempeño. */
export interface ActividadCalculo {
  id: number;
  numero: number;
  ejePgr: string;
  actividad: string;
  tipoIndicador: TipoIndicadorPoa | null;
  responsableEjecucion: string;
  meses: number[];
  presupuesto: number | null;
  seguimientos: { mes: number; avance: number; logro: string; ejecutado: number | null }[];
}

export interface DesempenoActividad {
  id: number;
  numero: number;
  actividad: string;
  esperado: number;
  avance: number;
  estado: EstadoActividad;
  ultimoLogro: string | null;
  ejecutado: number;
}

export interface Grupo {
  clave: string;
  actividades: number;
  esperado: number;
  avance: number;
}

export interface Desempeno {
  mesCorte: number;
  actividades: number;
  esperado: number;
  avance: number;
  indice: number;
  semaforo: Semaforo;
  estados: Record<EstadoActividad, number>;
  presupuesto: number;
  ejecutado: number;
  porActividad: DesempenoActividad[];
  porPilar: Grupo[];
  porTipo: Grupo[];
  porResponsable: Grupo[];
  /** Por mes: actividades programadas, avance esperado y real acumulados (null en meses futuros). */
  porMes: { mes: number; programadas: number; esperado: number; avance: number | null }[];
}
