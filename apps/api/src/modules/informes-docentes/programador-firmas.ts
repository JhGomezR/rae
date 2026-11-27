import type { DatosProgramador } from '@rae/shared';
import { ContextoInforme, EncabezadoFormato, fechaCorta } from './contexto';

export const FORMATO_PROGRAMADOR: EncabezadoFormato = {
  codigo: 'F-DOC-052',
  version: '02',
  fecha: '12-08-2025',
  titulo: 'PROGRAMADOR DE CLASES',
};

export interface FechasProgramador {
  revision: string;
  aprobacion: string;
}

/** La revisión y la aprobación se fechan cuando el informe queda aprobado. */
export function fechasProgramador(i: {
  estado: string;
  revisadoEn: Date | null;
}): FechasProgramador {
  const f =
    i.estado === 'APROBADO' && i.revisadoEn
      ? fechaCorta(i.revisadoEn.toISOString().slice(0, 10))
      : '';
  return { revision: f, aprobacion: f };
}

export interface Firma {
  rotulo: string;
  nombre: string;
  cargo: string;
  etiquetaFecha: string;
  fecha: string;
}

/** Elaboró (docente), revisó (director de programa) y aprobó (decano), como en el formato. */
export function firmasProgramador(
  d: DatosProgramador,
  c: ContextoInforme,
  f: FechasProgramador,
): Firma[] {
  return [
    {
      rotulo: 'Elaboró:',
      nombre: c.docente.nombre,
      cargo: 'DOCENTE',
      etiquetaFecha: 'Fecha elaboración',
      fecha: fechaCorta(d.fecha),
    },
    {
      rotulo: 'Revisó:',
      nombre: c.firmantes.director,
      cargo: d.programa
        ? `DIRECTOR DEL PROGRAMA DE ${d.programa.toUpperCase()}`
        : 'DIRECTOR DE PROGRAMA',
      etiquetaFecha: 'Fecha revisión',
      fecha: f.revision,
    },
    {
      rotulo: 'Aprobó:',
      nombre: c.firmantes.decano,
      cargo: d.facultad ? `DECANO ${d.facultad.toUpperCase()}` : 'DECANO DE FACULTAD',
      etiquetaFecha: 'Fecha aprobación',
      fecha: f.aprobacion,
    },
  ];
}

/** Columnas de la tabla de semanas del formato. */
export const COLUMNAS_PROGRAMADOR = [
  'Tiempo en semanas',
  'Contenidos del syllabus a desarrollar',
  'Didácticas pedagógicas en aula',
  'Individuales',
  'Grupales',
  'Recursos – medios educativos requeridos',
  'Observaciones',
] as const;
