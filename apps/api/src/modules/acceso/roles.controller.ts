import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Rol } from '@rae/shared';
import { z } from 'zod';
import { Permiso, Roles, UsuarioActual, type UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { esquemasRoles as e, RolesService } from './roles.service';

type D<K extends keyof typeof e> = z.output<(typeof e)[K]>;

/** Roles y permisos (RBAC); las restricciones por atributos (ABAC) las aplica el servicio. */
@Roles(Rol.ADMIN)
@Permiso('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly servicio: RolesService) {}

  @Get()
  listar(@UsuarioActual() u: UsuarioSesion) {
    return this.servicio.listar(u.id);
  }

  @Get('permisos')
  catalogo() {
    return this.servicio.catalogo();
  }

  @Post()
  crear(@UsuarioActual() u: UsuarioSesion, @Body(new ZodPipe(e.crear)) d: D<'crear'>) {
    return this.servicio.crear(u.id, d);
  }

  @Patch(':id')
  editar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(e.editar)) d: D<'editar'>,
  ) {
    return this.servicio.editar(u.id, id, d);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() u: UsuarioSesion, @Param('id', ParseIntPipe) id: number) {
    return this.servicio.eliminar(u.id, id);
  }
}
