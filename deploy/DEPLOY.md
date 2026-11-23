# Despliegue en un VPS con Docker

GitHub construye y prueba las imágenes en cada cambio de `main` y las publica en `ghcr.io/jhgomezr/rae-api` y `ghcr.io/jhgomezr/rae-web`. El VPS solo las descarga.

## 1. Preparar el VPS

Necesitas Docker con Compose y los puertos 80 y 443 abiertos. Si usarás dominio, apúntalo a la IP del VPS.

```bash
mkdir -p ~/rae/deploy && cd ~/rae
curl -fsSLO https://raw.githubusercontent.com/JhGomezR/rae/main/docker-compose.prod.yml
curl -fsSLo .env.prod https://raw.githubusercontent.com/JhGomezR/rae/main/.env.prod.example
curl -fsSLo deploy/Caddyfile https://raw.githubusercontent.com/JhGomezR/rae/main/deploy/Caddyfile
chmod 600 .env.prod
```

## 2. Configurar

Edita `.env.prod`. Genera `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` y `JWT_ACCESS_SECRET`, cada uno con:

```bash
openssl rand -hex 32
```

## 3. Levantar

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

El certificado HTTPS se obtiene solo cuando `DOMINIO` es un dominio real.

## 4. Primer uso

1. Entra con `ADMIN_DOCUMENTO` y `ADMIN_CLAVE_INICIAL`, y cambia la clave.
2. Ve a **Importar consolidado** y sube el Excel. El archivo nunca va en el repositorio.
3. En **Panel** o **Periodos**, abre el momento de apreciación.

## Actualizar

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Respaldos

El servicio `backup` guarda un volcado diario con 14 días de retención en el volumen `db-backups`. Para copiarlos fuera del servidor:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod cp backup:/backups ./respaldos
```
