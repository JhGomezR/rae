import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Rol } from '@rae/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { PlanService } from '../resultados/plan.service';
import { ResultadosService } from '../resultados/resultados.service';
import { ARCHIVOS_INFORME, ClaveInforme, CLAVES_INFORME } from './informe.tipos';
import { InformesService } from './informes.service';
import { generarDocx } from './render-docx';
import { generarPdf } from './render-pdf';

const consulta = z.object({ periodoId: z.coerce.number().int().positive().optional() });
const descarga = consulta.extend({
  formato: z.enum(['docx', 'pdf']),
  firma: z.enum(['0', '1']).default('0'),
});
const corto = z.string().trim().max(200).optional();
const largo = z.string().trim().max(5000).optional();
const ajustes = z
  .object({
    programa: corto,
    lugar: corto,
    fechaEntrega: corto,
    porcentaje: z.number().int().min(0).max(100).nullable().optional(),
    analisis: largo,
    logros: largo,
    impactos: largo,
    presupuesto: corto,
    anexos: z.string().trim().max(1000).optional(),
  })
  .strict();
const firmante = z.object({
  nombre: z.string().trim().min(3, 'Escribe el nombre de quien firma.').max(150),
  cargo: z.string().trim().min(3, 'Escribe el cargo.').max(150),
});

function aClave(v: string): ClaveInforme {
  const c = CLAVES_INFORME.find((x) => x === v);
  if (!c) throw new BadRequestException('Informe no válido.');
  return c;
}

@Roles(Rol.ADMIN)
@Controller('informes')
export class InformesController {
  constructor(private readonly servicio: InformesService) {}

  @Get()
  listar(@Query(new ZodPipe(consulta)) q: z.output<typeof consulta>) {
    return this.servicio.listar(q.periodoId);
  }

  @Get('configuracion')
  configuracion() {
    return this.servicio.configuracion();
  }

  @Put('configuracion')
  guardarConfiguracion(@Body(new ZodPipe(firmante)) d: z.output<typeof firmante>) {
    return this.servicio.guardarConfiguracion(d.nombre, d.cargo);
  }

  @Post('configuracion/firma')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 1024 * 1024, files: 1 } }))
  guardarFirma(@UploadedFile() archivo: Express.Multer.File | undefined) {
    return this.servicio.guardarFirma(archivo);
  }

  @Delete('configuracion/firma')
  quitarFirma() {
    return this.servicio.quitarFirma();
  }

  @Put(':clave/ajustes')
  guardarAjustes(
    @Param('clave') clave: string,
    @Query(new ZodPipe(consulta)) q: z.output<typeof consulta>,
    @Body(new ZodPipe(ajustes)) d: z.output<typeof ajustes>,
  ) {
    const { porcentaje, ...resto } = d;
    return this.servicio.guardarAjustes(aClave(clave), q.periodoId, {
      ...resto,
      ...(porcentaje === null || porcentaje === undefined ? {} : { porcentaje }),
    });
  }

  @Get(':clave/descargar')
  async descargar(
    @Param('clave') valor: string,
    @Query(new ZodPipe(descarga)) q: z.output<typeof descarga>,
    @Res() res: Response,
  ): Promise<void> {
    const clave = aClave(valor);
    const [informe, persona] = await Promise.all([
      this.servicio.uno(clave, q.periodoId),
      this.servicio.firmante(q.firma === '1'),
    ]);
    const archivo =
      q.formato === 'docx'
        ? await generarDocx(clave, informe, persona)
        : await generarPdf(clave, informe, persona);
    const nombre = `${ARCHIVOS_INFORME[clave]} - ${informe.periodo}.${q.formato}`;
    res.setHeader(
      'Content-Type',
      q.formato === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="informe-${clave}.${q.formato}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(archivo);
  }
}

@Module({
  controllers: [InformesController],
  providers: [InformesService, ResultadosService, PlanService],
})
export class InformesModule {}
