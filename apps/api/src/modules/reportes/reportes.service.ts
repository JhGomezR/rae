import { Injectable, NotFoundException } from '@nestjs/common';
import { Momento, nivelDePct, Rol } from '@rae/shared';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PlanService } from '../resultados/plan.service';
import { ResultadosService } from '../resultados/resultados.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fuentes = require('pdfmake/build/vfs_fonts') as {
  pdfMake?: { vfs: Record<string, string> };
  vfs?: Record<string, string>;
} & Record<string, unknown>;
const vfs = (fuentes.pdfMake?.vfs ?? fuentes.vfs ?? fuentes) as Record<string, string>;
const fuente = (a: string) => Buffer.from(vfs[a] as string, 'base64');

const COMUNES = [
  'Periodo',
  'Momento',
  'Nro',
  'Unidad de Formación',
  'Semestre/Ciclo',
  'Sede',
  'Grupo',
];
const CURRICULARES = [
  'Objetivos de Aprendizaje',
  'Competencias Específicas',
  'Competencias Genéricas',
  'RAE',
  'Afirmación evaluada',
];
const COL_DOCENTE = [
  ...COMUNES,
  'Profesor',
  ...CURRICULARES,
  'Evidencia',
  'Instrumento',
  'Nº Estudiantes Evaluados',
  'Nº que alcanzan el RA',
  '% Logro',
  'Nivel de logro del RA',
  'Pregunta práctica (docente)',
  'Respuesta',
  '¿Correcta?',
  'Observaciones',
];
const COL_ESTUDIANTE = [
  ...COMUNES,
  'Estudiante',
  ...CURRICULARES,
  'Pregunta práctica',
  'Respuesta',
  '¿Correcta?',
  '% Logro (pregunta práctica)',
  'Nivel percibido',
  'Observaciones',
];

const NOMBRE_NIVEL = ['', 'Bajo', 'Básico', 'Alto', 'Superior'];
const siNo = (v: boolean | null) => (v === null ? '' : v ? 'Sí' : 'No');
/** Evita que Excel ejecute como fórmula un texto escrito por un usuario. */
const seguro = (v: string | null | undefined) => {
  const t = v ?? '';
  return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
};

@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resultados: ResultadosService,
    private readonly plan: PlanService,
  ) {}

  async matriz(res: Response, rol: Rol, momento: Momento, periodoId?: number): Promise<void> {
    const periodo = await this.resultados.periodo(periodoId);
    if (!periodo) throw new NotFoundException('No hay un periodo activo.');
    const esDocente = rol === Rol.DOCENTE;
    const columnas = esDocente ? COL_DOCENTE : COL_ESTUDIANTE;
    const nombre = `matriz-${esDocente ? 'profesores' : 'estudiantes'}-${momento.toLowerCase()}-${periodo.codigo}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);

    const libro = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true });
    const hoja = libro.addWorksheet('Matriz', { views: [{ state: 'frozen', ySplit: 1 }] });
    hoja.columns = columnas.map((header) => ({
      header,
      width: Math.max(14, Math.min(40, header.length + 4)),
    }));
    const cabecera = hoja.getRow(1);
    cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5C63' } };
    cabecera.alignment = { wrapText: true, vertical: 'middle' };
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
    cabecera.commit();

    let ultimoId = 0;
    for (;;) {
      const lote = await this.prisma.encuesta.findMany({
        where: { periodoId: periodo.id, rol, momento, estado: 'ENVIADA', id: { gt: ultimoId } },
        orderBy: { id: 'asc' },
        take: 200,
        include: {
          usuario: { select: { nombreCompleto: true } },
          curso: { include: { unidad: true, sede: true } },
          items: { include: { item: { include: { competencia: true } } } },
        },
      });
      if (!lote.length) break;
      ultimoId = (lote.at(-1) as { id: number }).id;
      for (const e of lote) {
        const g = e.general as Record<string, unknown>;
        const nota = g.observaciones ?? g.expectativas;
        const obs = seguro(typeof nota === 'string' ? nota : '');
        for (const r of e.items) {
          const s = r.item.seccion;
          const etiqueta = r.item.competencia?.codigo ? `${r.item.competencia.codigo}: ` : '';
          const texto = `${etiqueta}${r.item.texto}`;
          const base = [
            periodo.codigo,
            momento === Momento.APRECIACION ? 'Apreciación' : 'Alcance',
            e.curso.unidad.id,
            e.curso.unidad.nombre,
            `${e.curso.unidad.semestre} · ${e.curso.unidad.ciclo === 'TECNOLOGICO' ? 'Tecnológico' : 'Profesional'}`,
            e.curso.sede.codigo,
            e.curso.grupo,
            seguro(e.usuario.nombreCompleto),
            s === 'OBJETIVO' ? texto : '',
            s === 'ESPECIFICA' ? texto : '',
            s === 'GENERICA' ? texto : '',
            s === 'RAE' ? texto : '',
            r.textoItem ?? '',
          ];
          const pregunta = [r.enunciadoPregunta ?? '', r.textoRespuesta ?? '', siNo(r.acierto)];
          if (esDocente) {
            const pct = r.evaluados ? Math.round(((r.alcanzan ?? 0) / r.evaluados) * 100) : null;
            hoja
              .addRow([
                ...base,
                seguro(r.evidencia),
                r.instrumento ?? '',
                r.evaluados ?? '',
                r.alcanzan ?? '',
                pct ?? '',
                r.nivel ? NOMBRE_NIVEL[r.nivel] : pct !== null ? nivelDePct(pct).nombre : '',
                ...pregunta,
                obs,
              ])
              .commit();
          } else {
            hoja
              .addRow([
                ...base,
                ...pregunta,
                r.acierto === null ? '' : r.acierto ? 100 : 0,
                r.nivel ? NOMBRE_NIVEL[r.nivel] : '',
                obs,
              ])
              .commit();
          }
        }
      }
    }
    hoja.commit();
    await libro.commit();
  }

  async planPdf(res: Response, periodoId?: number): Promise<void> {
    const { periodo, caracteristicas } = await this.plan.calcular(periodoId);
    if (!periodo) throw new NotFoundException('No hay un periodo activo.');
    const printer = new PdfPrinter({
      Roboto: {
        normal: fuente('Roboto-Regular.ttf'),
        bold: fuente('Roboto-Medium.ttf'),
        italics: fuente('Roboto-Italic.ttf'),
        bolditalics: fuente('Roboto-MediumItalic.ttf'),
      },
    });
    const ESTADOS: Record<string, string> = {
      CUMPLE: 'Cumple',
      EN_PROGRESO: 'En progreso',
      NO_CUMPLE: 'No cumple',
      SIN_DATOS: 'Sin datos',
      INFORMATIVO: 'Informativo',
    };
    const valor = (v: unknown) =>
      typeof v === 'number' || typeof v === 'string' ? String(v) : '—';
    const contenido: Content[] = [
      { text: 'Plan de mejoramiento', style: 'titulo' },
      { text: `Características 18 a 24 · Periodo ${periodo.codigo}`, margin: [0, 0, 0, 4] },
      {
        text: `Generado el ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`,
        color: '#4b5b5f',
        margin: [0, 0, 0, 16],
      },
    ];
    for (const c of caracteristicas) {
      const ind = c.indicadores as Record<string, unknown>;
      const simples = Object.entries(ind).filter(([, v]) => v === null || typeof v !== 'object');
      contenido.push(
        {
          text: `Características ${c.numeros.replaceAll(',', ', ')}: ${c.nombre}`,
          style: 'seccion',
        },
        {
          text: [{ text: 'Estado: ', bold: true }, ESTADOS[c.estado] ?? c.estado],
          margin: [0, 0, 0, 4],
        },
        { text: [{ text: 'Objetivo: ', bold: true }, c.objetivo], margin: [0, 0, 0, 4] },
        { text: [{ text: 'Meta: ', bold: true }, c.meta], margin: [0, 0, 0, 8] },
      );
      if (simples.length) {
        contenido.push({
          table: {
            widths: ['*', 70],
            body: simples.map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toLowerCase(), valor(v)]),
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 8],
        });
      }
      const comp = ind.competencias as
        | {
            codigo: string;
            unidades: number;
            nivelPercibido: number | null;
            aciertos: number | null;
            logroDocente: number | null;
          }[]
        | undefined;
      if (comp?.length) {
        contenido.push({
          table: {
            headerRows: 1,
            widths: ['*', 50, 60, 60, 60],
            body: [
              ['Competencia', 'Unidades', 'Nivel', '% aciertos', '% logro'].map((text) => ({
                text,
                bold: true,
              })),
              ...comp.map((x) => [
                x.codigo,
                valor(x.unidades),
                valor(x.nivelPercibido),
                valor(x.aciertos),
                valor(x.logroDocente),
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        });
      }
    }
    const doc: TDocumentDefinitions = {
      content: contenido,
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25 },
      styles: {
        titulo: { fontSize: 22, bold: true, color: '#0f5c63', margin: [0, 0, 0, 6] },
        seccion: { fontSize: 13, bold: true, color: '#0f5c63', margin: [0, 14, 0, 6] },
      },
      pageMargins: [48, 48, 48, 48],
      footer: (p, t) => ({
        text: `${p} de ${t}`,
        alignment: 'center',
        fontSize: 8,
        color: '#7a878a',
      }),
    };
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="plan-mejoramiento-${periodo.codigo}.pdf"`,
    );
    const pdf = printer.createPdfKitDocument(doc);
    pdf.pipe(res);
    pdf.end();
  }
}
