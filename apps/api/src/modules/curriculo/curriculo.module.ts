import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { NivelPregunta, Rol } from '@rae/shared';
import { z } from 'zod';
import { Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { CurriculoService, esquemas as e } from './curriculo.service';

type D<K extends keyof typeof e> = z.output<(typeof e)[K]>;

/** Eliminar = desactivar (activo: false): las respuestas guardadas nunca se pierden. */
@Roles(Rol.ADMIN)
@Controller('curriculo')
export class CurriculoController {
  constructor(private readonly servicio: CurriculoService) {}

  @Get('unidades')
  listar() {
    return this.servicio.listar();
  }

  @Post('unidades')
  crearUnidad(@Body(new ZodPipe(e.unidadCrear)) d: D<'unidadCrear'>) {
    return this.servicio.crearUnidad(d);
  }

  @Get('unidades/:id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.detalle(id);
  }

  @Patch('unidades/:id')
  editarUnidad(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.unidadEditar)) d: D<'unidadEditar'>,
  ) {
    return this.servicio.editarUnidad(id, d);
  }

  @Post('unidades/:id/restaurar')
  @HttpCode(204)
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.restaurar(id);
  }

  @Post('unidades/:id/competencias')
  crearCompetencia(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.competenciaCrear)) d: D<'competenciaCrear'>,
  ) {
    return this.servicio.crearCompetencia(id, d);
  }

  @Post('unidades/:id/items')
  crearItem(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.itemCrear)) d: D<'itemCrear'>,
  ) {
    return this.servicio.crearItem(id, d);
  }

  @Put('items/:id')
  editarItem(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.itemEditar)) d: D<'itemEditar'>,
  ) {
    return this.servicio.editarItem(id, d);
  }

  @Put('items/:id/preguntas/:nivel')
  editarPregunta(
    @Param('id', ParseIntPipe) id: number,
    @Param('nivel') nivel: string,
    @Body(new ZodPipe(e.pregunta)) d: D<'pregunta'>,
  ) {
    if (nivel !== NivelPregunta.ESTUDIANTE && nivel !== NivelPregunta.DOCENTE) {
      throw new BadRequestException('Nivel no válido.');
    }
    return this.servicio.editarPregunta(id, nivel, d);
  }

  @Put('competencias/:id')
  editarCompetencia(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.competenciaEditar)) d: D<'competenciaEditar'>,
  ) {
    return this.servicio.editarCompetencia(id, d);
  }
}

@Module({ controllers: [CurriculoController], providers: [CurriculoService] })
export class CurriculoModule {}
