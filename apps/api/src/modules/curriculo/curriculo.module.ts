import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { NivelPregunta, Rol } from '@rae/shared';
import { z } from 'zod';
import { Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { restaurarUnidad } from './sembrar-curriculo';

const item = z.object({
  capacidad: z.string().trim().min(3).max(500).optional(),
  activo: z.boolean().optional(),
});
const pregunta = z
  .object({
    enunciado: z.string().trim().min(5).max(2000),
    opciones: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
    indiceCorrecta: z.number().int().min(0),
  })
  .refine((p) => p.indiceCorrecta < p.opciones.length, {
    message: 'La respuesta correcta debe ser una de las opciones.',
    path: ['indiceCorrecta'],
  });
const competencia = z.object({ tituloCorto: z.string().trim().min(3).max(200) });

@Injectable()
export class CurriculoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const unidades = await this.prisma.unidadFormacion.findMany({
      orderBy: [{ semestre: 'asc' }, { id: 'asc' }],
      include: { items: { where: { activo: true }, select: { seccion: true } } },
    });
    return unidades.map(({ items, ...u }) => ({
      ...u,
      conteo: {
        objetivos: items.filter((i) => i.seccion === 'OBJETIVO').length,
        genericas: items.filter((i) => i.seccion === 'GENERICA').length,
        especificas: items.filter((i) => i.seccion === 'ESPECIFICA').length,
        rae: items.filter((i) => i.seccion === 'RAE').length,
      },
    }));
  }

  async detalle(id: number) {
    const u = await this.prisma.unidadFormacion.findUnique({
      where: { id },
      include: {
        competencias: { orderBy: { orden: 'asc' } },
        items: { orderBy: { orden: 'asc' }, include: { preguntas: true } },
      },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada.');
    return u;
  }

  async editarItem(id: number, d: z.output<typeof item>) {
    const actual = await this.prisma.itemEvaluable.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Ítem no encontrado.');
    const [fila] = await this.prisma.$transaction([
      this.prisma.itemEvaluable.update({ where: { id }, data: d }),
      this.prisma.unidadFormacion.update({
        where: { id: actual.unidadId },
        data: { editado: true },
      }),
    ]);
    return fila;
  }

  async editarPregunta(itemId: number, nivel: NivelPregunta, d: z.output<typeof pregunta>) {
    const actual = await this.prisma.itemEvaluable.findUnique({ where: { id: itemId } });
    if (!actual) throw new NotFoundException('Ítem no encontrado.');
    const [fila] = await this.prisma.$transaction([
      this.prisma.preguntaPractica.upsert({
        where: { itemId_nivel: { itemId, nivel } },
        create: { itemId, nivel, ...d },
        update: { ...d, activa: true },
      }),
      this.prisma.unidadFormacion.update({
        where: { id: actual.unidadId },
        data: { editado: true },
      }),
    ]);
    return fila;
  }

  async editarCompetencia(id: number, d: z.output<typeof competencia>) {
    const actual = await this.prisma.competenciaUnidad.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Competencia no encontrada.');
    const [fila] = await this.prisma.$transaction([
      this.prisma.competenciaUnidad.update({ where: { id }, data: d }),
      this.prisma.unidadFormacion.update({
        where: { id: actual.unidadId },
        data: { editado: true },
      }),
    ]);
    return fila;
  }

  async restaurar(id: number): Promise<void> {
    if (!(await restaurarUnidad(this.prisma, id))) {
      throw new NotFoundException('La unidad no tiene contenido original.');
    }
  }
}

@Roles(Rol.ADMIN)
@Controller('curriculo')
export class CurriculoController {
  constructor(private readonly servicio: CurriculoService) {}

  @Get('unidades')
  listar() {
    return this.servicio.listar();
  }

  @Get('unidades/:id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.detalle(id);
  }

  @Post('unidades/:id/restaurar')
  @HttpCode(204)
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.restaurar(id);
  }

  @Put('items/:id')
  editarItem(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(item)) d: z.output<typeof item>,
  ) {
    return this.servicio.editarItem(id, d);
  }

  @Put('items/:id/preguntas/:nivel')
  editarPregunta(
    @Param('id', ParseIntPipe) id: number,
    @Param('nivel') nivel: string,
    @Body(new ZodPipe(pregunta)) d: z.output<typeof pregunta>,
  ) {
    if (nivel !== NivelPregunta.ESTUDIANTE && nivel !== NivelPregunta.DOCENTE) {
      throw new BadRequestException('Nivel no válido.');
    }
    return this.servicio.editarPregunta(id, nivel, d);
  }

  @Put('competencias/:id')
  editarCompetencia(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(competencia)) d: z.output<typeof competencia>,
  ) {
    return this.servicio.editarCompetencia(id, d);
  }
}

@Module({ controllers: [CurriculoController], providers: [CurriculoService] })
export class CurriculoModule {}
