'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Debe coincidir con SESION_INACTIVIDAD_MIN de la API (por defecto 15). */
const LIMITE_MS = 15 * 60_000;
const AVISO_MS = 60_000;
const RENOVAR_MS = 10 * 60_000;
const CLAVE_ACTIVIDAD = 'rae.actividad';
const CLAVE_SALIDA = 'rae.salida';
const EVENTOS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

const leer = (clave: string) => {
  try {
    return Number(localStorage.getItem(clave) ?? 0);
  } catch {
    return 0;
  }
};
const guardar = (clave: string, valor: number) => {
  try {
    localStorage.setItem(clave, String(valor));
  } catch {
    // Sin almacenamiento local, cada pestaña controla solo su propia actividad.
  }
};

/**
 * Cierra la sesión tras 15 minutos sin actividad, con aviso un minuto antes.
 * Mientras hay actividad renueva la sesión; el servidor rechaza por su cuenta
 * cualquier sesión que no se haya renovado en ese tiempo.
 */
export function ControlSesion() {
  const ultima = useRef(Date.now());
  const renovada = useRef(Date.now());
  const guardadaEn = useRef(0);
  const saliendo = useRef(false);
  const [restante, setRestante] = useState<number | null>(null);

  const salir = useCallback(async (motivo: 'inactividad' | 'vencida') => {
    if (saliendo.current) return;
    saliendo.current = true;
    guardar(CLAVE_SALIDA, Date.now());
    await fetch(`/api/auth/logout?motivo=${motivo}`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    window.location.href = `/login?motivo=${motivo}`;
  }, []);

  const renovar = useCallback(async () => {
    renovada.current = Date.now();
    const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).catch(
      () => null,
    );
    if (r && r.status === 401) await salir('vencida');
  }, [salir]);

  const marcar = useCallback(() => {
    const ahora = Date.now();
    ultima.current = ahora;
    if (ahora - guardadaEn.current > 5_000) {
      guardadaEn.current = ahora;
      guardar(CLAVE_ACTIVIDAD, ahora);
    }
  }, []);

  useEffect(() => {
    marcar();
    for (const e of EVENTOS) window.addEventListener(e, marcar, { passive: true });
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE_SALIDA) window.location.href = '/login?motivo=inactividad';
    };
    window.addEventListener('storage', alCambiar);

    const revisar = () => {
      const ahora = Date.now();
      // La actividad en otra pestaña también mantiene viva la sesión.
      const actividad = Math.max(ultima.current, leer(CLAVE_ACTIVIDAD));
      const inactivo = ahora - actividad;
      if (inactivo >= LIMITE_MS) {
        void salir('inactividad');
        return;
      }
      setRestante(
        inactivo >= LIMITE_MS - AVISO_MS ? Math.ceil((LIMITE_MS - inactivo) / 1000) : null,
      );
      if (ahora - renovada.current >= RENOVAR_MS && actividad > renovada.current) void renovar();
    };
    const intervalo = window.setInterval(revisar, 1_000);
    document.addEventListener('visibilitychange', revisar);
    return () => {
      for (const e of EVENTOS) window.removeEventListener(e, marcar);
      window.removeEventListener('storage', alCambiar);
      document.removeEventListener('visibilitychange', revisar);
      window.clearInterval(intervalo);
    };
  }, [marcar, renovar, salir]);

  if (restante === null) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sesion-titulo"
        aria-describedby="sesion-texto"
        className="card w-full max-w-sm space-y-3"
      >
        <h2 id="sesion-titulo">¿Sigues ahí?</h2>
        <p id="sesion-texto" className="text-muted">
          Por seguridad, tu sesión se cerrará en{' '}
          <strong className="tabular-nums text-ink">{restante} s</strong> por inactividad.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            autoFocus
            className="btn btn-primary"
            onClick={() => {
              marcar();
              guardar(CLAVE_ACTIVIDAD, Date.now());
              setRestante(null);
              void renovar();
            }}
          >
            Seguir conectado
          </button>
          <button className="btn" onClick={() => void salir('inactividad')}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
