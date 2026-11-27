import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '@prisma/client';
import { normalizarClave } from '@rae/shared';
import * as argon2 from 'argon2';
import { env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PermisosService } from '../acceso/permisos.service';
import { AuditoriaService, ContextoPeticion } from '../auditoria/auditoria.service';

/** Intentos fallidos permitidos antes de bloquear 15 minutos (login y cambio de clave). */
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const ERROR_LOGIN = 'Documento o contraseña incorrectos.';

const avisoRestantes = (restantes: number) =>
  restantes === 0
    ? ' Alcanzaste el máximo de intentos: espera 15 minutos.'
    : restantes <= 2
      ? ` Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`} antes de un bloqueo de 15 minutos.`
      : '';

const demasiados = (minutos: number) =>
  new HttpException(
    `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`,
    HttpStatus.TOO_MANY_REQUESTS,
  );

export interface Tokens {
  access: string;
  refresh: string;
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export const perfil = (u: Usuario) => ({
  id: u.id,
  documento: u.documento,
  nombre: u.nombreCompleto,
  rol: u.rol,
  email: u.email,
  debeCambiarClave: u.debeCambiarClave,
  vinculacion: u.vinculacion,
});

@Injectable()
export class AuthService {
  private hashFicticio?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auditoria: AuditoriaService,
    private readonly acceso: PermisosService,
  ) {}

  async login(documento: string, clave: string, ctx: ContextoPeticion = {}) {
    const usuario = await this.prisma.usuario.findUnique({ where: { documento } });
    const auditar = (detalle: string) =>
      this.auditoria.sesion('LOGIN_FALLIDO', ctx, { usuarioId: usuario?.id, documento, detalle });
    const fallo = async (detalle: string): Promise<never> => {
      const restantes = await this.registrarFallo(documento);
      await auditar(`${detalle} (intento ${MAX_INTENTOS - restantes} de ${MAX_INTENTOS})`);
      throw new UnauthorizedException(ERROR_LOGIN + avisoRestantes(restantes));
    };
    const espera = await this.minutosBloqueo(documento);
    if (espera) {
      await auditar('Bloqueado por intentos fallidos');
      throw demasiados(espera);
    }
    if (!usuario || !usuario.activo) {
      // Mismo costo que una verificación real, para no revelar si el documento existe.
      this.hashFicticio ??= await argon2.hash(randomBytes(16).toString('hex'));
      await argon2.verify(this.hashFicticio, clave);
      return fallo(usuario ? 'Usuario inactivo' : 'Documento no registrado');
    }
    const escrita = usuario.debeCambiarClave ? normalizarClave(clave) : clave;
    if (!(await argon2.verify(usuario.passwordHash, escrita))) {
      return fallo('Contraseña incorrecta');
    }
    await this.prisma.intentoLogin.deleteMany({ where: { documento } });
    const actualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoIngreso: new Date() },
    });
    await this.auditoria.sesion('LOGIN', ctx, { usuarioId: actualizado.id, documento });
    return { usuario: perfil(actualizado), tokens: await this.emitir(actualizado) };
  }

  /** Rota el token; si llega uno ya usado, revoca todas las sesiones del usuario. */
  async refrescar(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Sesión vencida.');
    const guardado = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: true },
    });
    if (!guardado) throw new UnauthorizedException('Sesión vencida.');
    if (guardado.revocadoEn) {
      await this.revocarTodos(guardado.usuarioId);
      throw new UnauthorizedException('Sesión vencida.');
    }
    if (guardado.expiraEn < new Date() || !guardado.usuario.activo) {
      throw new UnauthorizedException('Sesión vencida.');
    }
    await this.prisma.refreshToken.update({
      where: { id: guardado.id },
      data: { revocadoEn: new Date() },
    });
    return { usuario: perfil(guardado.usuario), tokens: await this.emitir(guardado.usuario) };
  }

  async logout(
    token: string | undefined,
    ctx: ContextoPeticion = {},
    porInactividad = false,
  ): Promise<void> {
    if (!token) return;
    const sesion = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: { select: { documento: true } } },
    });
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    if (sesion) {
      await this.auditoria.sesion(porInactividad ? 'CIERRE_INACTIVIDAD' : 'LOGOUT', ctx, {
        usuarioId: sesion.usuarioId,
        documento: sesion.usuario.documento,
        detalle: porInactividad ? '15 minutos sin actividad' : undefined,
      });
    }
  }

  async primerIngreso(
    usuarioId: number,
    claveNueva: string,
    email: string,
    ctx: ContextoPeticion = {},
  ) {
    const enUso = await this.prisma.usuario.findFirst({
      where: { email, NOT: { id: usuarioId } },
      select: { id: true },
    });
    if (enUso) throw new ConflictException('Ese correo ya está registrado.');
    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { passwordHash: await argon2.hash(claveNueva), email, debeCambiarClave: false },
    });
    await this.revocarTodos(usuarioId);
    await this.auditoria.sesion('PRIMER_INGRESO', ctx, { usuarioId, documento: usuario.documento });
    return { usuario: perfil(usuario), tokens: await this.emitir(usuario) };
  }

  async yo(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || !u.activo) throw new UnauthorizedException('Sesión vencida.');
    // El menú se arma con el rol y los permisos efectivos (RBAC).
    const a = await this.acceso.de(id);
    return { ...perfil(u), rolNombre: a.rol.nombre, permisos: [...a.permisos] };
  }

  async cambiarClave(
    id: number,
    actual: string,
    nueva: string,
    ctx: ContextoPeticion = {},
  ): Promise<void> {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id } });
    const clave = `clave:${id}`;
    const espera = await this.minutosBloqueo(clave);
    if (espera) throw demasiados(espera);
    if (!(await argon2.verify(u.passwordHash, actual))) {
      const restantes = await this.registrarFallo(clave);
      throw new UnauthorizedException(
        'La contraseña actual no es correcta.' + avisoRestantes(restantes),
      );
    }
    await this.prisma.intentoLogin.deleteMany({ where: { documento: clave } });
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash: await argon2.hash(nueva) },
    });
    await this.revocarTodos(id);
    await this.auditoria.sesion('CAMBIO_CLAVE', ctx, { usuarioId: id, documento: u.documento });
  }

  private async emitir(u: Usuario): Promise<Tokens> {
    const access = await this.jwt.signAsync({
      sub: u.id,
      rol: u.rol,
      pc: u.debeCambiarClave ? 1 : 0,
    });
    const refresh = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        usuarioId: u.id,
        tokenHash: hashToken(refresh),
        // Ventana deslizante: cada renovación por actividad la extiende; sin actividad, vence.
        expiraEn: new Date(Date.now() + env.SESION_INACTIVIDAD_MIN * 60_000),
      },
    });
    return { access, refresh };
  }

  private async revocarTodos(usuarioId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  /** Minutos que faltan para desbloquear (0 si no está bloqueado). La clave es el documento o `clave:<id>`. */
  private async minutosBloqueo(documento: string): Promise<number> {
    const r = await this.prisma.intentoLogin.findUnique({ where: { documento } });
    if (!r) return 0;
    const transcurrido = Date.now() - r.desde.getTime();
    if (transcurrido > VENTANA_MS) {
      await this.prisma.intentoLogin.deleteMany({ where: { documento } });
      return 0;
    }
    return r.total >= MAX_INTENTOS
      ? Math.max(1, Math.ceil((VENTANA_MS - transcurrido) / 60_000))
      : 0;
  }

  /** Suma un intento fallido y devuelve cuántos quedan antes del bloqueo. */
  private async registrarFallo(documento: string): Promise<number> {
    const r = await this.prisma.intentoLogin.findUnique({ where: { documento } });
    const vigente = r && Date.now() - r.desde.getTime() <= VENTANA_MS;
    const datos = vigente
      ? { total: r.total + 1, desde: r.desde }
      : { total: 1, desde: new Date() };
    await this.prisma.intentoLogin.upsert({
      where: { documento },
      create: { documento, ...datos },
      update: datos,
    });
    return Math.max(0, MAX_INTENTOS - datos.total);
  }
}
