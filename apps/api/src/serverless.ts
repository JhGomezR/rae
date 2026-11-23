import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/env';

type Manejador = (req: IncomingMessage, res: ServerResponse) => void;

async function crear(): Promise<Manejador> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ json: env.NODE_ENV === 'production' }),
  });
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.init();
  return app.getHttpAdapter().getInstance() as Manejador;
}

// Se reutiliza entre invocaciones de la misma instancia de la función.
let instancia: Promise<Manejador> | undefined;

export async function manejador(req: IncomingMessage, res: ServerResponse): Promise<void> {
  instancia ??= crear().catch((e: unknown) => {
    instancia = undefined;
    throw e;
  });
  const app = await instancia;
  await new Promise<void>((resolve) => {
    res.once('close', resolve);
    app(req, res);
  });
}
