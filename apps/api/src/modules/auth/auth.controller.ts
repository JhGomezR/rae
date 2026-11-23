import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { loginSchema } from '@rae/shared';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { PermitePrimerIngreso, Publica, UsuarioActual, UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { AuthService, Tokens } from './auth.service';

const base: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  path: '/',
};

const primerIngreso = z.object({
  claveNueva: z.string().min(8, 'Usa al menos 8 caracteres.').max(200),
  email: z.string().trim().toLowerCase().email('Escribe un correo válido.').max(150),
});
const cambioClave = z.object({
  actual: z.string().min(1).max(200),
  nueva: z.string().min(8, 'Usa al menos 8 caracteres.').max(200),
});

function ponerCookies(res: Response, t: Tokens): void {
  res.cookie('access', t.access, { ...base, maxAge: env.JWT_ACCESS_MINUTOS * 60_000 });
  res.cookie('refresh', t.refresh, { ...base, maxAge: env.REFRESH_TTL_DAYS * 86_400_000 });
}

const leerRefresh = (req: Request) => (req.cookies as Record<string, string | undefined>).refresh;

/** Solo permite volver a rutas internas de la aplicación. */
const destinoSeguro = (d?: string) => (d && /^\/(?![/\\])/.test(d) ? d : '/');

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publica()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodPipe(loginSchema)) dto: z.output<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { usuario, tokens } = await this.auth.login(dto.documento, dto.clave);
    ponerCookies(res, tokens);
    return { usuario };
  }

  @Publica()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { usuario, tokens } = await this.auth.refrescar(leerRefresh(req));
    ponerCookies(res, tokens);
    return { usuario };
  }

  /** Lo usa el middleware de la web cuando venció el access token al navegar. */
  @Publica()
  @Get('renovar')
  async renovar(
    @Query('destino') destino: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { tokens } = await this.auth.refrescar(leerRefresh(req));
      ponerCookies(res, tokens);
      res.redirect(destinoSeguro(destino));
    } catch {
      res.clearCookie('access', base).clearCookie('refresh', base).redirect('/login');
    }
  }

  @Publica()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(leerRefresh(req));
    res.clearCookie('access', base).clearCookie('refresh', base);
  }

  @PermitePrimerIngreso()
  @Post('primer-ingreso')
  @HttpCode(200)
  async primerIngreso(
    @UsuarioActual() sesion: UsuarioSesion,
    @Body(new ZodPipe(primerIngreso)) dto: z.output<typeof primerIngreso>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actual = await this.auth.yo(sesion.id);
    if (dto.claveNueva.includes(actual.documento)) {
      throw new BadRequestException('La contraseña no puede contener tu documento.');
    }
    const { usuario, tokens } = await this.auth.primerIngreso(sesion.id, dto.claveNueva, dto.email);
    ponerCookies(res, tokens);
    return { usuario };
  }

  @PermitePrimerIngreso()
  @Get('yo')
  yo(@UsuarioActual() sesion: UsuarioSesion) {
    return this.auth.yo(sesion.id);
  }

  @Patch('clave')
  @HttpCode(204)
  async clave(
    @UsuarioActual() sesion: UsuarioSesion,
    @Body(new ZodPipe(cambioClave)) dto: z.output<typeof cambioClave>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.cambiarClave(sesion.id, dto.actual, dto.nueva);
    res.clearCookie('access', base).clearCookie('refresh', base);
  }
}
