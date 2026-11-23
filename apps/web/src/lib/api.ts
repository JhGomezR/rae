'use client';

import { useCallback, useEffect, useState } from 'react';

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalles?: { campo: string; motivo: string }[],
  ) {
    super(message);
  }
}

async function solicitar(ruta: string, init: RequestInit, reintento = true): Promise<Response> {
  const res = await fetch(`/api${ruta}`, { credentials: 'include', ...init });
  if (res.status === 401 && reintento && !ruta.startsWith('/auth/')) {
    const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (r.ok) return solicitar(ruta, init, false);
    window.location.href = '/login';
  }
  return res;
}

export async function api<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const esArchivo = cuerpo instanceof FormData;
  const res = await solicitar(ruta, {
    method: metodo,
    headers: cuerpo && !esArchivo ? { 'Content-Type': 'application/json' } : undefined,
    body: esArchivo ? cuerpo : cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as {
      message?: string;
      detalles?: { campo: string; motivo: string }[];
    };
    throw new ErrorApi(e.message ?? 'No se pudo completar la operación.', res.status, e.detalles);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Descarga un exporte conservando la sesión. */
export async function descargar(ruta: string, nombre: string): Promise<void> {
  const res = await solicitar(ruta, { method: 'GET' });
  if (!res.ok) throw new ErrorApi('No se pudo generar el archivo.', res.status);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export function useDatos<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    if (!ruta) return;
    setCargando(true);
    try {
      setDatos(await api<T>(ruta));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, error, cargando, recargar, setDatos };
}
