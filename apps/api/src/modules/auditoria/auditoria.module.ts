import { Controller, Get, Global, Module, Query } from '@nestjs/common';
import { Rol } from '@rae/shared';
import { z } from 'zod';
import { Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditoriaService, filtroAuditoria } from './auditoria.service';

@Roles(Rol.ADMIN)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly servicio: AuditoriaService) {}

  @Get()
  consultar(@Query(new ZodPipe(filtroAuditoria)) f: z.output<typeof filtroAuditoria>) {
    return this.servicio.consultar(f);
  }
}

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
