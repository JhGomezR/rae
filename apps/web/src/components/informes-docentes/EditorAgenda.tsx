'use client';

import { alertasAgenda, horasAgenda, SECCIONES_AGENDA, type DatosAgenda } from '@rae/shared';
import { filaConDatos } from './agenda/ActividadAgenda';
import {
  identificacionCompleta,
  PasoIdentificacion,
  type DocenteAgenda,
} from './agenda/PasoIdentificacion';
import { MedidorHoras, ResumenAgenda } from './agenda/ResumenAgenda';
import { SeccionAgenda, subtotalDe } from './agenda/SeccionAgenda';
import { Asistente, type EstadoPaso, type Paso } from './Asistente';

/** Pasos del asistente: cada uno agrupa secciones del formato F-DOC-056. */
const GRUPOS = [
  { id: 'planeacion', titulo: 'Planeación', secciones: ['planeacion'] },
  { id: 'docencia', titulo: 'Docencia', secciones: ['directa', 'indirecta'] },
  { id: 'investigacion', titulo: 'Investigación', secciones: ['investigacion'] },
  { id: 'extension', titulo: 'Extensión', secciones: ['extension'] },
  { id: 'administrativa', titulo: 'Académico-administrativa', secciones: ['administrativa'] },
];

/**
 * Agenda semanal docente (F-DOC-056) como asistente por pasos: identificación, cada labor
 * y un resumen con las horas y las alertas. Con `lectura` sirve para revisar (todo a la vista).
 */
export function EditorAgenda({
  d,
  onCambio,
  lectura,
  docente,
}: {
  d: DatosAgenda;
  onCambio: (d: DatosAgenda) => void;
  lectura?: boolean;
  docente: DocenteAgenda;
}) {
  const set = <K extends keyof DatosAgenda>(k: K, v: DatosAgenda[K]) => onCambio({ ...d, [k]: v });
  const { porSeccion, total } = horasAgenda(d);
  const alertas = alertasAgenda(d);
  // Las secciones que no estén en un grupo (si el formato crece) van en un paso propio.
  const agrupadas = new Set(GRUPOS.flatMap((g) => g.secciones));
  const grupos = [
    ...GRUPOS,
    ...SECCIONES_AGENDA.filter((s) => !agrupadas.has(s.clave)).map((s) => ({
      id: s.clave,
      titulo: s.titulo.replace(/^[\d.]+\s*/, ''),
      secciones: [s.clave],
    })),
  ];

  const pasosLabor: Paso[] = grupos.map((g) => {
    const secciones = SECCIONES_AGENDA.filter((s) => g.secciones.includes(s.clave));
    const conDatos = secciones.some((s) =>
      s.actividades.some((a) => filaConDatos(d.actividades[a.clave])),
    );
    const excede =
      secciones.some((s) => subtotalDe(s, d)?.excede) ||
      (g.id === 'docencia' && alertas.some((a) => a.includes('docencia directa')));
    const horas = secciones.reduce((t, s) => t + (porSeccion[s.clave] ?? 0), 0);
    const estado: EstadoPaso = excede ? 'alerta' : conDatos ? 'listo' : 'pendiente';
    return {
      id: g.id,
      titulo: g.titulo,
      detalle: secciones.some((s) => s.conHoras) ? `${horas} h` : undefined,
      estado,
      contenido: (
        <div className="space-y-4">
          {secciones.map((s) => (
            <SeccionAgenda
              key={s.clave}
              s={s}
              d={d}
              lectura={lectura}
              onFila={(clave, f) => set('actividades', { ...d.actividades, [clave]: f })}
            />
          ))}
        </div>
      ),
    };
  });

  const pasos: Paso[] = [
    {
      id: 'identificacion',
      titulo: 'Identificación',
      estado: identificacionCompleta(d) ? 'listo' : 'pendiente',
      contenido: <PasoIdentificacion d={d} docente={docente} lectura={lectura} set={set} />,
    },
    ...pasosLabor,
  ];
  const resumen: Paso = {
    id: 'resumen',
    titulo: 'Resumen',
    estado: 'pendiente',
    contenido: (irA) => (
      <ResumenAgenda
        d={d}
        lectura={lectura}
        set={set}
        pendientes={pasos
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => p.estado === 'pendiente')
          .map(({ p, i }) => ({ titulo: p.titulo, ir: () => irA(i) }))}
      />
    ),
  };
  const alerta = total > 0 && alertas.length > 0;
  resumen.estado = alerta
    ? 'alerta'
    : (d.observacionesPlaneacion || d.observacionesEvaluacion) && total > 0
      ? 'listo'
      : 'pendiente';

  return <Asistente pasos={[...pasos, resumen]} lectura={lectura} barra={<MedidorHoras d={d} />} />;
}
