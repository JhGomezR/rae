import { Controller, Get } from '@nestjs/common';
import { NIVELES } from '@rae/shared';

export interface EstadoSalud {
  estado: 'ok';
  servicio: string;
  hora: string;
  niveles: number;
}

@Controller('salud')
export class SaludController {
  @Get()
  verificar(): EstadoSalud {
    return {
      estado: 'ok',
      servicio: 'seguimiento-rae-api',
      hora: new Date().toISOString(),
      niveles: NIVELES.length,
    };
  }
}
