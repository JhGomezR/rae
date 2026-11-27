import { BadRequestException } from '@nestjs/common';
import { TipoIndicadorPoa } from '@prisma/client';
import ExcelJS from 'exceljs';
import { MESES, TIPOS_INDICADOR } from './poa.tipos';

export interface EncabezadoPoa {
  vigencia: number;
  fechaElaboracion: Date;
  dependencia: string;
  areaFacultad: string;
  responsable: string;
  cargo: string;
}

export interface ActividadLeida {
  numero: number;
  ejePgr: string;
  ejePdi: string;
  programaPdi: string;
  subprograma: string;
  proyecto: string;
  metaVigencia: number | null;
  indicadorPdi: string;
  actividad: string;
  tipoIndicador: TipoIndicadorPoa | null;
  indicadorActividad: string;
  interpretacion: string | null;
  responsableEjecucion: string;
  meses: number[];
  presupuesto: number | null;
  observaciones: string | null;
}

const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Texto visible de una celda (texto enriquecido, fórmulas, hipervínculos, fechas). */
function texto(c: ExcelJS.Cell): string {
  const v = c.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('result' in v) {
      const r = v.result;
      return typeof r === 'string' || typeof r === 'number' || typeof r === 'boolean'
        ? String(r)
        : '';
    }
    if ('text' in v) return String(v.text);
    return '';
  }
  return String(v);
}

const limpio = (t: string, max: number) =>
  t
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, max);

function numero(t: string): number | null {
  const s = t.replace(/[^\d,.-]/g, '');
  if (!s) return null;
  // Formato colombiano: punto de miles y coma decimal.
  const n = Number(
    s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\.(?=\d{3}(\D|$))/g, ''),
  );
  return Number.isFinite(n) ? n : null;
}

function tipo(t: string): TipoIndicadorPoa | null {
  const n = sinTildes(t);
  const k = (Object.keys(TIPOS_INDICADOR) as TipoIndicadorPoa[]).find(
    (x) => sinTildes(TIPOS_INDICADOR[x].nombre) === n,
  );
  return k ?? null;
}

const INTERPRETACIONES = new Set([
  ...Object.values(TIPOS_INDICADOR).map((t) => sinTildes(t.interpretacion)),
  sinTildes('Sin interpretación definida.'),
]);

function fecha(c: ExcelJS.Cell): Date | null {
  if (c.value instanceof Date) return c.value;
  const m = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(texto(c));
  return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))) : null;
}

type Campo = keyof Omit<ActividadLeida, 'meses'>;

/** Columnas del F-PIN-001, por el texto del encabezado (fila de títulos o subtítulos). */
const COLUMNAS: { campo: Campo; exacto?: string; contiene?: string }[] = [
  { campo: 'numero', exacto: 'no.' },
  { campo: 'ejePgr', contiene: 'eje plan de gobierno' },
  { campo: 'ejePdi', exacto: 'eje' },
  { campo: 'programaPdi', exacto: 'programa' },
  { campo: 'subprograma', contiene: 'subprograma' },
  { campo: 'proyecto', contiene: 'nombre del proyecto' },
  { campo: 'metaVigencia', contiene: 'meta vigencia' },
  { campo: 'indicadorPdi', contiene: 'indicador pdi' },
  { campo: 'actividad', contiene: 'actividades del proyecto' },
  { campo: 'tipoIndicador', contiene: 'tipo de indicador' },
  { campo: 'indicadorActividad', contiene: 'indicador actividades' },
  { campo: 'interpretacion', contiene: 'interpretacion' },
  { campo: 'responsableEjecucion', contiene: 'responsable de ejecucion' },
  { campo: 'presupuesto', contiene: 'presupuesto' },
  { campo: 'observaciones', contiene: 'observaciones' },
];

function hojaPoa(wb: ExcelJS.Workbook): { ws: ExcelJS.Worksheet; fila: number } {
  for (const ws of wb.worksheets) {
    for (let r = 1; r <= Math.min(ws.rowCount, 40); r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= Math.min(ws.columnCount, 60); c++) {
        if (sinTildes(texto(row.getCell(c))) === 'actividades del proyecto') return { ws, fila: r };
      }
    }
  }
  throw new BadRequestException(
    'El archivo no tiene el formato F-PIN-001: falta la columna «ACTIVIDADES DEL PROYECTO».',
  );
}

function valorJunto(ws: ExcelJS.Worksheet, hasta: number, etiqueta: string): ExcelJS.Cell | null {
  for (let r = 1; r < hasta; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= ws.columnCount; c++) {
      const t = sinTildes(texto(row.getCell(c))).replace(/:$/, '');
      if (t !== etiqueta) continue;
      for (let d = c + 1; d <= ws.columnCount; d++) {
        const v = row.getCell(d);
        const s = sinTildes(texto(v)).replace(/:$/, '');
        if (s && s !== etiqueta) return v;
      }
    }
  }
  return null;
}

/** Lee un POA en formato F-PIN-001 (Excel institucional). */
export async function leerPoa(
  buffer: Buffer,
): Promise<{ encabezado: EncabezadoPoa; actividades: ActividadLeida[] }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException('No se pudo leer el archivo. Debe ser un Excel (.xlsx).');
  }
  const { ws, fila } = hojaPoa(wb);

  const celda = (etiqueta: string) => valorJunto(ws, fila, etiqueta);
  const txt = (etiqueta: string, max: number) => {
    const c = celda(etiqueta);
    return c ? limpio(texto(c), max) : '';
  };
  const cFecha = celda('fecha de elaboracion');
  const fechaElaboracion = (cFecha && fecha(cFecha)) ?? new Date();
  const cVigencia = celda('vigencia');
  const vigencia =
    numero(cVigencia ? texto(cVigencia) : '') ??
    numero(/\d{4}/.exec(ws.name)?.[0] ?? '') ??
    fechaElaboracion.getUTCFullYear();
  if (vigencia < 2000 || vigencia > 2100)
    throw new BadRequestException('La vigencia no es válida.');

  const columnas = new Map<Campo, number>();
  const meses = new Map<number, number>();
  for (let c = 1; c <= ws.columnCount; c++) {
    const sub = sinTildes(texto(ws.getRow(fila + 1).getCell(c)));
    const tit = sinTildes(texto(ws.getRow(fila).getCell(c)));
    const mes = MESES.findIndex((m) => sinTildes(m) === sub);
    if (mes >= 0) {
      meses.set(c, mes + 1);
      continue;
    }
    for (const etiqueta of [sub, tit]) {
      const col = COLUMNAS.find(
        (x) =>
          !columnas.has(x.campo) &&
          (x.exacto ? etiqueta === x.exacto : !!x.contiene && etiqueta.includes(x.contiene)),
      );
      if (col) {
        columnas.set(col.campo, c);
        break;
      }
    }
  }
  if (!columnas.has('actividad')) throw new BadRequestException('Falta la columna de actividades.');

  const actividades: ActividadLeida[] = [];
  let vacias = 0;
  for (let r = fila + 2; r <= ws.rowCount && vacias < 5; r++) {
    const row = ws.getRow(r);
    const t = (campo: Campo, max = 2000) => {
      const c = columnas.get(campo);
      return c ? limpio(texto(row.getCell(c)), max) : '';
    };
    const actividad = t('actividad');
    if (!actividad) {
      vacias += 1;
      continue;
    }
    vacias = 0;
    const interpretacion = t('interpretacion', 1000);
    actividades.push({
      numero: numero(t('numero')) ?? actividades.length + 1,
      ejePgr: t('ejePgr', 300),
      ejePdi: t('ejePdi', 500),
      programaPdi: t('programaPdi', 300),
      subprograma: t('subprograma', 300),
      proyecto: t('proyecto', 1000),
      metaVigencia: numero(t('metaVigencia')),
      indicadorPdi: t('indicadorPdi', 500),
      actividad,
      tipoIndicador: tipo(t('tipoIndicador')),
      indicadorActividad: t('indicadorActividad', 1000),
      interpretacion:
        interpretacion && !INTERPRETACIONES.has(sinTildes(interpretacion)) ? interpretacion : null,
      responsableEjecucion: t('responsableEjecucion', 300),
      meses: [...meses.entries()]
        .filter(([c]) => texto(row.getCell(c)).trim() !== '')
        .map(([, m]) => m),
      presupuesto: numero(t('presupuesto')),
      observaciones: t('observaciones') || null,
    });
  }
  if (!actividades.length) throw new BadRequestException('El archivo no tiene actividades.');

  return {
    encabezado: {
      vigencia,
      fechaElaboracion,
      dependencia: txt('dependencia', 300) || 'Programa académico',
      areaFacultad: txt('area/facultad', 150),
      responsable: txt('responsable', 150),
      cargo: txt('cargo', 150),
    },
    actividades,
  };
}
