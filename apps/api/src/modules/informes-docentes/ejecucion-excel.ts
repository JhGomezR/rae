import { join } from 'node:path';
import { DatosEjecucion, FilaEjecucion, LABORES_EJECUCION } from '@rae/shared';
import ExcelJS from 'exceljs';
import { ContextoInforme, fechaCorta } from './contexto';
import { CARPETA_DOCENTES } from './docx-tablas';

const INICIO = 12;
const COLUMNAS = 23; // A..W
/** «33%» o «8.25%», sin separador decimal colgando. */
const formatoPct = (v: number | null) => (v === null || Number.isInteger(v) ? '0"%"' : '0.0#"%"');

/** Filas de una actividad; siempre al menos una (vacía) para conservar el formato. */
export function filasDe(d: DatosEjecucion, clave: string): (FilaEjecucion | null)[] {
  const f = d.filas.filter((x) => x.actividad === clave);
  return f.length ? f : [null];
}

function alto(textos: string[], anchos: number[]): number {
  let lineas = 1;
  textos.forEach((t, i) => {
    const ancho = Math.max(4, (anchos[i] ?? 10) * 1.05);
    const n = t.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / ancho)), 0);
    lineas = Math.max(lineas, n);
  });
  return Math.max(30, Math.min(400, lineas * 13 + 8));
}

/** Excel con el formato F-DOC-004 diligenciado. */
export async function ejecucionExcel(
  d: DatosEjecucion,
  c: ContextoInforme,
  fechaAprobacion: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(CARPETA_DOCENTES, 'F-DOC-004.xlsx'));
  wb.creator = 'Seguimiento RAE';
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Plantilla F-DOC-004 inválida');
  ws.name = `Seguimiento corte ${d.corte}`;
  ws.getCell('C7').value = c.docente.nombre;
  ws.getCell('H7').value = d.facultad;
  ws.getCell('W7').value = fechaCorta(d.fechaElaboracion);
  ws.getCell('C8').value = d.escalafon;
  ws.getCell('H8').value = `${c.periodo.codigo} · corte ${d.corte}`;
  ws.getCell('W8').value = fechaAprobacion;

  const modelo = ws.getRow(INICIO);
  const estilos = Array.from({ length: COLUMNAS }, (_, i) => ({ ...modelo.getCell(i + 1).style }));
  const anchos = Array.from({ length: COLUMNAS }, (_, i) => ws.getColumn(i + 1).width ?? 10);
  let r = INICIO;
  for (const labor of LABORES_EJECUCION) {
    const inicioLabor = r;
    for (const a of labor.actividades) {
      const inicioActividad = r;
      for (const f of filasDe(d, a.clave)) {
        const fila = ws.getRow(r);
        estilos.forEach((e, i) => (fila.getCell(i + 1).style = { ...e }));
        fila.getCell(1).value = labor.titulo;
        fila.getCell(3).value = a.actividad;
        if (f) {
          const valores: [number, ExcelJS.CellValue][] = [
            [4, f.tarea || null],
            [5, f.meta || null],
            [6, f.indicador || null],
            [7, f.horas],
            [8, f.corte1],
            [9, f.corte2],
            [10, f.evidencias || null],
            [23, f.observaciones || null],
          ];
          valores.forEach(([col, v]) => (fila.getCell(col).value = v));
          fila.getCell(8).numFmt = formatoPct(f.corte1);
          fila.getCell(9).numFmt = formatoPct(f.corte2);
          f.meses.forEach((m) => (fila.getCell(10 + m).value = 'X'));
        }
        fila.height = alto(
          [
            f?.tarea ?? '',
            f?.meta ?? '',
            f?.indicador ?? '',
            f?.evidencias ?? '',
            f?.observaciones ?? '',
          ],
          [anchos[3], anchos[4], anchos[5], anchos[9], anchos[22]].map((x) => x ?? 10),
        );
        r += 1;
      }
      // Que el nombre de la actividad quepa completo en sus filas.
      const necesario = alto([a.actividad], [anchos[2] ?? 17]);
      let disponible = 0;
      for (let k = inicioActividad; k < r; k++) disponible += ws.getRow(k).height ?? 30;
      if (disponible < necesario) {
        const ultima = ws.getRow(r - 1);
        ultima.height = (ultima.height ?? 30) + necesario - disponible;
      }
      if (r - 1 > inicioActividad) ws.mergeCells(inicioActividad, 3, r - 1, 3);
    }
    ws.mergeCells(inicioLabor, 1, r - 1, 2);
  }

  // Firmas, como en el formato.
  const firma = r + 3;
  const linea: Partial<ExcelJS.Borders> = { top: { style: 'thin' } };
  const pie = (fila: number, col1: number, col2: number, texto: string, negrita: boolean) => {
    ws.mergeCells(fila, col1, fila, col2);
    const k = ws.getCell(fila, col1);
    k.value = texto;
    k.font = { name: 'Calibri', size: 10, bold: negrita };
    k.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  pie(firma, 3, 4, c.docente.nombre, true);
  pie(firma + 1, 3, 4, 'Docente', false);
  pie(firma, 10, 22, c.firmantes.director || ' ', true);
  pie(firma + 1, 10, 22, 'Director de Programa', false);
  for (const col of [3, 4]) ws.getCell(firma, col).border = linea;
  for (let col = 10; col <= 22; col++) ws.getCell(firma, col).border = linea;
  ws.pageSetup.printArea = `A1:W${firma + 1}`;
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
