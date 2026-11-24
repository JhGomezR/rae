'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { api, useDatos } from '@/lib/api';

export interface Perfil {
  id: number;
  documento: string;
  nombre: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  email: string | null;
}

const ADMIN: [string, string][] = [
  ['/admin/panel', 'Panel'],
  ['/admin/resultados/apreciacion', 'Nivel de apreciación'],
  ['/admin/resultados/alcance', 'Nivel de alcance'],
  ['/admin/comparativo', 'Comparativo'],
  ['/admin/plan-mejoramiento', 'Plan de mejoramiento'],
  ['/admin/informes', 'Informes'],
  ['/admin/curriculo', 'Base de conocimiento'],
  ['/admin/periodos', 'Periodos'],
  ['/admin/importar', 'Importar consolidado'],
  ['/admin/usuarios', 'Usuarios'],
  ['/admin/cursos', 'Cursos'],
  ['/admin/notificaciones', 'Correos'],
  ['/admin/auditoria', 'Auditoría'],
];
const PERSONA: [string, string][] = [['/mis-encuestas', 'Mis encuestas']];
const ROL = { ADMIN: 'Administrador', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante' };

export function Shell({ children }: { children: ReactNode }) {
  const ruta = usePathname() ?? '';
  const { datos: yo } = useDatos<Perfil>('/auth/yo');
  const [abierto, setAbierto] = useState(false);
  const menu = [...(yo?.rol === 'ADMIN' ? ADMIN : yo ? PERSONA : []), ['/perfil', 'Mi perfil']];

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
      <aside
        className={`${abierto ? 'block' : 'hidden'} border-r border-line bg-surface p-4 lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto`}
      >
        <p className="mb-4 hidden font-serif text-xl font-semibold text-primary lg:block">
          Seguimiento RAE
        </p>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {menu.map(([href, texto]) => {
            const activo = ruta === href || ruta.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href as string}
                onClick={() => setAbierto(false)}
                aria-current={activo ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${activo ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2'}`}
              >
                {texto}
              </Link>
            );
          })}
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
