import { z } from 'zod';
import { Momento, Rol } from '../enums';

const likert = z.number().int().min(1).max(5).optional();
const siNo = z.union([z.literal(0), z.literal(1)]).optional();
const texto = z.string().trim().max(1000).optional();
const conteo = z.number().int().min(0).optional();

const caracteristicas = {
  integralidad: likert,
  flexibilidad: likert,
  interdisciplinariedad: likert,
};

export const generalEstudianteApreciacion = z
  .object({
    acuerdoPedagogico: siNo,
    claridad: likert,
    relevancia: likert,
    expectativas: texto,
    ...caracteristicas,
  })
  .strict();

export const generalDocenteApreciacion = z
  .object({ matriculados: conteo, estrategiasTexto: texto, ...caracteristicas })
  .strict();

export const generalEstudianteAlcance = z
  .object({
    expectativasCumplidas: likert,
    efectividadEstrategias: likert,
    evaluacionCoherente: likert,
    retroalimentacion: likert,
    observaciones: texto,
    ...caracteristicas,
  })
  .strict();

export const generalDocenteAlcance = z
  .object({
    evaluados: conteo,
    efectividadEstrategias: likert,
    retroalimentacionRa: siNo,
    observaciones: texto,
    ...caracteristicas,
  })
  .strict();

/** Esquema del campo `Encuesta.general` según rol y momento. */
export function esquemaGeneral(rol: Exclude<Rol, 'ADMIN'>, momento: Momento) {
  if (rol === Rol.ESTUDIANTE) {
    return momento === Momento.APRECIACION
      ? generalEstudianteApreciacion
      : generalEstudianteAlcance;
  }
  return momento === Momento.APRECIACION ? generalDocenteApreciacion : generalDocenteAlcance;
}
