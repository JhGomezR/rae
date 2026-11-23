import { normalizarClave, nombreAmbiguo, normalizarNombreUnidad, Rol } from '@rae/shared';
import ExcelJS from 'exceljs';

export interface FilaConsolidado {
  periodo: string;
  sede: string;
  programa: string;
  semestre: number;
  grupo: string;
  idEstudiante: string;
  estudiante: string;
  idDocente: string;
  docente: string;
  unidadId: number;
}

export interface ErrorFila {
  fila: number;
  motivo: string;
  valor: string;
}

const COLUMNAS = {
  periodo: 'PERIODO',
  sede: 'SEDE',
  programa: 'PROGRAMA',
  semestre: 'SEMESTRE',
  grupo: 'GRUPO',
  idEstudiante: 'IDESTUDIANTE',
  estudiante: 'ESTUDIANTE',
  idDocente: 'IDDOCENTE',
  docente: 'DOCENTE',
  unidad: 'UNIDADDEFORMACION',
} as const;

function texto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object') {
    if ('result' in valor)
      return typeof valor.result === 'object' ? '' : String(valor.result ?? '').trim();
    if ('richText' in valor)
      return valor.richText
        .map((r) => r.text)
        .join('')
        .trim();
    if ('text' in valor) return String(valor.text).trim();
  }
  return typeof valor === 'object' ? '' : String(valor).trim();
}

const documento = (v: string) => v.replace(/\.0+$/, '').replace(/\D/g, '');

export interface LecturaConsolidado {
  filas: FilaConsolidado[];
  errores: ErrorFila[];
  unidadesSinEmparejar: string[];
  ambiguos: number;
  totalFilas: number;
}

/** Lee y valida el archivo; no escribe en la base de datos. */
export async function leerConsolidado(
  archivo: Buffer,
  unidades: Map<string, number>,
): Promise<LecturaConsolidado> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(archivo as unknown as ArrayBuffer);
  const hoja = libro.worksheets[0];
  if (!hoja) throw new Error('El archivo no tiene hojas.');

  const indice = new Map<string, number>();
  hoja.getRow(1).eachCell((celda, col) => indice.set(normalizarClave(texto(celda.value)), col));
  const faltantes = Object.values(COLUMNAS).filter((c) => !indice.has(c));
  if (faltantes.length) throw new Error(`Faltan columnas: ${faltantes.join(', ')}.`);

  const filas: FilaConsolidado[] = [];
  const errores: ErrorFila[] = [];
  const sinPareja = new Set<string>();
  const rolPorDocumento = new Map<string, Rol>();
  const ambiguos = new Set<string>();
  let totalFilas = 0;

  hoja.eachRow((row, n) => {
    if (n === 1) return;
    const leer = (c: string) => texto(row.getCell(indice.get(c) as number).value);
    const unidad = leer(COLUMNAS.unidad);
    if (!unidad && !leer(COLUMNAS.idEstudiante)) return;
    totalFilas++;

    const idEstudiante = documento(leer(COLUMNAS.idEstudiante));
    const idDocente = documento(leer(COLUMNAS.idDocente));
    const estudiante = leer(COLUMNAS.estudiante);
    const docente = leer(COLUMNAS.docente);
    const periodo = leer(COLUMNAS.periodo);
    const unidadId = unidades.get(normalizarNombreUnidad(unidad));

    const falla = (motivo: string, valor: string) => errores.push({ fila: n, motivo, valor });
    if (!/^\d{4}-[12]$/.test(periodo)) return void falla('Periodo no válido', periodo);
    if (idEstudiante.length < 5) return void falla('Fila sin ID.ESTUDIANTE', unidad);
    if (idDocente.length < 5) return void falla('Fila sin ID.DOCENTE', unidad);
    if (!unidadId) {
      sinPareja.add(unidad);
      return void falla('Unidad sin emparejar', unidad);
    }
    if ((rolPorDocumento.get(idEstudiante) ?? Rol.ESTUDIANTE) !== Rol.ESTUDIANTE) {
      return void falla('El documento aparece como docente y estudiante', `fila ${n}`);
    }
    if ((rolPorDocumento.get(idDocente) ?? Rol.DOCENTE) !== Rol.DOCENTE) {
      return void falla('El documento aparece como docente y estudiante', `fila ${n}`);
    }
    rolPorDocumento.set(idEstudiante, Rol.ESTUDIANTE);
    rolPorDocumento.set(idDocente, Rol.DOCENTE);
    if (nombreAmbiguo(estudiante, Rol.ESTUDIANTE)) ambiguos.add(idEstudiante);
    if (nombreAmbiguo(docente, Rol.DOCENTE)) ambiguos.add(idDocente);

    filas.push({
      periodo,
      sede: leer(COLUMNAS.sede),
      programa: leer(COLUMNAS.programa),
      semestre: Number.parseInt(leer(COLUMNAS.semestre), 10) || 0,
      grupo: leer(COLUMNAS.grupo).slice(0, 5),
      idEstudiante,
      estudiante,
      idDocente,
      docente,
      unidadId,
    });
  });

  return {
    filas,
    errores,
    unidadesSinEmparejar: [...sinPareja],
    ambiguos: ambiguos.size,
    totalFilas,
  };
}
