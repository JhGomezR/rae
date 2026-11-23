import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';

/** Valida el cuerpo o la consulta con un esquema Zod. */
export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly esquema: S) {}

  transform(valor: unknown): z.output<S> {
    const r = this.esquema.safeParse(valor);
    if (r.success) return r.data as z.output<S>;
    throw new BadRequestException({
      message: r.error.issues[0]?.message ?? 'Datos inválidos.',
      detalles: r.error.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message })),
    });
  }
}
