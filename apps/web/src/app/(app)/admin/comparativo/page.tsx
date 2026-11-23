'use client';

import { ChipNivel, Encabezado, Estado, SinDatos } from '@/components/ui';
import { useDatos } from '@/lib/api';

interface Par {
  apreciacion: number | null;
  alcance: number | null;
  brecha: number | null;
}
interface Fila {
  id: number;
  nombre: string;
  semestre: number;
  estudiantes: Par;
  docentes: Par;
}

const brecha = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v}`);

export default function ComparativoPage() {
  const { datos, error, cargando } = useDatos<{ periodo: string | null; filas: Fila[] }>(
    '/resultados/comparativo',
  );
  return (
    <>
      <Encabezado
        titulo="Comparativo"
        texto="Lo que se esperaba frente a lo que se alcanzó, por unidad de formación."
      />
      <Estado cargando={cargando} error={error}>
        {datos?.filas.length ? (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Est. apreciación</th>
                  <th>Est. alcance</th>
                  <th>Brecha</th>
                  <th>Doc. apreciación</th>
                  <th>Doc. alcance</th>
                  <th>Brecha</th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f) => (
                  <tr key={f.id}>
                    <td className="min-w-52">{f.nombre}</td>
                    <td>
                      <ChipNivel valor={f.estudiantes.apreciacion} />
                    </td>
                    <td>
                      <ChipNivel valor={f.estudiantes.alcance} />
                    </td>
                    <td className="font-semibold">{brecha(f.estudiantes.brecha)}</td>
                    <td>
                      <ChipNivel valor={f.docentes.apreciacion} />
                    </td>
                    <td>
                      <ChipNivel valor={f.docentes.alcance} />
                    </td>
                    <td className="font-semibold">{brecha(f.docentes.brecha)}</td>
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
    </>
  );
}
