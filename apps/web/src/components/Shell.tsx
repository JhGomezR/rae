'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { api, useDatos } from '@/lib/api';
import { ControlSesion } from './ControlSesion';
import { CUENTA, esActivo, MODULOS, type Enlace, type Modulo, type Rol } from './menu';

export interface Perfil {
  id: number;
  documento: string;
  nombre: string;
  rol: Rol;
  email: string | null;
}

const ROL = { ADMIN: 'Administrador', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante' };
const CLAVE_CERRADOS = 'rae.menu.cerrados';

function leerCerrados(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CERRADOS) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function EnlaceMenu({ e, ruta, onIr }: { e: Enlace; ruta: string; onIr: () => void }) {
  const activo = esActivo(ruta, e.href);
  return (
    <Link
      href={e.href}
      onClick={onIr}
      aria-current={activo ? 'page' : undefined}
      className={`block rounded-lg px-3 py-1.5 text-sm font-medium ${activo ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2'}`}
    >
      {e.texto}
    </Link>
  );
}

function GrupoModulo({
  m,
  rol,
  ruta,
  abierto,
  onAlternar,
  onIr,
}: {
  m: Modulo;
  rol: Rol;
  ruta: string;
  abierto: boolean;
  onAlternar: () => void;
  onIr: () => void;
}) {
  const categorias = m.categorias[rol] ?? [];
  if (!categorias.length) return null;
  const id = `modulo-${m.id}`;
  return (
    <section>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={onAlternar}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-2"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">{m.nombre}</span>
          <span className="block text-xs text-faint">{m.descripcion}</span>
        </span>
        <span
          aria-hidden
          className={`text-faint transition-transform ${abierto ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>
      {abierto && (
        <div id={id} className="mt-1 space-y-3 border-l border-line pl-2 ml-3">
          {categorias.map((c) => (
            <div key={c.nombre}>
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">
                {c.nombre}
              </p>
              <div className="space-y-0.5">
                {c.enlaces.map((e) => (
                  <EnlaceMenu key={e.href} e={e} ruta={ruta} onIr={onIr} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const ruta = usePathname() ?? '';
  const { datos: yo } = useDatos<Perfil>('/auth/yo');
  const [abierto, setAbierto] = useState(false);
  const [cerrados, setCerrados] = useState<string[]>([]);

  useEffect(() => setCerrados(leerCerrados()), []);

  const alternar = (id: string) => {
    const nuevos = cerrados.includes(id) ? cerrados.filter((x) => x !== id) : [...cerrados, id];
    setCerrados(nuevos);
    try {
      localStorage.setItem(CLAVE_CERRADOS, JSON.stringify(nuevos));
    } catch {
      // Sin almacenamiento local el menú simplemente no recuerda su estado.
    }
  };

  const salir = async () => {
    await api('/auth/logout', 'POST').catch(() => undefined);
    window.location.href = '/login';
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-2 lg:hidden">
        <span className="font-serif text-lg font-semibold text-primary">Seguimiento RAE</span>
        <button className="btn" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          Menú
        </button>
      </div>
      <ControlSesion />
      <aside
        className={`${abierto ? 'block' : 'hidden'} border-r border-line bg-surface p-4 lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto`}
      >
        <p className="mb-4 hidden font-serif text-xl font-semibold text-primary lg:block">
          Seguimiento RAE
        </p>
        <nav aria-label="Principal" className="space-y-2">
          {yo &&
            MODULOS.map((m) => {
              return (
                <GrupoModulo
                  key={m.id}
                  m={m}
                  rol={yo.rol}
                  ruta={ruta}
                  // Lo decide el usuario: abierto por defecto, cerrado si así lo dejó.
                  abierto={!cerrados.includes(m.id)}
                  onAlternar={() => alternar(m.id)}
                  onIr={() => setAbierto(false)}
                />
              );
            })}
          <div className="border-t border-line pt-3">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">
              Mi cuenta
            </p>
            {CUENTA.map((e) => (
              <EnlaceMenu key={e.href} e={e} ruta={ruta} onIr={() => setAbierto(false)} />
            ))}
          </div>
        </nav>
        {yo && (
          <div className="mt-6 border-t border-line pt-4 text-sm">
            <p className="font-semibold break-words">{yo.nombre}</p>
            <p className="text-faint">{ROL[yo.rol]}</p>
            <p className="mt-3 text-xs text-faint">Creado por: Jhon Alexander Gomez Ruiz</p>
            <button className="btn mt-3 w-full" onClick={() => void salir()}>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
      <main className="mx-auto w-full max-w-[1280px] min-w-0 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
