export interface Opcion {
  indice: number;
  texto: string;
}
export interface ItemEncuesta {
  id: number;
  frase: string;
  textoSyllabus: string;
  pregunta: { id: number; enunciado: string; opciones: Opcion[] } | null;
}
export interface Grupo {
  codigo: string | null;
  titulo: string;
  items: ItemEncuesta[];
}
export interface SeccionEncuesta {
  seccion: 'OBJETIVO' | 'GENERICA' | 'ESPECIFICA' | 'RAE';
  grupos: Grupo[];
}
export interface Respuesta {
  nivel?: number;
  evaluados?: number;
  alcanzan?: number;
  evidencia?: string;
  instrumento?: string;
  opcionElegida?: number;
}
export type General = Record<string, string | number | undefined>;
export interface EstadoSeguimiento {
  id: number;
  texto: string;
  estado: 'APLICADA' | 'PARCIAL' | 'NO_APLICADA' | null;
}
export interface Encuesta {
  curso: {
    id: number;
    unidad: string;
    semestre: number;
    grupo: string;
    sede: string;
    periodo: string;
  };
  rol: 'DOCENTE' | 'ESTUDIANTE';
  momento: 'APRECIACION' | 'ALCANCE';
  abierto: boolean;
  estado: 'PENDIENTE' | 'BORRADOR' | 'ENVIADA';
  secciones: SeccionEncuesta[];
  general: General;
  respuestas: Record<string, Respuesta>;
  estrategiasCatalogo: { id: number; tipo: 'DIDACTICA' | 'ACTIVA'; nombre: string }[];
  estrategias: number[];
  recomendacionesPrevias: EstadoSeguimiento[];
  recomendaciones: string[];
}
