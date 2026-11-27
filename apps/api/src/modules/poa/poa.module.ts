import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Rol } from '@rae/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { Roles, UsuarioActual, type UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { generarExcelPoa } from './excel-poa';
import { construirInformePoa } from './informe-poa';
import { esquemas as e, PoaService } from './poa.service';
import { generarDocxPoa, generarPdfPoa } from './render-poa';

type D<K extends keyof typeof e> = z.output<(typeof e)[K]>;
const MES = new ParseIntPipe();
const descarga = e.corte.extend({ formato: z.enum(['xlsx', 'docx', 'pdf']) });

const TIPOS = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

function mesValido(mes: number) {
  if (mes < 1 || mes > 12) throw new BadRequestException('El mes debe estar entre 1 y 12.');
  return mes;
}

/** Plan Operativo Anual (F-PIN-001): planeación, seguimiento mensual, desempeño e informes. */
@Roles(Rol.ADMIN)
@Controller('poa')
export class PoaController {
  constructor(private readonly servicio: PoaService) {}

  @Get()
  listar() {
    return this.servicio.listar();
  }

  @Post()
  crear(@Body(new ZodPipe(e.crear)) d: D<'crear'>) {
    return this.servicio.crear(d);
  }

  @Post('importar')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  importar(@UploadedFile() archivo: Express.Multer.File | undefined) {
    if (!archivo) throw new BadRequestException('Adjunta el Excel del POA (formato F-PIN-001).');
    return this.servicio.importar(archivo.buffer);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number, @Query(new ZodPipe(e.corte)) q: D<'corte'>) {
    return this.servicio.detalle(id, q.mes);
  }

  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(e.editar)) d: D<'editar'>) {
    return this.servicio.editar(id, d);
  }

  @Post(':id/actividades')
  crearActividad(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.actividad)) d: D<'actividad'>,
  ) {
    return this.servicio.crearActividad(id, d);
  }

  @Put('actividades/:id')
  editarActividad(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.editarActividad)) d: D<'editarActividad'>,
  ) {
    return this.servicio.editarActividad(id, d);
  }

  @Put('actividades/:id/seguimiento/:mes')
  registrarSeguimiento(
    @Param('id', ParseIntPipe) id: number,
    @Param('mes', MES) mes: number,
    @Body(new ZodPipe(e.seguimiento)) d: D<'seguimiento'>,
    @UsuarioActual() u: UsuarioSesion,
  ) {
    return this.servicio.registrarSeguimiento(id, mesValido(mes), d, u.id);
  }

  @Delete('actividades/:id/seguimiento/:mes')
  quitarSeguimiento(@Param('id', ParseIntPipe) id: number, @Param('mes', MES) mes: number) {
    return this.servicio.quitarSeguimiento(id, mesValido(mes));
  }

  @Get(':id/descargar')
  async descargar(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodPipe(descarga)) q: z.output<typeof descarga>,
    @Res() res: Response,
  ): Promise<void> {
    const { poa, desempeno } = await this.servicio.desempeno(id, q.mes);
    const archivo =
      q.formato === 'xlsx'
        ? await generarExcelPoa(poa, desempeno)
        : q.formato === 'docx'
          ? await generarDocxPoa(construirInformePoa(poa, desempeno))
          : await generarPdfPoa(construirInformePoa(poa, desempeno));
    const nombre =
      q.formato === 'xlsx'
        ? `F-PIN-001 POA ${poa.vigencia}.xlsx`
        : `Informe de desempeño POA ${poa.vigencia}.${q.formato}`;
    res.setHeader('Content-Type', TIPOS[q.formato]);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="poa-${poa.vigencia}.${q.formato}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(archivo);
  }
}

@Module({ controllers: [PoaController], providers: [PoaService] })
export class PoaModule {}
