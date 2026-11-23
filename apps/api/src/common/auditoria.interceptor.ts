import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Rol } from '@rae/shared';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { RequestConSesion } from './sesion';

/** Registra cada mutación del administrador, sin guardar el cuerpo (puede tener datos personales). */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<RequestConSesion>();
    if (req.method === 'GET') return next.handle();
    return next.handle().pipe(
      tap(() => {
        if (req.usuario?.rol !== Rol.ADMIN) return;
        const params = req.params as Record<string, string | undefined>;
        const ruta = req.path.replace(/^\/api\//, '');
        this.prisma.auditoria
          .create({
            data: {
              usuarioId: req.usuario.id,
              accion: `${req.method} ${ruta}`.slice(0, 120),
              entidad: (ruta.split('/')[0] ?? 'sistema').slice(0, 60),
              entidadId: params.id ?? null,
              ip: req.ip?.slice(0, 60) ?? null,
            },
          })
          .catch((e: unknown) => this.logger.error(`No se pudo auditar: ${String(e)}`));
      }),
    );
  }
}
