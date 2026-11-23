'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ChipNivel, Encabezado, Estado, pct, SinDatos } from '@/components/ui';
import { descargar, useDatos } from '@/lib/api';

interface Resumen {
  respuestas: number;
  nivel: number | null;
  aciertos: number | null;
  logro: number | null;
}
interface Fila {
  id: number;
  nombre: string;
  semestre: number;
  estudiantes: Resumen;
  docentes: Resumen;
}
interface Detalle {
  unidad: { nombre: string };
  items: {
    id: number;
    codigo: string | null;
    texto: string;
    estudiantes: { n: number; nivel: number | null; aciertos: number | null };
    docentes: { n: number; nivel: number | null; aciertos: number | null; logro: number | null };
  }[];
}

function DetalleUnidad({ momento, id }: { momento: string; id: number }) {
  const { datos, error, cargando } = useDatos<Detalle>(`/resultados/${momento}/unidades/${id}`);
  return (
    <Estado cargando={cargando} error={error}>
      <section className="mt-6">
        <h2 className="mb-3">{datos?.unidad.nombre}</h2>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Afirmación</th>
                <th>Estudiantes</th>
                <th>Aciertos</th>
                <th>Docentes</th>
                <th>Logro</th>
              </tr>
            </thead>
            <tbody>
              {datos?.items.map((i) => (
                <tr key={i.id}>
                  <td className="min-w-64">
                    {i.codigo && <span className="chip mr-2">{i.codigo}</span>}
                    {i.texto}
                  </td>
                  <td>
                    <ChipNivel valor={i.estudiantes.nivel} />
                  </td>
                  <td>{pct(i.estudiantes.aciertos)}</td>
                  <td>
                    <ChipNivel valor={i.docentes.nivel} />
                  </td>
                  <td>{pct(i.docentes.logro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Estado>
  );
}

export default function ResultadosPage() {
  const { momento } = useParams<{ momento: string }>() as { momento: string };
  const alcance = momento === 'alcance';
  const [semestre, setSemestre] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const q = semestre ? `?semestre=${semestre}` : '';
  const { datos, error, cargando } = useDatos<{ periodo: string | null; filas: Fila[] }>(
    `/resultados/${momento}${q}`,
  );

  const exportar = async (rol: 'DOCENTE' | 'ESTUDIANTE') => {
    setAviso('Generando…');
    try {
      const m = momento.toUpperCase();
      await descargar(
        `/reportes/matriz?rol=${rol}&momento=${m}`,
        `matriz-${rol === 'DOCENTE' ? 'profesores' : 'estudiantes'}-${momento}-${datos?.periodo}.xlsx`,
      );
      setAviso('');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo exportar.');
    }
  };

  return (
    <>
      <Encabezado
        titulo={alcance ? 'Nivel de alcance' : 'Nivel de apreciación'}
        texto={datos?.periodo ? `Periodo ${datos.periodo}` : undefined}
      >
        <button className="btn" onClick={() => void exportar('DOCENTE')}>
          Excel profesores
        </button>
        <button className="btn" onClick={() => void exportar('ESTUDIANTE')}>
          Excel estudiantes
        </button>
      </Encabezado>
      {aviso && (
        <p role="status" className="mb-3 text-sm text-muted">
          {aviso}
        </p>
      )}
      <label className="mb-4 block max-w-48 text-sm font-semibold">
        Semestre
        <select
          className="input mt-1 font-normal"
          value={semestre}
          onChange={(e) => setSemestre(e.target.value)}
        >
          <option value="">Todos</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <Estado cargando={cargando && !datos} error={error}>
        {datos?.filas.length ? (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Sem.</th>
                  <th>Est.</th>
                  <th>Nivel</th>
                  {alcance && <th>Aciertos</th>}
                  <th>Doc.</th>
                  <th>Nivel</th>
                  {alcance && <th>Logro</th>}
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f) => (
                  <tr key={f.id}>
                    <td className="min-w-52">
                      <button
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => setSel(f.id)}
                      >
                        {f.nombre}
                      </button>
                    </td>
                    <td>{f.semestre}</td>
                    <td>{f.estudiantes.respuestas}</td>
                    <td>
                      <ChipNivel valor={f.estudiantes.nivel} />
                    </td>
                    {alcance && <td>{pct(f.estudiantes.aciertos)}</td>}
                    <td>{f.docentes.respuestas}</td>
                    <td>
                      <ChipNivel valor={f.docentes.nivel} />
                    </td>
                    {alcance && <td>{pct(f.docentes.logro)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <SinDatos />
          </div>
        )}
      </Estado>
      {sel !== null && <DetalleUnidad key={`${momento}-${sel}`} momento={momento} id={sel} />}
    </>
  );
}
