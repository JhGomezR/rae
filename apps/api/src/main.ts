import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Carga apps/api/.env si existe (la configuración validada con Zod llega en el Paso 5).
if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

void bootstrap();
