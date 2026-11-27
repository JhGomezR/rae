import { z } from 'zod';

/**
 * Programador de clases (F-DOC-052): lo diligencian todos los docentes, sin excepción,
 * por cada unidad de formación (curso) que orientan en el periodo académico.
 */
const texto = (max: number) => z.string().trim().max(max).default('');

/** Semanas del semestre que trae el formato por defecto. */
export const SEMANAS_PROGRAMADOR = 16;
export const MAX_SEMANAS_PROGRAMADOR = 24;

export const semanaProgramadorSchema = z.object({
  semana: z.number().int().min(1).max(MAX_SEMANAS_PROGRAMADOR),
  contenidos: texto(1500),
  didacticas: texto(600),
  individuales: texto(800),
  grupales: texto(800),
  recursos: texto(600),
  observaciones: texto(600),
});
export type SemanaProgramador = z.infer<typeof semanaProgramadorSchema>;

export const datosProgramadorSchema = z.object({
  facultad: texto(200),
  programa: texto(200),
  unidad: texto(200),
  grupo: texto(10),
  creditos: z.number().int().min(0).max(20).nullable().default(null),
  horasSemana: z.number().min(0).max(60).nullable().default(null),
  objetivo: texto(3000),
  semanas: z.array(semanaProgramadorSchema).max(MAX_SEMANAS_PROGRAMADOR).default([]),
  /** Fecha de elaboración (AAAA-MM-DD). */
  fecha: texto(10),
});
export type DatosProgramador = z.infer<typeof datosProgramadorSchema>;

export const semanaVacia = (semana: number): SemanaProgramador => ({
  semana,
  contenidos: '',
  didacticas: '',
  individuales: '',
  grupales: '',
  recursos: '',
  observaciones: '',
});

/** Completa: contenidos, didáctica, alguna evidencia (individual o grupal) y recursos. */
export const semanaCompleta = (s: SemanaProgramador) =>
  !!(s.contenidos && s.didacticas && (s.individuales || s.grupales) && s.recursos);

export const semanaConDatos = (s: SemanaProgramador) =>
  !!(s.contenidos || s.didacticas || s.individuales || s.grupales || s.recursos || s.observaciones);

/** Datos del curso que exige el encabezado del formato. */
export const cursoProgramadorCompleto = (d: DatosProgramador) =>
  !!(d.facultad && d.programa && d.unidad && d.horasSemana && d.objetivo);

/** Sugerencias para «Didácticas pedagógicas en aula» (el docente puede escribir otras). */
export const DIDACTICAS_SUGERIDAS = [
  'Clase magistral participativa',
  'Teórico–práctica',
  'Taller práctico',
  'Estudio de caso',
  'Aprendizaje basado en problemas',
  'Aprendizaje basado en proyectos',
  'Debate guiado',
  'Conversatorio',
  'Gamificación',
  'Laboratorio',
  'Exposiciones orales y foros',
  'Salida académica',
  'Evaluación teórico–práctica',
];

export const RECURSOS_SUGERIDOS = [
  'Diapositivas',
  'Proyector',
  'Computadores',
  'Herramientas ofimáticas',
  'Guías de trabajo',
  'Artículos y videos',
  'Plataforma virtual',
  'Laboratorio',
  'Pizarra',
];
