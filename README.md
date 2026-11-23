# Seguimiento Curricular RAE

Mide el **nivel de apreciación** (inicio de semestre) y el **nivel de alcance** (fin de semestre) de los resultados de aprendizaje, por curso, para docentes y estudiantes. El administrador consulta resultados, exporta las matrices y sigue el plan de mejoramiento (características 18–24 del PEP).

- Diseño completo: [`docs/blueprint-seguimiento-rae.md`](docs/blueprint-seguimiento-rae.md)
- Guía para desarrollo con Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Requisitos

Node.js 22 o superior, pnpm 9 y MySQL 8.0. Sin Docker.

## Arranque local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev
```

- API: http://localhost:4000/api/salud
- Web: http://localhost:3000
