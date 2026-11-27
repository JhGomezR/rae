'use client';

import { useEffect, useState } from 'react';
import { Encabezado, Estado, Paginador, SinDatos } from '@/components/ui';
import { useDatos } from '@/lib/api';

interface Registro {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  ip: string | null;
  detalle: string | null;
  creadaEn: string;
  usuario: { nombreCompleto: string; documento: string; rol: string } | null;
}
interface Pagina {
  datos: Registro[];
  total: number;
  pagina: number;
  tamano: number;
}

const SESION: Record<string, [string, string]> = {
  LOGIN: ['Inicio de sesión', 'lv3'],
  LOGIN_FALLIDO: ['Intento fallido', 'lv1'],
  LOGOUT: ['Cierre de sesión', 'lv4'],
  CIERRE_INACTIVIDAD: ['Cierre por inactividad', 'lv2'],
  PRIMER_INGRESO: ['Primer ingreso', 'lv3'],
  CAMBIO_CLAVE: ['Cambio de contraseña', 'lv4'],
};
const VERBO: Record<string, string> = {
  POST: 'Crear',
  PUT: 'Editar',
  PATCH: 'Editar',
  DELETE: 'Eliminar',
};
const ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
};

function Evento({ r }: { r: Registro }) {
  const s = SESION[r.accion];
  if (s) return <span className={`chip chip-nivel ${s[1]}`}>{s[0]}</span>;
  const [metodo, ...ruta] = r.accion.split(' ');
  return (
    <span>
      <span className="chip">{VERBO[metodo ?? ''] ?? metodo}</span>
      <span className="ml-2 text-muted">{ruta.join(' ')}</span>
    </span>
  );
}

function useRetraso<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export default function AuditoriaPage() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const busqueda = useRetraso(q.trim(), 350);
  const params = new URLSearchParams({
    pagina: String(pagina),
    tipo,
    ...(busqueda ? { q: busqueda } : {}),
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
  });
  const { datos, error, cargando } = useDatos<Pagina>(`/auditoria?${params}`);
  const reiniciar =
    <T,>(f: (v: T) => void) =>
    (v: T) => {
      f(v);
      setPagina(1);
    };

  return (
    <>
      <Encabezado
        titulo="Auditoría"
        texto="Inicios y cierres de sesión de todos los usuarios, y cambios hechos por administradores."
      />
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_12rem_10rem_10rem]">
        <label className="text-sm font-semibold">
          Buscar
          <input
            className="input mt-1 font-normal"
            type="search"
            placeholder="Nombre, documento, IP, evento o navegador"
            value={q}
            onChange={(e) => reiniciar(setQ)(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Tipo
          <select
            className="input mt-1 font-normal"
            value={tipo}
            onChange={(e) => reiniciar(setTipo)(e.target.value)}
          >
            <option value="todos">Todo</option>
            <option value="sesiones">Sesiones</option>
            <option value="fallidos">Intentos fallidos</option>
            <option value="cambios">Cambios de administración</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Desde
          <input
            className="input mt-1 font-normal"
            type="date"
            value={desde}
            onChange={(e) => reiniciar(setDesde)(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          Hasta
          <input
            className="input mt-1 font-normal"
            type="date"
            value={hasta}
            onChange={(e) => reiniciar(setHasta)(e.target.value)}
          />
        </label>
      </div>
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
                    <th>Evento</th>
                    <th>Detalle</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.datos.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">
                        {new Date(r.creadaEn).toLocaleString('es-CO', {
                          timeZone: 'America/Bogota',
                        })}
                      </td>
                      <td className="min-w-48">
                        {r.usuario ? (
                          <>
                            {r.usuario.nombreCompleto}
                            <span className="block text-xs text-faint">
                              {r.usuario.documento} · {ROL[r.usuario.rol] ?? r.usuario.rol}
                            </span>
                          </>
                        ) : (
                          <span className="text-faint">
                            {r.entidadId ? `Documento ${r.entidadId}` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="min-w-48">
                        <Evento r={r} />
                      </td>
                      <td className="min-w-48 text-muted">{r.detalle ?? '—'}</td>
                      <td className="whitespace-nowrap">{r.ip ?? '—'}</td>
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
