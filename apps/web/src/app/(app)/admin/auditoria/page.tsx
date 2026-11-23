'use client';

import { useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { useDatos } from '@/lib/api';

interface Registro {
  id: string;
  usuarioId: number | null;
  accion: string;
  entidad: string;
  ip: string | null;
  creadaEn: string;
}

export default function AuditoriaPage() {
  const [pagina, setPagina] = useState(1);
  const { datos, error, cargando } = useDatos<{
    datos: Registro[];
    total: number;
    pagina: number;
    tamano: number;
  }>(`/auditoria?pagina=${pagina}`);
  return (
    <>
      <Encabezado titulo="Auditoría" texto="Cambios realizados por administradores." />
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
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">
                        {new Date(r.creadaEn).toLocaleString('es-CO')}
                      </td>
                      <td>{r.usuarioId ?? '—'}</td>
                      <td className="min-w-64">{r.accion}</td>
                      <td>{r.ip ?? '—'}</td>
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
