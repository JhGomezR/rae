import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PlanService } from '../resultados/plan.service';
import { ResultadosService } from '../resultados/resultados.service';
import { CompetenciaPlan, construirContenido, DatosInforme } from './constructor-informes';
import {
  AjustesInforme,
  ClaveInforme,
  CLAVES_INFORME,
  Firmante,
  Informe,
  TEXTOS_PLANTILLA,
} from './informe.tipos';

const CLAVE_FIRMA = 'firma-informes';
const PROGRAMA = 'INGENIERÍA DE SISTEMAS POR CICLOS';
const LUGAR = 'MOCOA - COLÓN';
const CARGO = 'Decano Facultad TIC';

const lineas = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function fechaHoy(): string {
  return new Date()
    .toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Bogota',
    })
    .toUpperCase();
}

@Injectable()
export class InformesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resultados: ResultadosService,
    private readonly plan: PlanService,
  ) {}

  private async datos(periodoId?: number) {
    const periodo = await this.resultados.periodo(periodoId);
    if (!periodo) return null;
    const [encuestas, totalUnidades, recomendacionesPeriodo, seguimientos, plan, ajustes] =
      await Promise.all([
        this.resultados.cargar(periodo.id),
        this.prisma.unidadFormacion.count({ where: { activo: true } }),
        this.prisma.recomendacion.count({ where: { periodoId: periodo.id } }),
        this.prisma.seguimientoRecomendacion.findMany({
          where: { curso: { periodoId: periodo.id } },
          select: { estado: true },
        }),
        this.plan.calcular(periodo.id),
        this.prisma.informeAjuste.findMany({ where: { periodoId: periodo.id } }),
      ]);
    const caracteristica = plan.caracteristicas.find((c) => c.numeros === '22,23,24');
    const indicadores: Record<string, unknown> = caracteristica?.indicadores ?? {};
    const competencias = indicadores.competencias;
    const base: DatosInforme = {
      periodo: { codigo: periodo.codigo, anio: periodo.anio, numero: periodo.numero },
      encuestas,
      totalUnidades,
      recomendacionesPeriodo,
      seguimientos: seguimientos.map((s) => s.estado),
      competencias: Array.isArray(competencias) ? (competencias as CompetenciaPlan[]) : [],
    };
    return {
      periodo,
      base,
      ajustes: new Map(ajustes.map((a) => [a.clave, a.datos as AjustesInforme])),
    };
  }

  private armar(clave: ClaveInforme, base: DatosInforme, a: AjustesInforme = {}): Informe {
    const c = construirContenido(clave, base);
    const t = TEXTOS_PLANTILLA[clave];
    const bloques = a.analisis?.trim()
      ? [
          ...c.bloques,
          { tipo: 'subtitulo' as const, texto: 'Análisis del programa' },
          ...lineas(a.analisis).map((texto) => ({ tipo: 'parrafo' as const, texto })),
        ]
      : c.bloques;
    return {
      clave,
      titulo: t.aspecto,
      caracteristicas: t.caracteristicas.join(' '),
      meta: c.meta,
      periodo: base.periodo.codigo,
      kpis: c.kpis,
      bloques,
      programa: a.programa || PROGRAMA,
      lugar: a.lugar || LUGAR,
      fechaEntrega: a.fechaEntrega || fechaHoy(),
      porcentaje: a.porcentaje ?? c.porcentaje,
      logros: a.logros?.trim() ? lineas(a.logros) : c.logros,
      impactos: a.impactos?.trim() ? lineas(a.impactos) : c.impactos,
      presupuesto: a.presupuesto || 'N/A',
      anexos: a.anexos || 'N/A',
      ajustes: a,
    };
  }

  async listar(periodoId?: number) {
    const d = await this.datos(periodoId);
    if (!d) return { periodo: null, informes: [] };
    return {
      periodo: { id: d.periodo.id, codigo: d.periodo.codigo },
      informes: CLAVES_INFORME.map((c) => this.armar(c, d.base, d.ajustes.get(c))),
    };
  }

  async uno(clave: ClaveInforme, periodoId?: number): Promise<Informe> {
    const d = await this.datos(periodoId);
    if (!d) throw new NotFoundException('No hay un periodo activo.');
    return this.armar(clave, d.base, d.ajustes.get(clave));
  }

  async guardarAjustes(clave: ClaveInforme, periodoId: number | undefined, a: AjustesInforme) {
    const periodo = await this.resultados.periodo(periodoId);
    if (!periodo) throw new NotFoundException('No hay un periodo activo.');
    const datos: Prisma.InputJsonObject = Object.fromEntries(
      Object.entries(a).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    );
    await this.prisma.informeAjuste.upsert({
      where: { periodoId_clave: { periodoId: periodo.id, clave } },
      create: { periodoId: periodo.id, clave, datos },
      update: { datos },
    });
    return this.uno(clave, periodo.id);
  }

  async configuracion() {
    const [valores, firma] = await Promise.all([
      this.prisma.configuracion.findMany({
        where: { clave: { in: ['informe-firmante', 'informe-cargo'] } },
      }),
      this.prisma.archivoSistema.findUnique({
        where: { clave: CLAVE_FIRMA },
        select: { clave: true },
      }),
    ]);
    const valor = (c: string) => valores.find((v) => v.clave === c)?.valor;
    return {
      nombre: valor('informe-firmante') ?? '',
      cargo: valor('informe-cargo') ?? CARGO,
      tieneFirma: Boolean(firma),
    };
  }

  async guardarConfiguracion(nombre: string, cargo: string) {
    for (const [clave, valor] of [
      ['informe-firmante', nombre],
      ['informe-cargo', cargo],
    ] as const) {
      await this.prisma.configuracion.upsert({
        where: { clave },
        create: { clave, valor },
        update: { valor },
      });
    }
    return this.configuracion();
  }

  async guardarFirma(archivo: Express.Multer.File | undefined) {
    const b = archivo?.buffer;
    const png = b?.subarray(0, 4).toString('hex') === '89504e47';
    const jpg = b?.subarray(0, 3).toString('hex') === 'ffd8ff';
    if (!b || (!png && !jpg)) throw new BadRequestException('Sube una imagen PNG o JPG.');
    const tipo = png ? 'image/png' : 'image/jpeg';
    const datos = new Uint8Array(b);
    await this.prisma.archivoSistema.upsert({
      where: { clave: CLAVE_FIRMA },
      create: { clave: CLAVE_FIRMA, tipo, datos },
      update: { tipo, datos },
    });
    return this.configuracion();
  }

  async quitarFirma() {
    await this.prisma.archivoSistema.deleteMany({ where: { clave: CLAVE_FIRMA } });
    return this.configuracion();
  }

  async firmante(conFirma: boolean): Promise<Firmante> {
    const c = await this.configuracion();
    if (!conFirma || !c.tieneFirma) return { nombre: c.nombre, cargo: c.cargo };
    const a = await this.prisma.archivoSistema.findUniqueOrThrow({ where: { clave: CLAVE_FIRMA } });
    return {
      nombre: c.nombre,
      cargo: c.cargo,
      firma: {
        datos: Buffer.from(a.datos),
        tipo: a.tipo === 'image/png' ? 'image/png' : 'image/jpeg',
      },
    };
  }
}
