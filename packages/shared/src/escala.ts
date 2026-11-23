/** Escala institucional del nivel de logro (igual a las matrices de seguimiento). */
export const NIVELES = [
  { valor: 1, clave: 'bajo', nombre: 'Bajo', min: 0, max: 59.99 },
  { valor: 2, clave: 'basico', nombre: 'Básico', min: 60, max: 74.99 },
  { valor: 3, clave: 'alto', nombre: 'Alto', min: 75, max: 89.99 },
  { valor: 4, clave: 'superior', nombre: 'Superior', min: 90, max: 100 },
] as const;

export type Nivel = (typeof NIVELES)[number];
export type ValorNivel = Nivel['valor'];

/** Nivel correspondiente a un porcentaje de logro (0–100). */
export function nivelDePct(pct: number): Nivel {
  if (pct >= 90) return NIVELES[3];
  if (pct >= 75) return NIVELES[2];
  if (pct >= 60) return NIVELES[1];
  return NIVELES[0];
}
