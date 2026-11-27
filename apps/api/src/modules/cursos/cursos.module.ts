import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Rol } from '@rae/shared';
import { z } from 'zod';
import { Permiso, Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { CursosService, esquemas as e } from './cursos.service';

type D<K extends keyof typeof e> = z.output<(typeof e)[K]>;

/** Los cursos no se borran: se inactivan y dejan de contar en encuestas y estadísticas. */
@Roles(Rol.ADMIN)
@Permiso('cursos.gestionar')
@Controller('cursos')
export class CursosController {
  constructor(private readonly servicio: CursosService) {}

  @Get()
  listar(@Query(new ZodPipe(e.filtro)) f: D<'filtro'>) {
    return this.servicio.listar(f);
  }

  @Get('opciones')
  opciones() {
    return this.servicio.opciones();
  }

  @Post()
  crear(@Body(new ZodPipe(e.crear)) d: D<'crear'>) {
    return this.servicio.crear(d);
  }

  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(e.editar)) d: D<'editar'>) {
    return this.servicio.editar(id, d);
  }

  @Get(':id/inscripciones')
  inscripciones(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.inscripciones(id);
  }

  @Post(':id/inscripciones')
  inscribir(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.inscribir)) d: D<'inscribir'>,
  ) {
    return this.servicio.inscribir(id, d.documento);
  }

  @Patch(':id/inscripciones/:inscripcionId')
  cambiarInscripcion(
    @Param('id', ParseIntPipe) id: number,
    @Param('inscripcionId', ParseIntPipe) inscripcionId: number,
    @Body(new ZodPipe(e.inscripcion)) d: D<'inscripcion'>,
  ) {
    return this.servicio.cambiarInscripcion(id, inscripcionId, d.activa);
  }
}

@Module({ controllers: [CursosController], providers: [CursosService] })
export class CursosModule {}
