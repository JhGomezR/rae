import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Publica } from '../../../common/sesion';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Publica()
  @Get()
  async verificar() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible.');
    }
    return { estado: 'ok', servicio: 'seguimiento-rae-api', hora: new Date().toISOString() };
  }
}
