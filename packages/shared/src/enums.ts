/** Enumeraciones del dominio; los valores coinciden con los enums de Prisma. */
export const Rol = { ADMIN: 'ADMIN', DOCENTE: 'DOCENTE', ESTUDIANTE: 'ESTUDIANTE' } as const;
export type Rol = (typeof Rol)[keyof typeof Rol];

export const Momento = { APRECIACION: 'APRECIACION', ALCANCE: 'ALCANCE' } as const;
export type Momento = (typeof Momento)[keyof typeof Momento];

export const EstadoEncuesta = { BORRADOR: 'BORRADOR', ENVIADA: 'ENVIADA' } as const;
export type EstadoEncuesta = (typeof EstadoEncuesta)[keyof typeof EstadoEncuesta];

export const TipoCompetencia = { GENERICA: 'GENERICA', ESPECIFICA: 'ESPECIFICA' } as const;
export type TipoCompetencia = (typeof TipoCompetencia)[keyof typeof TipoCompetencia];

export const Seccion = {
  OBJETIVO: 'OBJETIVO',
  GENERICA: 'GENERICA',
  ESPECIFICA: 'ESPECIFICA',
  RAE: 'RAE',
} as const;
export type Seccion = (typeof Seccion)[keyof typeof Seccion];

export const TipoItem = {
  OBJETIVO: 'OBJETIVO',
  RA: 'RA',
  COMPETENCIA: 'COMPETENCIA',
  RAE: 'RAE',
} as const;
export type TipoItem = (typeof TipoItem)[keyof typeof TipoItem];

export const NivelPregunta = { ESTUDIANTE: 'ESTUDIANTE', DOCENTE: 'DOCENTE' } as const;
export type NivelPregunta = (typeof NivelPregunta)[keyof typeof NivelPregunta];

export const Ciclo = { TECNOLOGICO: 'TECNOLOGICO', PROFESIONAL: 'PROFESIONAL' } as const;
export type Ciclo = (typeof Ciclo)[keyof typeof Ciclo];

export const TipoEstrategia = { DIDACTICA: 'DIDACTICA', ACTIVA: 'ACTIVA' } as const;
export type TipoEstrategia = (typeof TipoEstrategia)[keyof typeof TipoEstrategia];

export const EstadoRecomendacion = {
  APLICADA: 'APLICADA',
  PARCIAL: 'PARCIAL',
  NO_APLICADA: 'NO_APLICADA',
} as const;
export type EstadoRecomendacion = (typeof EstadoRecomendacion)[keyof typeof EstadoRecomendacion];

export const INSTRUMENTOS = [
  'Rúbrica',
  'Lista de chequeo',
  'Examen escrito',
  'Proyecto / ABP',
  'Taller práctico',
  'Sustentación oral',
  'Informe técnico',
  'Portafolio',
  'Otro',
] as const;

/** Texto único para secciones vacías; nunca menciona al administrador. */
export const SIN_DATOS = 'No existen datos para esta sección.';
