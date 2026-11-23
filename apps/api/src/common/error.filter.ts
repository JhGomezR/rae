import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Formato único de error: { statusCode, error, message, detalles }. */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (!(excepcion instanceof HttpException)) {
      this.logger.error(excepcion instanceof Error ? excepcion.stack : String(excepcion));
      res.status(500).json({
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Ocurrió un error inesperado.',
      });
      return;
    }
    const status = excepcion.getStatus();
    const cuerpo = excepcion.getResponse();
    const datos =
      typeof cuerpo === 'string' ? { message: cuerpo } : (cuerpo as Record<string, unknown>);
    res.status(status).json({
      statusCode: status,
      error: excepcion.name.replace(/Exception$/, ''),
      message: datos.message ?? excepcion.message,
      ...(datos.detalles ? { detalles: datos.detalles } : {}),
    });
  }
}
