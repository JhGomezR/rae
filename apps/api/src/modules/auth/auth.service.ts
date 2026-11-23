import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '@prisma/client';
import { normalizarClave } from '@rae/shared';
import * as argon2 from 'argon2';
import { env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const MAX_INTENTOS = 10;
const VENTANA_MS = 15 * 60 * 1000;
const ERROR_LOGIN = 'Documento o contraseña incorrectos.';

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
});

@Injectable()
export class AuthService {
  private hashFicticio?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(documento: string, clave: string) {
    await this.verificarBloqueo(documento);
    const usuario = await this.prisma.usuario.findUnique({ where: { documento } });
    if (!usuario || !usuario.activo) {
      // Mismo costo que una verificación real, para no revelar si el documento existe.
      this.hashFicticio ??= await argon2.hash(randomBytes(16).toString('hex'));
      await argon2.verify(this.hashFicticio, clave);
      await this.registrarFallo(documento);
      throw new UnauthorizedException(ERROR_LOGIN);
    }
    const escrita = usuario.debeCambiarClave ? normalizarClave(clave) : clave;
    if (!(await argon2.verify(usuario.passwordHash, escrita))) {
      await this.registrarFallo(documento);
      throw new UnauthorizedException(ERROR_LOGIN);
    }
    await this.prisma.intentoLogin.deleteMany({ where: { documento } });
    const actualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoIngreso: new Date() },
    });
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

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  async primerIngreso(usuarioId: number, claveNueva: string, email: string) {
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
    return { usuario: perfil(usuario), tokens: await this.emitir(usuario) };
  }

  async yo(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || !u.activo) throw new UnauthorizedException('Sesión vencida.');
    return perfil(u);
  }

  async cambiarClave(id: number, actual: string, nueva: string): Promise<void> {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id } });
    if (!(await argon2.verify(u.passwordHash, actual))) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash: await argon2.hash(nueva) },
    });
    await this.revocarTodos(id);
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
        expiraEn: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86_400_000),
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

  private async verificarBloqueo(documento: string): Promise<void> {
    const r = await this.prisma.intentoLogin.findUnique({ where: { documento } });
    if (!r) return;
    if (Date.now() - r.desde.getTime() > VENTANA_MS) {
      await this.prisma.intentoLogin.deleteMany({ where: { documento } });
    } else if (r.total >= MAX_INTENTOS) {
      throw new UnauthorizedException('Demasiados intentos. Vuelve a intentarlo en 15 minutos.');
    }
  }

  private async registrarFallo(documento: string): Promise<void> {
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
  }
}
