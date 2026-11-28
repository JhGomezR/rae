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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { normalizarNombreUnidad, Rol } from '@rae/shared';
import { z } from 'zod';
import { Permiso, Roles, UsuarioActual, UsuarioSesion } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ImportacionService } from './importacion.service';

const alias = z.object({ alias: z.string().trim().min(3).max(150), unidadId: z.number().int() });

@Injectable()
export class ConsultasMatriculaService {
  constructor(private readonly prisma: PrismaService) {}

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
@Permiso('consolidado')
@Controller()
export class MatriculasController {
  constructor(
    private readonly importacion: ImportacionService,
    private readonly cursos: ConsultasMatriculaService,
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
}

@Module({
  controllers: [MatriculasController],
  providers: [ImportacionService, ConsultasMatriculaService],
})
export class MatriculasModule {}
