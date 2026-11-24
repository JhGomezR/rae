'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [documento, setDocumento] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api('/auth/login', 'POST', { documento: documento.trim(), clave });
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-center gap-6 bg-login px-6 py-10 text-[#e6edf6] lg:px-16">
        <h1 className="text-4xl text-white">Seguimiento RAE</h1>
        <p className="max-w-md">
          Resultados de aprendizaje de cada unidad de formación, en dos momentos del semestre.
        </p>
        <dl className="grid max-w-md gap-4">
          <div>
            <dt className="font-semibold text-white">Nivel de apreciación</dt>
            <dd>Al inicio: lo que esperas lograr.</dd>
          </div>
          <div>
            <dt className="font-semibold text-white">Nivel de alcance</dt>
            <dd>Al final: lo que realmente se aprendió.</dd>
          </div>
        </dl>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <form onSubmit={(e) => void entrar(e)} className="card w-full max-w-sm space-y-4">
          <h2>Iniciar sesión</h2>
          <div>
            <label className="label" htmlFor="documento">
              Número de documento
            </label>
            <input
              id="documento"
              className="input"
              inputMode="numeric"
              autoComplete="username"
              required
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="clave">
              Contraseña
            </label>
            <input
              id="clave"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
            <p className="mt-1 text-sm text-muted">
              La primera vez: documento + primer apellido (estudiantes) o primer nombre (docentes).
            </p>
            {/* Dos líneas en blanco entre la ayuda y el crédito. */}
            <p className="mt-[2lh] text-sm text-faint">Creado por: Jhon Alexander Gomez Ruiz</p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-err">
              {error}
            </p>
          )}
          <button className="btn btn-primary w-full" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  );
}
