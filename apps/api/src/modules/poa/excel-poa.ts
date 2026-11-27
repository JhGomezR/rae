import { join } from 'node:path';
import ExcelJS from 'exceljs';
import type { PoaCompleto } from './poa.service';
import {
  Desempeno,
  ESTADOS,
  EstadoActividad,
  MESES,
  MESES_LARGOS,
  SEMAFOROS,
  Semaforo,
  TIPOS_INDICADOR,
} from './poa.tipos';

export const PLANTILLA_POA = join(__dirname, '..', '..', '..', 'assets', 'poa', 'F-PIN-001.xlsx');

const FILA_INICIO = 12;
const ULTIMA_COL = 28; // AB
const col = (n: number) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26))
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};
const relleno = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});
const COLOR_SEMAFORO: Record<Semaforo, string> = {
  SATISFACTORIO: 'FF63BE7B',
  ACEPTABLE: 'FFFFEB84',
  CRITICO: 'FFF8696B',
};
const COLOR_ESTADO: Record<EstadoActividad, string> = {
  CUMPLIDA: 'FF63BE7B',
  EN_CURSO: 'FFBDD7EE',
  ATRASADA: 'FFF8696B',
  SIN_INICIAR: 'FFE7E6E6',
};
const plano = (v: ExcelJS.CellValue) =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const PESOS = '"$" #,##0';

/** Alto de fila según el texto más largo, para que nada quede cortado al imprimir. */
function altoFila(ws: ExcelJS.Worksheet, r: number, desde: number, hasta: number): number {
  let lineas = 1;
  for (let c = desde; c <= hasta; c++) {
    const v = ws.getRow(r).getCell(c).value;
    if (typeof v !== 'string') continue;
    const ancho = Math.max(4, (ws.getColumn(c).width ?? 10) * 0.95);
    const n = v.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / ancho)), 0);
    lineas = Math.max(lineas, n);
  }
  return Math.max(30, Math.min(400, lineas * 15 + 6));
}

/** Combina celdas consecutivas iguales, como en el formato original. */
function combinar(ws: ExcelJS.Worksheet, c: number, filas: number, grupo: (i: number) => string) {
  let ini = 0;
  for (let i = 1; i <= filas; i++) {
    const igual =
      i < filas &&
      grupo(i) === grupo(ini) &&
      plano(ws.getCell(FILA_INICIO + i, c).value) ===
        plano(ws.getCell(FILA_INICIO + ini, c).value) &&
      plano(ws.getCell(FILA_INICIO + ini, c).value) !== '';
    if (igual) continue;
    if (i - 1 > ini) {
      for (let k = ini + 1; k < i; k++) ws.getCell(FILA_INICIO + k, c).value = null;
      ws.mergeCells(FILA_INICIO + ini, c, FILA_INICIO + i - 1, c);
    }
    ini = i;
  }
}

function hojaPoa(ws: ExcelJS.Worksheet, p: PoaCompleto) {
  ws.name = `POA ${p.vigencia}`;
  ws.getCell('E7').value = p.fechaElaboracion;
  ws.getCell('L7').value = p.dependencia;
  ws.getCell('AB7').value = p.areaFacultad;
  ws.getCell('E8').value = p.responsable;
  ws.getCell('L8').value = p.cargo;
  ws.getCell('AB8').value = p.vigencia;

  const modelo = ws.getRow(FILA_INICIO);
  const estilos = Array.from({ length: ULTIMA_COL }, (_, i) => ({
    ...modelo.getCell(i + 1).style,
  }));
  p.actividades.forEach((a, i) => {
    const r = FILA_INICIO + i;
    const fila = ws.getRow(r);
    estilos.forEach((e, c) => (fila.getCell(c + 1).style = { ...e }));
    const valores: [number, ExcelJS.CellValue][] = [
      [2, a.numero],
      [3, a.ejePgr],
      [4, a.ejePdi],
      [5, a.programaPdi],
      [6, a.subprograma],
      [7, a.proyecto],
      [8, a.metaVigencia === null ? null : Number(a.metaVigencia)],
      [9, a.indicadorPdi],
      [10, a.actividad],
      [11, a.tipoIndicador ? TIPOS_INDICADOR[a.tipoIndicador].nombre : null],
      [12, a.indicadorActividad],
      [
        13,
        a.interpretacion ??
          (a.tipoIndicador ? TIPOS_INDICADOR[a.tipoIndicador].interpretacion : null),
      ],
      [14, a.responsableEjecucion],
      [27, a.presupuesto === null ? null : Number(a.presupuesto)],
      [28, a.observaciones],
    ];
    valores.forEach(([c, v]) => (fila.getCell(c).value = v === '' ? null : v));
    a.meses.forEach((m) => (fila.getCell(14 + m).value = 'X'));
    fila.getCell(27).numFmt = PESOS;
    fila.height = altoFila(ws, r, 2, ULTIMA_COL);
  });
  const n = p.actividades.length;
  const numero = (i: number) => String(p.actividades[i]?.numero ?? '');
  combinar(ws, 2, n, numero);
  for (const c of [3, 4, 5, 6]) combinar(ws, c, n, () => '');
  for (const c of [7, 8, 9]) combinar(ws, c, n, numero);
  ws.pageSetup.printArea = `A1:AB${FILA_INICIO + Math.max(n, 1) + 1}`;
}

function copiarEstilo(desde: ExcelJS.Cell, hacia: ExcelJS.Cell) {
  hacia.style = { ...desde.style };
}

function hojaSeguimiento(
  wb: ExcelJS.Workbook,
  poa: ExcelJS.Worksheet,
  p: PoaCompleto,
  d: Desempeno,
) {
  const ws = wb.addWorksheet(`Seguimiento ${p.vigencia}`, {
    views: [{ zoomScale: 80, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 5,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
    },
  });
  const anchos = [2.4, 6.7, 46, 30, 13, 26, 14, 11, 11, 11, 13, 46, 30, 15, 15];
  anchos.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (let m = 0; m < 12; m++) ws.getColumn(16 + m).width = 6.5;
  const ultima = 27; // AA

  // Encabezado institucional igual al F-PIN-001.
  const imagen = poa.getImages()[0];
  if (imagen) ws.addImage(Number(imagen.imageId), 'B2:C5');
  const titulo = (rango: string, origen: string, valor: string) => {
    ws.mergeCells(rango);
    const c = ws.getCell(rango.split(':')[0] as string);
    copiarEstilo(poa.getCell(origen), c);
    c.value = valor;
  };
  titulo(`D2:${col(ultima - 5)}2`, 'D2', 'MACROPROCESO: ESTRATÉGICO');
  titulo(`D3:${col(ultima - 5)}4`, 'D3', 'PROCESO: PLANEACIÓN INSTITUCIONAL');
  titulo(`D5:${col(ultima - 5)}5`, 'D5', `SEGUIMIENTO PLAN OPERATIVO ANUAL ${p.vigencia}`);
  titulo(`${col(ultima - 4)}2:${col(ultima)}2`, 'AB2', 'Código: F-PIN-001');
  titulo(`${col(ultima - 4)}3:${col(ultima)}4`, 'AB3', plano(poa.getCell('AB3').value));
  titulo(`${col(ultima - 4)}5:${col(ultima)}5`, 'AB5', 'Página: 1 de 1');
  for (let c = 2; c <= 3; c++)
    for (let r = 2; r <= 5; r++) copiarEstilo(poa.getCell(r, c), ws.getCell(r, c));
  [2, 3, 4, 5].forEach((r) => (ws.getRow(r).height = poa.getRow(r).height));

  const corte = d.mesCorte ? `${MESES_LARGOS[d.mesCorte - 1]} de ${p.vigencia}` : 'sin iniciar';
  const datos: [string, string][] = [
    ['DEPENDENCIA:', p.dependencia],
    ['RESPONSABLE:', `${p.responsable}${p.cargo ? ` — ${p.cargo}` : ''}`],
    ['FECHA DE CORTE:', corte],
  ];
  datos.forEach(([k, v], i) => {
    const r = 7 + i;
    copiarEstilo(poa.getCell('B7'), ws.getCell(r, 2));
    ws.mergeCells(r, 2, r, 3);
    ws.getCell(r, 2).value = k;
    ws.mergeCells(r, 4, r, ultima);
    copiarEstilo(poa.getCell('E7'), ws.getCell(r, 4));
    ws.getCell(r, 4).value = v;
  });

  const cab = [
    'No.',
    'ACTIVIDADES DEL PROYECTO',
    'Indicador Actividades',
    'Tipo de indicador',
    'RESPONSABLE DE EJECUCIÓN',
    'Meses programados',
    'Avance esperado',
    'Avance real',
    'Índice',
    'Estado',
    'Último logro reportado',
    'Evidencia',
    'Presupuesto',
    'Ejecutado',
    ...MESES,
  ];
  const filaCab = 11;
  cab.forEach((t, i) => {
    const c = ws.getCell(filaCab, i + 2);
    copiarEstilo(poa.getCell(i + 2 >= 16 ? 'O11' : 'J10'), c);
    c.value = t;
  });
  ws.getRow(filaCab).height = 36;
  ws.mergeCells(filaCab - 1, 17, filaCab - 1, ultima);
  copiarEstilo(poa.getCell('O10'), ws.getCell(filaCab - 1, 17));
  ws.getCell(filaCab - 1, 17).value = 'AVANCE REPORTADO POR MES (%)';

  const modelo = poa.getCell('J12').style;
  p.actividades.forEach((a, i) => {
    const r = filaCab + 1 + i;
    const x = d.porActividad.find((y) => y.id === a.id);
    const ultimo = [...a.seguimientos].sort((s, t) => t.mes - s.mes)[0];
    const valores: ExcelJS.CellValue[] = [
      a.numero,
      a.actividad,
      a.indicadorActividad,
      a.tipoIndicador ? TIPOS_INDICADOR[a.tipoIndicador].nombre : '',
      a.responsableEjecucion,
      a.meses.map((m) => MESES[m - 1]).join(', '),
      (x?.esperado ?? 0) / 100,
      (x?.avance ?? 0) / 100,
      x && x.esperado > 0 ? Math.min(1, x.avance / x.esperado) : 1,
      x ? ESTADOS[x.estado] : '',
      x?.ultimoLogro ?? '',
      ultimo?.evidencia ?? '',
      a.presupuesto === null ? null : Number(a.presupuesto),
      x?.ejecutado || null,
      ...Array.from(
        { length: 12 },
        (_, m) => a.seguimientos.find((s) => s.mes === m + 1)?.avance ?? null,
      ),
    ];
    valores.forEach((v, k) => {
      const c = ws.getCell(r, k + 2);
      c.style = {
        ...modelo,
        alignment: { ...modelo.alignment, wrapText: true, vertical: 'middle' },
      };
      c.value = v;
      if (k >= 6 && k <= 8) c.numFmt = '0%';
      if (k === 12 || k === 13) c.numFmt = PESOS;
      if (k >= 14) c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    a.meses.forEach((m) => (ws.getCell(r, 15 + m).fill = relleno('FFDDEBF7')));
    if (x) ws.getCell(r, 11).fill = relleno(COLOR_ESTADO[x.estado]);
    ws.getRow(r).height = altoFila(ws, r, 3, 13);
  });

  // Resumen de desempeño.
  let r = filaCab + p.actividades.length + 3;
  const resumen: [string, ExcelJS.CellValue, string?][] = [
    ['RESUMEN DE DESEMPEÑO', ''],
    ['Actividades', d.actividades],
    ['Avance esperado promedio', d.esperado / 100, '0.0%'],
    ['Avance real promedio', d.avance / 100, '0.0%'],
    ['Índice de desempeño', d.indice / 100, '0.0%'],
    ['Semáforo', `${SEMAFOROS[d.semaforo].nombre} (${SEMAFOROS[d.semaforo].rango})`],
    ...(Object.keys(ESTADOS) as EstadoActividad[]).map((k): [string, ExcelJS.CellValue] => [
      `Actividades ${ESTADOS[k].toLowerCase()}`,
      d.estados[k],
    ]),
    ['Presupuesto programado', d.presupuesto, PESOS],
    ['Presupuesto ejecutado', d.ejecutado, PESOS],
  ];
  resumen.forEach(([k, v, fmt], i) => {
    const a = ws.getCell(r, 3);
    const b = ws.getCell(r, 4);
    copiarEstilo(poa.getCell(i === 0 ? 'J10' : 'B7'), a);
    a.value = k;
    b.style = { ...modelo };
    b.value = v;
    if (fmt) b.numFmt = fmt;
    if (k === 'Semáforo') b.fill = relleno(COLOR_SEMAFORO[d.semaforo]);
    r += 1;
  });
  ws.pageSetup.printArea = `A1:${col(ultima)}${r - 1}`;
}

/** Excel con el formato F-PIN-001 diligenciado y una hoja de seguimiento con el desempeño. */
export async function generarExcelPoa(p: PoaCompleto, d: Desempeno): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(PLANTILLA_POA);
  wb.creator = 'Seguimiento RAE';
  wb.lastModifiedBy = 'Seguimiento RAE';
  const poa = wb.getWorksheet('POA');
  if (!poa) throw new Error('Plantilla F-PIN-001 inválida');
  hojaPoa(poa, p);
  hojaSeguimiento(wb, poa, p, d);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
