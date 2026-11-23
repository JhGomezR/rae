import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Rol } from '@rae/shared';
import {
  ES_PUBLICA,
  PERMITE_PRIMER_INGRESO,
  RequestConSesion,
  ROLES,
  UsuarioSesion,
} from './sesion';

interface CargaJwt {
  sub: number;
  rol: Rol;
  pc: number;
}

/** Autentica por cookie, fuerza el primer ingreso y aplica los roles de cada ruta. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICA, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest<RequestConSesion>();
    const usuario = await this.leerSesion(req);
    req.usuario = usuario;

    const permite = this.reflector.getAllAndOverride<boolean>(PERMITE_PRIMER_INGRESO, objetivos);
    if (usuario.pc && !permite) throw new ForbiddenException('Debes completar el primer ingreso.');

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES, objetivos);
    if (roles && !roles.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes acceso a este recurso.');
    }
    return true;
  }

  private async leerSesion(req: RequestConSesion): Promise<UsuarioSesion> {
    const cookies = req.cookies as Record<string, string | undefined>;
    const token = cookies.access;
    if (!token) throw new UnauthorizedException('Sesión no iniciada.');
    try {
      const carga = await this.jwt.verifyAsync<CargaJwt>(token);
      return { id: carga.sub, rol: carga.rol, pc: carga.pc === 1 };
    } catch {
      throw new UnauthorizedException('Sesión vencida.');
    }
  }
}
