import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Momento, periodoSchema, Rol } from '@rae/shared';
import { z } from 'zod';
import { Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export const EVENTO_MOMENTO_ABIERTO = 'momento.abierto';
export interface MomentoAbierto {
  periodoId: number;
  momento: Momento;
}

const fecha = z.coerce.date().nullable().optional();
const edicion = z.object({
  activo: z.literal(true).optional(),
  apreciacionAbierta: z.boolean().optional(),
  alcanceAbierto: z.boolean().optional(),
  apreciacionCierra: fecha,
  alcanceCierra: fecha,
});

@Injectable()
export class PeriodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventEmitter2,
  ) {}

  listar() {
    return this.prisma.periodo.findMany({ orderBy: [{ anio: 'desc' }, { numero: 'desc' }] });
  }

  async crear(d: z.output<typeof periodoSchema>) {
    if (await this.prisma.periodo.findUnique({ where: { codigo: d.codigo } })) {
      throw new ConflictException('Ese periodo ya existe.');
    }
    const [anio, numero] = d.codigo.split('-').map(Number) as [number, number];
    return this.prisma.periodo.create({ data: { ...d, anio, numero } });
  }

  async editar(id: number, d: z.output<typeof edicion>) {
    const previo = await this.prisma.periodo.findUnique({ where: { id } });
    if (!previo) throw new NotFoundException('Periodo no encontrado.');
    const periodo = await this.prisma.$transaction(async (tx) => {
      if (d.activo) {
        await tx.periodo.updateMany({
          where: { NOT: { id } },
          data: { activo: false, apreciacionAbierta: false, alcanceAbierto: false },
        });
      }
      return tx.periodo.update({ where: { id }, data: d });
    });
    if (periodo.activo) {
      if (periodo.apreciacionAbierta && !previo.apreciacionAbierta) {
        this.emitir(id, Momento.APRECIACION);
      }
      if (periodo.alcanceAbierto && !previo.alcanceAbierto) this.emitir(id, Momento.ALCANCE);
    }
    return periodo;
  }

  private emitir(periodoId: number, momento: Momento): void {
    this.eventos.emit(EVENTO_MOMENTO_ABIERTO, { periodoId, momento } satisfies MomentoAbierto);
  }
}

@Roles(Rol.ADMIN)
@Controller('periodos')
export class PeriodosController {
  constructor(private readonly servicio: PeriodosService) {}

  @Get()
  listar() {
    return this.servicio.listar();
  }

  @Post()
  crear(@Body(new ZodPipe(periodoSchema)) d: z.output<typeof periodoSchema>) {
    return this.servicio.crear(d);
  }

  @Patch(':id')
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(edicion)) d: z.output<typeof edicion>,
  ) {
    return this.servicio.editar(id, d);
  }
}

@Module({ controllers: [PeriodosController], providers: [PeriodosService] })
export class PeriodosModule {}
