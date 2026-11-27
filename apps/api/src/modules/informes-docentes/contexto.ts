import type { EstadoInformeDocente, Vinculacion } from '@rae/shared';

/** Lo que necesitan los documentos además de los datos que diligencia el docente. */
export interface ContextoInforme {
  docente: { nombre: string; documento: string; vinculacion: Vinculacion | null };
  periodo: { codigo: string; numero: number };
  estado: EstadoInformeDocente;
  observacion: string | null;
  firmantes: { decano: string; vicerrector: string; director: string };
}

export interface EncabezadoFormato {
  codigo: string;
  version: string;
  fecha: string;
  titulo: string;
}

export const FORMATO_AGENDA: EncabezadoFormato = {
  codigo: 'F-DOC-056',
  version: '03',
  fecha: '09-12-2025',
  titulo: 'AGENDA SEMANAL DOCENTE',
};

export const FORMATO_EJECUCION: EncabezadoFormato = {
  codigo: 'F-DOC-004',
  version: '03',
  fecha: '18-03-2026',
  titulo: 'INFORME DE EJECUCIÓN DE LA AGENDA SEMANAL DOCENTE',
};

export const FORMATO_CATEDRA: EncabezadoFormato = {
  codigo: 'F-DOC-047',
  version: '02',
  fecha: '12-08-2025',
  titulo: 'INFORME DOCENCIA',
};

/** Periodo académico del formato: A (primer semestre) o B (segundo). */
export const letraPeriodo = (numero: number) => (numero === 1 ? 'A' : 'B');

const MESES = [
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

/** «2025-09-01» → «1 de septiembre de 2025». */
export function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1] ?? ''} de ${m[1]}`;
}

/** «2025-09-30» → «30-09-2025». */
export function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

export const numeroTexto = (n: number | null | undefined, sufijo = '') =>
  n === null || n === undefined ? '' : `${n.toLocaleString('es-CO')}${sufijo}`;
