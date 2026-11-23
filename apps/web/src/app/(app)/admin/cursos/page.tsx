'use client';

import { useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { useDatos } from '@/lib/api';

interface Curso {
  id: number;
  grupo: string;
  semestreOferta: number;
  unidad: { nombre: string };
  sede: { codigo: string };
  programa: { nombre: string };
  docente: { nombreCompleto: string };
  periodo: { codigo: string };
  _count: { inscripciones: number };
}

export default function CursosPage() {
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const params = new URLSearchParams({ pagina: String(pagina), ...(q ? { q } : {}) });
  const { datos, error, cargando } = useDatos<{
    datos: Curso[];
    total: number;
    pagina: number;
    tamano: number;
  }>(`/cursos?${params}`);
  return (
    <>
      <Encabezado titulo="Cursos" texto="Asignaciones del periodo activo." />
      <label className="mb-4 block max-w-sm text-sm font-semibold">
        Buscar por unidad o docente
        <input
          className="input mt-1 font-normal"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPagina(1);
          }}
        />
      </label>
      <Estado cargando={cargando && !datos} error={error}>
        {!datos?.datos.length ? (
          <div className="card">
            <SinDatos />
          </div>
        ) : (
          <>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Unidad</th>
                    <th>Grupo</th>
                    <th>Sede</th>
                    <th>Programa</th>
                    <th>Docente</th>
                    <th>Estudiantes</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((c) => (
                    <tr key={c.id}>
                      <td className="min-w-52">{c.unidad.nombre}</td>
                      <td>{c.grupo}</td>
                      <td>{c.sede.codigo}</td>
                      <td className="min-w-44">{c.programa.nombre}</td>
                      <td className="min-w-52">{c.docente.nombreCompleto}</td>
                      <td>{c._count.inscripciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginador
              pagina={datos.pagina}
              tamano={datos.tamano}
              total={datos.total}
              onCambio={setPagina}
            />
          </>
        )}
      </Estado>
    </>
  );
}
