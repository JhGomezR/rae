import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Rol } from '@rae/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { Permiso, Roles, UsuarioActual, type UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { esquemas as e, InformesDocentesService } from './informes-docentes.service';

type D<K extends keyof typeof e> = z.output<(typeof e)[K]>;

const TIPOS = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

function enviar(res: Response, archivo: Buffer, nombre: string, formato: 'docx' | 'xlsx' | 'pdf') {
  res.setHeader('Content-Type', TIPOS[formato]);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="informe.${formato}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.send(archivo);
}

/** Agenda, ejecución y hora cátedra: lo que hace el docente (y el administrador, que ve todo). */
@Roles(Rol.DOCENTE, Rol.ADMIN)
@Controller('mis-informes')
export class MisInformesController {
  constructor(private readonly servicio: InformesDocentesService) {}

  @Get()
  mios(@UsuarioActual() u: UsuarioSesion, @Query(new ZodPipe(e.tipo)) q: D<'tipo'>) {
    return this.servicio.mios(u.id, q.tipo);
  }

  @Post()
  crear(@UsuarioActual() u: UsuarioSesion, @Body(new ZodPipe(e.crear)) d: D<'crear'>) {
    return this.servicio.crear(u.id, d);
  }

  @Get(':id')
  uno(@UsuarioActual() u: UsuarioSesion, @Param('id', ParseIntPipe) id: number) {
    return this.servicio.uno(id, u);
  }

  @Put(':id')
  guardar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.guardar)) d: D<'guardar'>,
  ) {
    return this.servicio.guardar(id, u.id, d);
  }

  @Post(':id/entregar')
  entregar(@UsuarioActual() u: UsuarioSesion, @Param('id', ParseIntPipe) id: number) {
    return this.servicio.entregar(id, u.id);
  }

  @Get(':id/descargar')
  async descargar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodPipe(e.descarga)) q: D<'descarga'>,
    @Res() res: Response,
  ): Promise<void> {
    const { archivo, nombre } = await this.servicio.documento(
      await this.servicio.completo(id, u),
      q.formato,
    );
    enviar(res, archivo, nombre, q.formato);
  }
}

/** Validación de los informes entregados por los docentes. */
@Roles(Rol.ADMIN)
@Permiso('docentes.validar')
@Controller('validacion-informes')
export class ValidacionInformesController {
  constructor(private readonly servicio: InformesDocentesService) {}

  @Get()
  listar(@Query(new ZodPipe(e.filtro)) f: D<'filtro'>) {
    return this.servicio.listar(f);
  }

  @Get('resumen')
  resumen(@Query('periodoId') periodoId?: string) {
    const n = Number(periodoId);
    return this.servicio.resumen(Number.isInteger(n) && n > 0 ? n : undefined);
  }

  @Get('firmantes')
  firmantes() {
    return this.servicio.firmantes();
  }

  @Put('firmantes')
  guardarFirmantes(@Body(new ZodPipe(e.firmantes)) d: D<'firmantes'>) {
    return this.servicio.guardarFirmantes(d);
  }

  @Get(':id')
  uno(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.uno(id);
  }

  @Post(':id/revisar')
  revisar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.revisar)) d: D<'revisar'>,
  ) {
    return this.servicio.revisar(id, u.id, d);
  }

  @Get(':id/descargar')
  async descargar(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodPipe(e.descarga)) q: D<'descarga'>,
    @Res() res: Response,
  ): Promise<void> {
    const { archivo, nombre } = await this.servicio.documento(
      await this.servicio.completo(id),
      q.formato,
    );
    enviar(res, archivo, nombre, q.formato);
  }
}

@Module({
  controllers: [MisInformesController, ValidacionInformesController],
  providers: [InformesDocentesService],
})
export class InformesDocentesModule {}
