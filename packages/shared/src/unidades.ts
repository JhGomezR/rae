const ROMANOS: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', V: '5' };

/** Clave para emparejar nombres de unidad escritos de forma distinta. */
export function normalizarNombreUnidad(nombre: string): string {
  const palabras = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((p) => p !== 'LA');
  const ultima = palabras.at(-1);
  if (ultima && palabras.length > 1 && ROMANOS[ultima]) {
    palabras[palabras.length - 1] = ROMANOS[ultima] as string;
  }
  return palabras.join(' ');
}
