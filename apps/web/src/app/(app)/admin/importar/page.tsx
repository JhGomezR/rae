'use client';

import { useState } from 'react';
import { Encabezado, Kpi } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Resumen {
  filas: number;
  validas: number;
  periodos: string[];
  sedes: string[];
  estudiantes: { nuevos: number; existentes: number };
  docentes: { nuevos: number; existentes: number };
  cursos: number;
  inscripciones: number;
  nombresPorRevisar: number;
  unidadesSinEmparejar: string[];
}
interface Vista {
  importacionId: number;
  resumen: Resumen;
  errores: { fila: number; motivo: string; valor: string }[];
}
interface Unidad {
  id: number;
  nombre: string;
}

export default function ImportarPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const { datos: unidades } = useDatos<Unidad[]>('/curriculo/unidades');
  const [alias, setAlias] = useState<Record<string, string>>({});

  const correr = async (f: () => Promise<void>) => {
    setOcupado(true);
    setAviso('');
    try {
      await f();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo completar.');
    } finally {
      setOcupado(false);
    }
  };
  const previsualizar = () =>
    correr(async () => {
      if (!archivo) return;
      const form = new FormData();
      form.append('archivo', archivo);
      setVista(await api<Vista>('/importaciones/consolidado/previsualizar', 'POST', form));
    });
  const aplicar = () =>
    correr(async () => {
      if (!vista) return;
      const r = await api<{ usuariosNuevos: number }>(
        `/importaciones/${vista.importacionId}/aplicar`,
        'POST',
      );
      setVista(null);
      setArchivo(null);
      setAviso(`Importación aplicada. Usuarios nuevos: ${r.usuariosNuevos}.`);
    });
  const guardarAlias = (nombre: string) =>
    correr(async () => {
      await api('/alias-unidades', 'POST', { alias: nombre, unidadId: Number(alias[nombre]) });
      await previsualizar();
    });

  const r = vista?.resumen;
  return (
    <>
      <Encabezado
        titulo="Importar consolidado"
        texto="Carga estudiantes, docentes, cursos e inscripciones. Primero verás una vista previa; nada se guarda hasta confirmar."
      />
      <section className="card mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Archivo Excel (.xlsx)
          <input
            className="input mt-1 font-normal"
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setVista(null);
            }}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={!archivo || ocupado}
          onClick={() => void previsualizar()}
        >
          {ocupado ? 'Procesando…' : 'Ver vista previa'}
        </button>
      </section>
      {aviso && (
        <p role="status" className="card mb-4">
          {aviso}
        </p>
      )}
      {r && vista && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              titulo="Filas válidas"
              valor={`${r.validas} de ${r.filas}`}
              nota={r.periodos.join(', ')}
            />
            <Kpi
              titulo="Estudiantes"
              valor={String(r.estudiantes.nuevos + r.estudiantes.existentes)}
              nota={`${r.estudiantes.nuevos} nuevos`}
            />
            <Kpi
              titulo="Docentes"
              valor={String(r.docentes.nuevos + r.docentes.existentes)}
              nota={`${r.docentes.nuevos} nuevos`}
            />
            <Kpi
              titulo="Cursos"
              valor={String(r.cursos)}
              nota={`${r.inscripciones} inscripciones`}
            />
          </div>
          {r.nombresPorRevisar > 0 && (
            <p className="card text-sm">
              {r.nombresPorRevisar} personas tienen un nombre corto: revisa su clave inicial si no
              logran ingresar (se puede reiniciar en Usuarios).
            </p>
          )}
          {r.unidadesSinEmparejar.map((n) => (
            <div key={n} className="card flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1 text-sm font-semibold">
                Unidad sin emparejar: {n}
                <select
                  className="input mt-1 font-normal"
                  value={alias[n] ?? ''}
                  onChange={(e) => setAlias({ ...alias, [n]: e.target.value })}
                >
                  <option value="">Selecciona la unidad</option>
                  {unidades?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn"
                disabled={!alias[n] || ocupado}
                onClick={() => void guardarAlias(n)}
              >
                Emparejar
              </button>
            </div>
          ))}
          {vista.errores.length > 0 && (
            <details className="card" open>
              <summary className="cursor-pointer font-semibold">
                {vista.errores.length} filas no se cargarán
              </summary>
              <div className="tabla-wrap mt-3 max-h-72 overflow-y-auto">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Motivo</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vista.errores.slice(0, 200).map((e, i) => (
                      <tr key={i}>
                        <td>{e.fila}</td>
                        <td>{e.motivo}</td>
                        <td>{e.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          <button
            className="btn btn-primary"
            disabled={ocupado || r.validas === 0}
            onClick={() => void aplicar()}
          >
            {ocupado ? 'Aplicando…' : `Confirmar e importar ${r.validas} filas`}
          </button>
        </div>
      )}
    </>
  );
}
