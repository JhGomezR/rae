import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  PipeTransform,
  Post,
  Put,
} from '@nestjs/common';
import { Momento, Rol } from '@rae/shared';
import { z } from 'zod';
import { Roles, UsuarioActual, UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { EncuestaFactory } from './encuesta.factory';
import { EncuestasService, EnvioEncuesta } from './encuestas.service';

const envio = z.object({
  general: z.record(z.unknown()).default({}),
  items: z.record(z.record(z.unknown())).default({}),
  estrategias: z.array(z.number().int()).max(40).default([]),
  recomendaciones: z.array(z.string().trim().max(1000)).max(20).optional(),
  seguimiento: z
    .array(
      z.object({
        recomendacionId: z.number().int(),
        estado: z.enum(['APLICADA', 'PARCIAL', 'NO_APLICADA']),
      }),
    )
    .max(100)
    .optional(),
});

@Injectable()
class MomentoPipe implements PipeTransform<string, Momento> {
  transform(v: string): Momento {
    const m = v.toUpperCase();
    if (m !== Momento.APRECIACION && m !== Momento.ALCANCE) {
      throw new BadRequestException('Momento no válido.');
    }
    return m;
  }
}

@Roles(Rol.DOCENTE, Rol.ESTUDIANTE)
@Controller()
export class EncuestasController {
  constructor(private readonly servicio: EncuestasService) {}

  @Get('mis-cursos')
  misCursos(@UsuarioActual() u: UsuarioSesion) {
    return this.servicio.misCursos(u);
  }

  @Get('encuestas/:cursoId/:momento')
  obtener(
    @UsuarioActual() u: UsuarioSesion,
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('momento', MomentoPipe) momento: Momento,
  ) {
    return this.servicio.obtener(u, cursoId, momento);
  }

  @Put('encuestas/:cursoId/:momento/borrador')
  borrador(
    @UsuarioActual() u: UsuarioSesion,
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('momento', MomentoPipe) momento: Momento,
    @Body(new ZodPipe(envio)) d: EnvioEncuesta,
  ) {
    return this.servicio.guardarBorrador(u, cursoId, momento, d);
  }

  @Post('encuestas/:cursoId/:momento/enviar')
  enviar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('cursoId', ParseIntPipe) cursoId: number,
    @Param('momento', MomentoPipe) momento: Momento,
    @Body(new ZodPipe(envio)) d: EnvioEncuesta,
  ) {
    return this.servicio.enviar(u, cursoId, momento, d);
  }
}

@Module({
  controllers: [EncuestasController],
  providers: [EncuestasService, EncuestaFactory],
})
export class EncuestasModule {}
