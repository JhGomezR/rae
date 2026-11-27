import { Global, Module } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/** RBAC (roles y permisos) y ABAC (políticas) para la administración. */
@Global()
@Module({
  controllers: [RolesController],
  providers: [PermisosService, RolesService],
  exports: [PermisosService],
})
export class AccesoModule {}
