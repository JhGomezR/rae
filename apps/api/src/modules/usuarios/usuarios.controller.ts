import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { claveInicial, documentoSchema, normalizarClave, parsearNombre, Rol } from '@rae/shared';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { Roles } from '../../common/sesion';
import { ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const crear = z.object({
  documento: documentoSchema,
  nombreCompleto: z.string().trim().min(3).max(150),
  rol: z.enum(['ADMIN', 'DOCENTE', 'ESTUDIANTE']),
  email: z.string().trim().toLowerCase().email().max(150).optional(),
});
const editar = z.object({
  nombreCompleto: z.string().trim().min(3).max(150).optional(),
  email: z.string().trim().toLowerCase().email().max(150).nullable().optional(),
  activo: z.boolean().optional(),
});
const filtro = z.object({
  q: z.string().trim().max(80).optional(),
  rol: z.enum(['ADMIN', 'DOCENTE', 'ESTUDIANTE']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(20),
});

const publico = {
  id: true,
  documento: true,
  nombreCompleto: true,
  rol: true,
  email: true,
  activo: true,
  debeCambiarClave: true,
  ultimoIngreso: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: z.output<typeof filtro>) {
    const where: Prisma.UsuarioWhereInput = {
      ...(f.rol ? { rol: f.rol } : {}),
      ...(f.q
        ? {
            OR: [
              { documento: { contains: f.q, mode: 'insensitive' } },
              { nombreCompleto: { contains: f.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [datos, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: publico,
        orderBy: { nombreCompleto: 'asc' },
        skip: (f.pagina - 1) * f.tamano,
        take: f.tamano,
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { datos, total, pagina: f.pagina, tamano: f.tamano };
  }

  async crear(d: z.output<typeof crear>) {
    if (await this.prisma.usuario.findUnique({ where: { documento: d.documento } })) {
      throw new ConflictException('Ya existe un usuario con ese documento.');
    }
    const n = parsearNombre(d.nombreCompleto);
    return this.prisma.usuario.create({
      data: {
        ...d,
        primerApellido: n.primerApellido.slice(0, 60),
        primerNombre: n.primerNombre.slice(0, 60),
        passwordHash: await argon2.hash(this.claveBase(d.documento, d.nombreCompleto, d.rol)),
      },
      select: publico,
    });
  }

  async editar(id: number, d: z.output<typeof editar>) {
    await this.buscar(id);
    if (d.activo === false) {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: id, revocadoEn: null },
        data: { revocadoEn: new Date() },
      });
    }
    return this.prisma.usuario.update({ where: { id }, data: d, select: publico });
  }

  async reiniciarClave(id: number): Promise<void> {
    const u = await this.buscar(id);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id },
        data: {
          passwordHash: await argon2.hash(this.claveBase(u.documento, u.nombreCompleto, u.rol)),
          debeCambiarClave: true,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { usuarioId: id, revocadoEn: null },
        data: { revocadoEn: new Date() },
      }),
    ]);
  }

  private claveBase(documento: string, nombre: string, rol: Rol): string {
    return rol === Rol.ADMIN
      ? normalizarClave(documento + parsearNombre(nombre).primerApellido)
      : claveInicial(documento, nombre, rol);
  }

  private async buscar(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    return u;
  }
}

@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly servicio: UsuariosService) {}

  @Get()
  listar(@Query(new ZodPipe(filtro)) f: z.output<typeof filtro>) {
    return this.servicio.listar(f);
  }

  @Post()
  crear(@Body(new ZodPipe(crear)) d: z.output<typeof crear>) {
    return this.servicio.crear(d);
  }

  @Patch(':id')
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodPipe(editar)) d: z.output<typeof editar>,
  ) {
    return this.servicio.editar(id, d);
  }

  @Post(':id/reiniciar-clave')
  @HttpCode(204)
  reiniciar(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.reiniciarClave(id);
  }
}

@Module({ controllers: [UsuariosController], providers: [UsuariosService] })
export class UsuariosModule {}
