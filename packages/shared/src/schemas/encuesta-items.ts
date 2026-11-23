import { z } from 'zod';
import { INSTRUMENTOS } from '../enums';

const nivel = z.number().int().min(1).max(4);
const opcion = z.number().int().min(0);

export const itemApreciacion = z.object({ itemId: z.number().int(), nivel }).strict();

export const itemAlcanceEstudiante = z
  .object({ itemId: z.number().int(), nivel, opcionElegida: opcion })
  .strict();

export const itemAlcanceDocente = z
  .object({
    itemId: z.number().int(),
    evidencia: z.string().trim().max(500).optional(),
    instrumento: z.enum(INSTRUMENTOS).optional(),
    evaluados: z.number().int().min(0),
    alcanzan: z.number().int().min(0),
    opcionElegida: opcion,
  })
  .strict()
  .refine((x) => x.alcanzan <= x.evaluados, {
    message: 'Quienes alcanzan el resultado no pueden superar a los evaluados.',
    path: ['alcanzan'],
  });
