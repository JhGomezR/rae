export type TipoIndicador = 'EFICIENCIA' | 'CALIDAD' | 'GESTION' | 'IMPACTO' | 'LOGRO';
export type EstadoActividad = 'CUMPLIDA' | 'EN_CURSO' | 'ATRASADA' | 'SIN_INICIAR';
export type Semaforo = 'SATISFACTORIO' | 'ACEPTABLE' | 'CRITICO';

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
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const TIPOS: Record<TipoIndicador, string> = {
  EFICIENCIA: 'Eficiencia',
  CALIDAD: 'Calidad',
  GESTION: 'Gestión',
  IMPACTO: 'Impacto',
  LOGRO: 'Logro',
};

export const ESTADOS: Record<EstadoActividad, { nombre: string; color: string }> = {
  CUMPLIDA: { nombre: 'Cumplida', color: 'var(--lv3)' },
  EN_CURSO: { nombre: 'En curso', color: 'var(--lv4)' },
  ATRASADA: { nombre: 'Atrasada', color: 'var(--lv1)' },
  SIN_INICIAR: { nombre: 'Sin iniciar', color: 'var(--pendiente)' },
};

/** Clase del chip por estado y semáforo (colores de niveles del proyecto). */
export const CHIP_ESTADO: Record<EstadoActividad, string> = {
  CUMPLIDA: 'chip chip-nivel lv3',
  EN_CURSO: 'chip chip-nivel lv4',
  ATRASADA: 'chip chip-nivel lv1',
  SIN_INICIAR: 'chip',
};
export const SEMAFOROS: Record<Semaforo, { nombre: string; clase: string; rango: string }> = {
  SATISFACTORIO: { nombre: 'Satisfactorio', clase: 'chip chip-nivel lv3', rango: '90 % o más' },
  ACEPTABLE: { nombre: 'Aceptable', clase: 'chip chip-nivel lv2', rango: '70 % a 89 %' },
  CRITICO: { nombre: 'Crítico', clase: 'chip chip-nivel lv1', rango: 'menos de 70 %' },
};

export interface ResumenPoa {
  id: number;
  vigencia: number;
  responsable: string;
  cargo: string;
  dependencia: string;
  activo: boolean;
  actividades: number;
  avance: number;
  indice: number;
  semaforo: Semaforo;
}

export interface Seguimiento {
  id: number;
  mes: number;
  avance: number;
  logro: string;
  evidencia: string | null;
  ejecutado: number | null;
}

export interface Actividad {
  id: number;
  numero: number;
  ejePgr: string;
  ejePdi: string;
  programaPdi: string;
  subprograma: string;
  proyecto: string;
  metaVigencia: number | null;
  indicadorPdi: string;
  actividad: string;
  tipoIndicador: TipoIndicador | null;
  indicadorActividad: string;
  interpretacion: string | null;
  responsableEjecucion: string;
  meses: number[];
  presupuesto: number | null;
  observaciones: string | null;
  activo: boolean;
  seguimientos: Seguimiento[];
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
  porActividad: {
    id: number;
    numero: number;
    actividad: string;
    esperado: number;
    avance: number;
    estado: EstadoActividad;
    ultimoLogro: string | null;
    ejecutado: number;
  }[];
  porPilar: Grupo[];
  porTipo: Grupo[];
  porResponsable: Grupo[];
  porMes: { mes: number; programadas: number; esperado: number; avance: number | null }[];
}

export interface DetallePoa {
  id: number;
  vigencia: number;
  fechaElaboracion: string;
  dependencia: string;
  areaFacultad: string;
  responsable: string;
  cargo: string;
  activo: boolean;
  actividades: Actividad[];
  inactivas: { id: number; numero: number; actividad: string }[];
  desempeno: Desempeno;
}

export const pesos = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const pctPoa = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
