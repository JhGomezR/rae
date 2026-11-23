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
      filas: { etiqueta: string; valores: (number | null)[] }[];
    };

export interface Ajustes {
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
  clave: '021' | '022' | '023';
  titulo: string;
  caracteristicas: string;
  meta: string;
  periodo: string;
  kpis: { titulo: string; valor: string; nota?: string }[];
  bloques: Bloque[];
  programa: string;
  lugar: string;
  fechaEntrega: string;
  porcentaje: number;
  logros: string[];
  impactos: string[];
  presupuesto: string;
  anexos: string;
  ajustes: Ajustes;
}

export interface Configuracion {
  nombre: string;
  cargo: string;
  tieneFirma: boolean;
}
