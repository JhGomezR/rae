import { z } from 'zod';

export const documentoSchema = z
  .string()
  .trim()
  .regex(/^\d{5,20}$/, 'Escribe solo los números de tu documento.');

export const loginSchema = z.object({
  documento: documentoSchema,
  clave: z.string().min(1, 'Escribe tu contraseña.').max(200),
});

/** Primer ingreso: la clave nueva no puede contener el documento. */
export const primerIngresoSchema = z
  .object({
    documento: documentoSchema,
    claveNueva: z.string().min(8, 'Usa al menos 8 caracteres.').max(200),
    email: z.string().trim().toLowerCase().email('Escribe un correo válido.').max(150),
  })
  .refine((x) => !x.claveNueva.includes(x.documento), {
    message: 'La contraseña no puede contener tu documento.',
    path: ['claveNueva'],
  });
