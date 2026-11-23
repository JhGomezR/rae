import { z } from 'zod';

export const periodoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{4}-[12]$/, 'Usa el formato 2026-2.'),
  apreciacionCierra: z.coerce.date().optional(),
  alcanceCierra: z.coerce.date().optional(),
});
