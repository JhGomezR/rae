import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Momento, Rol } from '@rae/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { Permiso, Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { ReportesService } from '../reportes/reportes.service';
import { PanelService } from './panel.service';
import { PlanService } from './plan.service';
import { ResultadosService } from './resultados.service';

const entero = z.coerce.number().int().positive().optional();
const filtros = z.object({
  periodoId: entero,
  semestre: entero,
  sedeId: entero,
  programaId: entero,
  docenteId: entero,
});
const matriz = z.object({
  rol: z.enum(['DOCENTE', 'ESTUDIANTE']),
  momento: z.enum(['APRECIACION', 'ALCANCE']),
  periodoId: entero,
});

function aMomento(v: string): Momento {
  const m = v.toUpperCase();
  if (m !== Momento.APRECIACION && m !== Momento.ALCANCE) {
    throw new BadRequestException('Momento no válido.');
  }
  return m;
}

@Roles(Rol.ADMIN)
@Permiso('resultados.ver')
@Controller()
export class ResultadosController {
  constructor(
    private readonly resultados: ResultadosService,
    private readonly plan: PlanService,
    private readonly reportes: ReportesService,
    private readonly panel_: PanelService,
  ) {}

  @Get('resultados/panel')
  async panel(@Query(new ZodPipe(filtros)) f: z.output<typeof filtros>) {
    const base = await this.resultados.panel(f.periodoId);
    if (!base.periodo) return { ...base, estadisticas: null };
    const enviadas = await this.resultados.cargar(base.periodo.id);
    return { ...base, estadisticas: await this.panel_.calcular(base.periodo.id, enviadas) };
  }

  @Get('resultados/comparativo')
  comparativo(@Query(new ZodPipe(filtros)) f: z.output<typeof filtros>) {
    return this.resultados.comparativo(f);
  }

  @Get('resultados/:momento')
  tabla(@Param('momento') m: string, @Query(new ZodPipe(filtros)) f: z.output<typeof filtros>) {
    return this.resultados.tabla(aMomento(m), f);
  }

  @Get('resultados/:momento/unidades/:id')
  detalle(
    @Param('momento') m: string,
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodPipe(filtros)) f: z.output<typeof filtros>,
  ) {
    return this.resultados.detalleUnidad(aMomento(m), id, f.periodoId);
  }

  @Get('plan-mejoramiento')
  verPlan(@Query(new ZodPipe(filtros)) f: z.output<typeof filtros>) {
    return this.plan.calcular(f.periodoId);
  }

  @Get('reportes/matriz')
  exportarMatriz(@Query(new ZodPipe(matriz)) q: z.output<typeof matriz>, @Res() res: Response) {
    return this.reportes.matriz(res, q.rol, q.momento, q.periodoId);
  }

  @Get('reportes/plan-mejoramiento.pdf')
  exportarPlan(@Query(new ZodPipe(filtros)) f: z.output<typeof filtros>, @Res() res: Response) {
    return this.reportes.planPdf(res, f.periodoId);
  }
}

@Module({
  controllers: [ResultadosController],
  providers: [ResultadosService, PlanService, ReportesService, PanelService],
})
export class ResultadosModule {}
