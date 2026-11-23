import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

export interface CorreoSaliente {
  para: string;
  asunto: string;
  html: string;
}

/** Puerto de correo; el adaptador se elige con MAIL_TRANSPORT. */
export abstract class MailerPort {
  abstract enviar(correo: CorreoSaliente): Promise<void>;
}

@Injectable()
export class SmtpMailerAdapter implements MailerPort {
  private readonly transporte: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  async enviar({ para, asunto, html }: CorreoSaliente): Promise<void> {
    await this.transporte.sendMail({ from: env.SMTP_FROM, to: para, subject: asunto, html });
  }
}

@Injectable()
export class LogMailerAdapter implements MailerPort {
  private readonly logger = new Logger('Correo');

  enviar({ asunto }: CorreoSaliente): Promise<void> {
    this.logger.log(`Correo simulado: ${asunto}`);
    return Promise.resolve();
  }
}
