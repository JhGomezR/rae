import { NIVELES } from '@rae/shared';

const COLOR: Record<number, string> = {
  1: 'bg-lv1',
  2: 'bg-lv2',
  3: 'bg-lv3',
  4: 'bg-lv4',
};

async function estadoApi(): Promise<'ok' | 'sin conexión'> {
  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  try {
    const res = await fetch(`${url}/salud`, { cache: 'no-store' });
    return res.ok ? 'ok' : 'sin conexión';
  } catch {
    return 'sin conexión';
  }
}

export default async function Inicio() {
  const api = await estadoApi();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <h1 className="font-serif text-3xl font-semibold text-primary">Seguimiento RAE</h1>
      <p className="text-muted">
        Nivel de apreciación al inicio del semestre y nivel de alcance al final, por curso.
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Escala de nivel">
        {NIVELES.map((n) => (
          <li
            key={n.valor}
            className={`${COLOR[n.valor]} rounded-full px-3 py-1 text-sm font-medium text-white`}
          >
            {n.nombre}
          </li>
        ))}
      </ul>
      <p className="rounded-card border border-line bg-surface p-4 text-sm">
        Estado de la API: <strong>{api}</strong>
      </p>
    </main>
  );
}
