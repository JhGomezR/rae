/**
 * Orden estable de opciones por persona e ítem (FNV-1a + Fisher-Yates).
 * Devuelve los índices originales en el orden en que se muestran.
 */
export function ordenOpciones(n: number, semilla: string): number[] {
  let h = 2166136261;
  for (const ch of semilla) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    const temporal = indices[i] as number;
    indices[i] = indices[j] as number;
    indices[j] = temporal;
  }
  return indices;
}
