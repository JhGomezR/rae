import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Prisma } from '@prisma/client';
import { normalizarNombreUnidad, Rol } from '@rae/shared';
import { z } from 'zod';
import { Roles, UsuarioActual, UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ImportacionService } from './importacion.service';

const alias = z.object({ alias: z.string().trim().min(3).max(150), unidadId: z.number().int() });
const filtroCursos = z.object({
  periodoId: z.coerce.number().int().optional(),
  q: z.string().trim().max(80).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(20),
});

@Injectable()
export class CursosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: z.output<typeof filtroCursos>) {
    const where: Prisma.CursoWhereInput = {
      ...(f.periodoId ? { periodoId: f.periodoId } : { periodo: { activo: true } }),
      ...(f.q
        ? {
            OR: [
              { unidad: { nombre: { contains: f.q, mode: 'insensitive' } } },
              { docente: { nombreCompleto: { contains: f.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [filas, total] = await Promise.all([
      this.prisma.curso.findMany({
        where,
        include: {
          unidad: { select: { nombre: true } },
          sede: { select: { codigo: true } },
          programa: { select: { nombre: true } },
          docente: { select: { nombreCompleto: true } },
          periodo: { select: { codigo: true } },
          _count: { select: { inscripciones: { where: { activa: true } } } },
        },
        orderBy: [{ unidadId: 'asc' }, { grupo: 'asc' }],
        skip: (f.pagina - 1) * f.tamano,
        take: f.tamano,
      }),
      this.prisma.curso.count({ where }),
    ]);
    return { datos: filas, total, pagina: f.pagina, tamano: f.tamano };
  }

  listarAlias() {
    return this.prisma.aliasUnidad.findMany({
      include: { unidad: { select: { nombre: true } } },
      orderBy: { alias: 'asc' },
    });
  }

  crearAlias(d: z.output<typeof alias>) {
    const clave = normalizarNombreUnidad(d.alias);
    return this.prisma.aliasUnidad.upsert({
      where: { alias: clave },
      create: { alias: clave, unidadId: d.unidadId },
      update: { unidadId: d.unidadId },
    });
  }

  historial() {
    return this.prisma.importacion.findMany({
      orderBy: { creadaEn: 'desc' },
      take: 20,
      omit: { filas: true },
    });
  }
}

@Roles(Rol.ADMIN)
@Controller()
export class MatriculasController {
  constructor(
    private readonly importacion: ImportacionService,
    private readonly cursos: CursosService,
  ) {}

  @Post('importaciones/consolidado/previsualizar')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  previsualizar(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @UsuarioActual() u: UsuarioSesion,
  ) {
    const esZip = archivo?.buffer.subarray(0, 2).toString('latin1') === 'PK';
    if (!archivo || !esZip || !/\.xlsx$/i.test(archivo.originalname)) {
      throw new BadRequestException('Sube un archivo Excel (.xlsx).');
    }
    return this.importacion.previsualizar(archivo.originalname, archivo.buffer, u.id);
  }

  @Post('importaciones/:id/aplicar')
  aplicar(@Param('id', ParseIntPipe) id: number) {
    return this.importacion.aplicar(id);
  }

  @Get('importaciones')
  historial() {
    return this.cursos.historial();
  }

  @Get('alias-unidades')
  listarAlias() {
    return this.cursos.listarAlias();
  }

  @Post('alias-unidades')
  crearAlias(@Body(new ZodPipe(alias)) d: z.output<typeof alias>) {
    return this.cursos.crearAlias(d);
  }

  @Get('cursos')
  listarCursos(@Query(new ZodPipe(filtroCursos)) f: z.output<typeof filtroCursos>) {
    return this.cursos.listar(f);
  }
}

@Module({
  controllers: [MatriculasController],
  providers: [ImportacionService, CursosService],
})
export class MatriculasModule {}
