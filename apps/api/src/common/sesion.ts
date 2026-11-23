import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Rol } from '@rae/shared';
import type { Request } from 'express';

export interface UsuarioSesion {
  id: number;
  rol: Rol;
  /** Debe cambiar la clave en el primer ingreso. */
  pc: boolean;
}

export type RequestConSesion = Request & { usuario?: UsuarioSesion };

export const ES_PUBLICA = 'esPublica';
export const PERMITE_PRIMER_INGRESO = 'permitePrimerIngreso';
export const ROLES = 'roles';

export const Publica = () => SetMetadata(ES_PUBLICA, true);
export const PermitePrimerIngreso = () => SetMetadata(PERMITE_PRIMER_INGRESO, true);
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES, roles);

export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioSesion => {
    const req = ctx.switchToHttp().getRequest<RequestConSesion>();
    return req.usuario as UsuarioSesion;
  },
);
