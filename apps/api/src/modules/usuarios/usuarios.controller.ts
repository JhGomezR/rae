import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Rol } from '@rae/shared';
import { z } from 'zod';
import { Permiso, Roles, UsuarioActual, type UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { esquemas as e, UsuariosService } from './usuarios.service';

type D<K extends keyof typeof e> = z.output<(typeof e)[K]>;

/**
 * Gestión de usuarios. RBAC: cada acción exige su permiso. ABAC: el servicio aplica las políticas
 * (no autogestionarse, no escalar privilegios, conservar un gestor de roles, integridad de datos).
 */
@Roles(Rol.ADMIN)
@Permiso('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly servicio: UsuariosService) {}

  @Get()
  listar(@Query(new ZodPipe(e.filtro)) f: D<'filtro'>) {
    return this.servicio.listar(f);
  }

  @Get('opciones')
  opciones(@UsuarioActual() u: UsuarioSesion) {
    return this.servicio.opciones(u.id);
  }

  @Post()
  @Permiso('usuarios.crear')
  crear(@UsuarioActual() u: UsuarioSesion, @Body(new ZodPipe(e.crear)) d: D<'crear'>) {
    return this.servicio.crear(u.id, d);
  }

  @Patch('estado')
  @Permiso('usuarios.estado')
  estado(@UsuarioActual() u: UsuarioSesion, @Body(new ZodPipe(e.estado)) d: D<'estado'>) {
    return this.servicio.estadoMasivo(u.id, d);
  }

  @Patch(':id')
  @Permiso('usuarios.editar', 'usuarios.estado')
  editar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.editar)) d: D<'editar'>,
  ) {
    return this.servicio.editar(u.id, id, d);
  }

  @Post(':id/reiniciar-clave')
  @Permiso('usuarios.clave')
  @HttpCode(204)
  reiniciar(@UsuarioActual() u: UsuarioSesion, @Param('id', ParseIntPipe) id: number) {
    return this.servicio.reiniciarClave(u.id, id);
  }

  @Delete(':id')
  @Permiso('usuarios.eliminar')
  eliminar(@UsuarioActual() u: UsuarioSesion, @Param('id', ParseIntPipe) id: number) {
    return this.servicio.eliminar(u.id, id);
  }
}

@Module({ controllers: [UsuariosController], providers: [UsuariosService] })
export class UsuariosModule {}
