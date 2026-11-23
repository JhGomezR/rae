'use client';

import { useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { api, useDatos } from '@/lib/api';

interface Notificacion {
  id: number;
  asunto: string;
  estado: string;
  intentos: number;
  creadaEn: string;
  error: string | null;
  usuario: { nombreCompleto: string };
}

export default function NotificacionesPage() {
  const [pagina, setPagina] = useState(1);
  const [aviso, setAviso] = useState('');
  const { datos, error, cargando, recargar } = useDatos<{
    datos: Notificacion[];
    total: number;
    pagina: number;
    tamano: number;
  }>(`/notificaciones?pagina=${pagina}`);

  const recordar = async () => {
    try {
      const r = await api<{ encolados: number }>('/notificaciones/recordatorios', 'POST');
      setAviso(`Recordatorios en cola: ${r.encolados}.`);
      await recargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo completar.');
    }
  };

  return (
    <>
      <Encabezado
        titulo="Correos"
        texto="Avisos de apertura y recordatorios a quienes tienen encuestas pendientes."
      >
        <button className="btn" onClick={() => void recordar()}>
          Enviar recordatorios
        </button>
      </Encabezado>
      {aviso && (
        <p role="status" className="mb-3 text-sm text-muted">
          {aviso}
        </p>
      )}
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
                    <th>Persona</th>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th>Intentos</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((n) => (
                    <tr key={n.id}>
                      <td className="whitespace-nowrap">
                        {new Date(n.creadaEn).toLocaleString('es-CO')}
                      </td>
                      <td className="min-w-48">{n.usuario.nombreCompleto}</td>
                      <td className="min-w-48">{n.asunto}</td>
                      <td title={n.error ?? undefined}>{n.estado}</td>
                      <td>{n.intentos}</td>
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
