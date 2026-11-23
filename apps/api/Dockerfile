# Se construye desde la raíz del repositorio.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter api... \
  && pnpm rebuild argon2 prisma @prisma/client @prisma/engines
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN DATABASE_URL=mysql://build:build@localhost:3306/build pnpm --filter api exec prisma generate \
  && pnpm --filter @rae/shared build \
  && pnpm --filter api build \
  && pnpm --filter api --prod deploy /salida \
  && cp -r apps/api/dist apps/api/prisma /salida/ \
  && cd /salida && DATABASE_URL=mysql://build:build@localhost:3306/build npx prisma generate

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production TZ=America/Bogota
WORKDIR /app
COPY --from=build --chown=node:node /salida ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
