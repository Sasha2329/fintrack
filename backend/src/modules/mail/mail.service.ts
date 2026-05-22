import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import nodemailer, { Transporter } from 'nodemailer';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from = this.configService.get<string>('SMTP_FROM') || 'no-reply@fintrack.local';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT') ?? 587,
        secure: this.configService.get<boolean>('SMTP_SECURE') ?? false,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        auth: {
          user,
          pass
        }
      });
    }
  }

  async sendMail(params: SendMailParams) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text
        });
        this.logger.log(`Письмо успешно отправлено на ${params.to} с темой "${params.subject}"`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка SMTP';
        this.logger.log(`SMTP-отправка не удалась, письмо будет сохранено локально: ${message}`);
      }
    }

    await this.writePreview(params);
  }

  private async writePreview(params: SendMailParams) {
    const previewDir = path.resolve(
      process.cwd(),
      this.configService.get<string>('MAIL_PREVIEW_DIR') ?? 'mail-preview'
    );
    await fs.mkdir(previewDir, { recursive: true });
    const filePath = path.join(previewDir, `${Date.now()}-${sanitize(params.to)}.txt`);
    const content = `TO: ${params.to}\nSUBJECT: ${params.subject}\n\n${params.text}\n\nHTML:\n${params.html}`;
    await fs.writeFile(filePath, content, 'utf-8');
    this.logger.log(`Письмо сохранено локально для ${params.to} в ${filePath}`);
  }
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
