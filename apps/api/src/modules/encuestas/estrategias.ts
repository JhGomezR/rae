import {
  INSTRUMENTOS,
  itemAlcanceDocente,
  itemAlcanceEstudiante,
  itemApreciacion,
  Momento,
  Rol,
} from '@rae/shared';

export interface RespuestaCruda {
  nivel?: unknown;
  evaluados?: unknown;
  alcanzan?: unknown;
  evidencia?: unknown;
  instrumento?: unknown;
  opcionElegida?: unknown;
}

export interface DatosItem {
  nivel?: number;
  evaluados?: number;
  alcanzan?: number;
  evidencia?: string;
  instrumento?: string;
  opcionElegida?: number;
}

export interface EstrategiaEncuesta {
  /** Devuelve los datos válidos o null si el ítem está incompleto. */
  validar(itemId: number, r: RespuestaCruda, totalOpciones: number): DatosItem | null;
}

const opcionValida = (o: number | undefined, total: number) =>
  total === 0 || (o !== undefined && o >= 0 && o < total);

class ApreciacionStrategy implements EstrategiaEncuesta {
  validar(itemId: number, r: RespuestaCruda): DatosItem | null {
    const p = itemApreciacion.safeParse({ itemId, nivel: r.nivel });
    return p.success ? { nivel: p.data.nivel } : null;
  }
}

class AlcanceEstudianteStrategy implements EstrategiaEncuesta {
  validar(itemId: number, r: RespuestaCruda, total: number): DatosItem | null {
    const opcionElegida = total === 0 ? 0 : r.opcionElegida;
    const p = itemAlcanceEstudiante.safeParse({ itemId, nivel: r.nivel, opcionElegida });
    if (!p.success || !opcionValida(p.data.opcionElegida, total)) return null;
    return { nivel: p.data.nivel, ...(total ? { opcionElegida: p.data.opcionElegida } : {}) };
  }
}

class AlcanceDocenteStrategy implements EstrategiaEncuesta {
  validar(itemId: number, r: RespuestaCruda, total: number): DatosItem | null {
    const p = itemAlcanceDocente.safeParse({
      itemId,
      evidencia: r.evidencia || undefined,
      instrumento: r.instrumento || undefined,
      evaluados: r.evaluados,
      alcanzan: r.alcanzan,
      opcionElegida: total === 0 ? 0 : r.opcionElegida,
    });
    if (!p.success || !opcionValida(p.data.opcionElegida, total)) return null;
    const { evaluados, alcanzan, evidencia, instrumento, opcionElegida } = p.data;
    return {
      evaluados,
      alcanzan,
      ...(evidencia ? { evidencia } : {}),
      ...(instrumento ? { instrumento } : {}),
      ...(total ? { opcionElegida } : {}),
    };
  }
}

const apreciacion = new ApreciacionStrategy();
const alcanceEstudiante = new AlcanceEstudianteStrategy();
const alcanceDocente = new AlcanceDocenteStrategy();

export function estrategiaPara(rol: Rol, momento: Momento): EstrategiaEncuesta {
  if (momento === Momento.APRECIACION) return apreciacion;
  return rol === Rol.DOCENTE ? alcanceDocente : alcanceEstudiante;
}

const entero = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;

/** Borrador: conserva solo los campos bien formados, aunque el ítem esté incompleto. */
export function limpiarBorrador(r: RespuestaCruda, totalOpciones: number): DatosItem {
  const instrumento = INSTRUMENTOS.find((i) => i === r.instrumento);
  const evidencia = typeof r.evidencia === 'string' ? r.evidencia.trim().slice(0, 500) : '';
  const datos: DatosItem = {
    nivel: entero(r.nivel, 1, 4),
    evaluados: entero(r.evaluados, 0, 100_000),
    alcanzan: entero(r.alcanzan, 0, 100_000),
    opcionElegida: totalOpciones ? entero(r.opcionElegida, 0, totalOpciones - 1) : undefined,
    ...(instrumento ? { instrumento } : {}),
    ...(evidencia ? { evidencia } : {}),
  };
  return datos;
}
