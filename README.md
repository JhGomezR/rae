# Seguimiento Curricular RAE

Mide el **nivel de apreciación** (inicio de semestre) y el **nivel de alcance** (fin de semestre) de los resultados de aprendizaje, por curso, para docentes y estudiantes. El administrador consulta resultados, exporta las matrices y sigue el plan de mejoramiento (características 18–24 del PEP).

## Requisitos

Node.js 22 o superior, pnpm 9 y MySQL 8.0 para desarrollo. Producción con Docker: ver [`deploy/DEPLOY.md`](deploy/DEPLOY.md).

## Arranque local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev
```

- API: http://localhost:4000/api/salud
- Web: http://localhost:3000
