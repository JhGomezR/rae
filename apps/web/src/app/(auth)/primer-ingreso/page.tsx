'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export default function PrimerIngresoPage() {
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    setError('');
    setEnviando(true);
    try {
      await api('/auth/primer-ingreso', 'POST', { claveNueva: clave, email });
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setEnviando(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <form onSubmit={(e) => void guardar(e)} className="card w-full max-w-md space-y-4">
        <h1>Protege tu cuenta</h1>
        <p className="text-muted">
          Crea una contraseña propia y registra tu correo para recibir avisos de las encuestas.
        </p>
        <div>
          <label className="label" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="clave">
            Nueva contraseña
          </label>
          <input
            id="clave"
            className="input"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          <p className="mt-1 text-sm text-muted">
            Mínimo 8 caracteres; no puede contener tu documento.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="repetir">
            Repite la contraseña
          </label>
          <input
            id="repetir"
            className="input"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-err">
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </main>
  );
}
