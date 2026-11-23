export const CLAVES_INFORME = ['021', '022', '023'] as const;
export type ClaveInforme = (typeof CLAVES_INFORME)[number];

export const ARCHIVOS_INFORME: Record<ClaveInforme, string> = {
  '021': '021 - Integralidad, Flexibilidad e Interdisciplinariedad',
  '022': '022 - Evaluación estrategias pedagógicas',
  '023': '023 - RA y Competencias',
};

export interface FilaBarras {
  etiqueta: string;
  valores: (number | null)[];
}

export type Bloque =
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'tabla'; columnas: string[]; filas: string[][] }
  | {
      tipo: 'barras';
      titulo: string;
      series: string[];
      maximo: number;
      unidad: string;
      filas: FilaBarras[];
    };

export interface Kpi {
  titulo: string;
  valor: string;
  nota?: string;
}

export interface AjustesInforme {
  programa?: string;
  lugar?: string;
  fechaEntrega?: string;
  porcentaje?: number;
  analisis?: string;
  logros?: string;
  impactos?: string;
  presupuesto?: string;
  anexos?: string;
}

export interface Informe {
  clave: ClaveInforme;
  titulo: string;
  caracteristicas: string;
  meta: string;
  periodo: string;
  kpis: Kpi[];
  bloques: Bloque[];
  programa: string;
  lugar: string;
  fechaEntrega: string;
  porcentaje: number;
  logros: string[];
  impactos: string[];
  presupuesto: string;
  anexos: string;
  ajustes: AjustesInforme;
}

export interface Firmante {
  nombre: string;
  cargo: string;
  firma?: { datos: Buffer; tipo: 'image/png' | 'image/jpeg' };
}

/** Partes de la plantilla que no vienen del sistema, para repetirlas en el PDF. */
export interface TextoPlantilla {
  aspecto: string;
  accion: string;
  caracteristicas: string[];
}

export const TEXTOS_PLANTILLA: Record<ClaveInforme, TextoPlantilla> = {
  '021': {
    caracteristicas: [
      'Característica 18. Integralidad de los aspectos curriculares.',
      'Característica 19. Flexibilidad de los aspectos curriculares.',
      'Característica 20. Interdisciplinariedad.',
    ],
    aspecto:
      'Evaluación de la integralidad, flexibilidad e interdisciplinariedad del currículo a partir de la implementación del nuevo plan de estudios y sus syllabus en el 2026.',
    accion:
      'Realizar evaluaciones diagnósticas y posteriores a las acciones realizadas por el programa sobre la integralidad, flexibilidad e interdisciplinariedad del currículo.',
  },
  '022': {
    caracteristicas: ['Característica 21. Estrategias pedagógicas.'],
    aspecto: 'Evaluación de las estrategias pedagógicas.',
    accion:
      'Implementar un sistema sistemático de seguimiento y evaluación de las estrategias pedagógicas establecidas en el PEP, a través de mediciones periódicas de su impacto en el aprendizaje, con el fin de optimizar su aplicación y fortalecer la calidad académica del programa, haciendo uso de las rúbricas de evaluación.',
  },
  '023': {
    caracteristicas: [
      'Característica 22. Sistema de evaluación de estudiantes.',
      'Característica 23. Resultados de aprendizaje.',
      'Característica 24. Competencias.',
    ],
    aspecto:
      'Mejoramiento del proceso de evaluación a nivel del programa (PEP) con fines de retroalimentación de los RA y Competencias.',
    accion:
      'A partir del 2026, realizar seguimiento y retroalimentación continua sobre los Resultados de Aprendizaje (RA) y las Competencias del programa.',
  },
};
