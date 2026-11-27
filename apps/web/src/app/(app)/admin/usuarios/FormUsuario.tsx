'use client';

import { VINCULACIONES, type Vinculacion } from '@rae/shared';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export interface OpcionRol {
  id: number;
  nombre: string;
  clave: string;
  base: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  asignable: boolean;
  motivo: string | null;
}

export interface Usuario {
  id: number;
  documento: string;
  nombreCompleto: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  email: string | null;
  activo: boolean;
  debeCambiarClave: boolean;
  ultimoIngreso: string | null;
  vinculacion: Vinculacion | null;
  rolSistema: { id: number; nombre: string; clave: string } | null;
}

/** El rol efectivo: el asignado o, si no tiene, el rol fijo de su tipo. */
export const rolDe = (u: Usuario, roles: OpcionRol[]) =>
  u.rolSistema?.id ??
  roles.find((r) => r.clave === (u.rol === 'ADMIN' ? 'ADMINISTRADOR' : u.rol))?.id ??
  0;

/** Crea un usuario o edita uno existente. */
export function FormUsuario({
  roles,
  usuario,
  onListo,
}: {
  roles: OpcionRol[];
  usuario?: Usuario;
  onListo: (mensaje: string) => Promise<void>;
}) {
  const asignables = roles.filter(
    (r) => r.asignable || (usuario && rolDe(usuario, roles) === r.id),
  );
  const [v, setV] = useState({
    documento: usuario?.documento ?? '',
    nombreCompleto: usuario?.nombreCompleto ?? '',
    email: usuario?.email ?? '',
    rolSistemaId: usuario
      ? rolDe(usuario, roles)
      : (asignables.find((r) => r.base === 'DOCENTE')?.id ?? asignables[0]?.id ?? 0),
    vinculacion: (usuario?.vinculacion ?? '') as Vinculacion | '',
  });
  const [error, setError] = useState('');
  const rol = roles.find((r) => r.id === v.rolSistemaId);
  const esDocente = rol?.base === 'DOCENTE';

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cuerpo = {
      documento: v.documento.trim(),
      nombreCompleto: v.nombreCompleto.trim(),
      email: v.email.trim() || null,
      ...(!usuario || v.rolSistemaId !== rolDe(usuario, roles)
        ? { rolSistemaId: v.rolSistemaId }
        : {}),
      ...(esDocente ? { vinculacion: v.vinculacion || null } : {}),
    };
    try {
      if (usuario) {
        await api(`/usuarios/${usuario.id}`, 'PATCH', cuerpo);
        await onListo(`Usuario ${cuerpo.nombreCompleto} actualizado.`);
      } else {
        await api('/usuarios', 'POST', cuerpo);
        await onListo(
          `Usuario ${cuerpo.nombreCompleto} creado. Su clave inicial es el documento más ${rol?.base === 'ESTUDIANTE' || rol?.base === 'ADMIN' ? 'el primer apellido' : 'el primer nombre'}.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  };

  return (
    <form onSubmit={(e) => void guardar(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-sm font-semibold">
        Documento
        <input
          className="input mt-1 font-normal"
          required
          inputMode="numeric"
          pattern="\d{5,20}"
          maxLength={20}
          value={v.documento}
          onChange={(e) => setV({ ...v, documento: e.target.value })}
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Nombre completo (apellidos y nombres)
        <input
          className="input mt-1 font-normal"
          required
          minLength={3}
          maxLength={150}
          value={v.nombreCompleto}
          onChange={(e) => setV({ ...v, nombreCompleto: e.target.value })}
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Correo
        <input
          className="input mt-1 font-normal"
          type="email"
          maxLength={150}
          value={v.email}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Rol
        <select
          className="input mt-1 font-normal"
          value={v.rolSistemaId}
          onChange={(e) => setV({ ...v, rolSistemaId: Number(e.target.value) })}
        >
          {asignables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
              {r.base === 'ADMIN' && r.clave !== 'ADMINISTRADOR' ? ' (administrativo)' : ''}
            </option>
          ))}
        </select>
      </label>
      {esDocente && (
        <label className="text-sm font-semibold sm:col-span-2">
          Vinculación
          <select
            className="input mt-1 font-normal"
            value={v.vinculacion}
            onChange={(e) => setV({ ...v, vinculacion: e.target.value as Vinculacion | '' })}
          >
            <option value="">Sin definir</option>
            {(Object.keys(VINCULACIONES) as Vinculacion[]).map((k) => (
              <option key={k} value={k}>
                {VINCULACIONES[k]}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-1">
        <button className="btn btn-primary">{usuario ? 'Guardar cambios' : 'Crear usuario'}</button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-err sm:col-span-2 lg:col-span-5">
          {error}
        </p>
      )}
    </form>
  );
}
