import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendPort = process.env.FRONTEND_PORT ?? '4173';
  const localOrigins = new Set([
    `http://localhost:${frontendPort}`,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173'
  ]);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        callback(null, true);
        return;
      }

      if (localOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      try {
        const url = new URL(origin);
        const isTunnelHost =
          url.protocol === 'https:' &&
          (
            url.hostname.endsWith('.loca.lt') ||
            url.hostname.endsWith('.trycloudflare.com') ||
            url.hostname.endsWith('.ngrok-free.app') ||
            url.hostname.endsWith('.ngrok.app')
          );
        const isLocalNetwork =
          /^192\.168\./.test(url.hostname) ||
          /^10\./.test(url.hostname) ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);

        if (isTunnelHost) {
          callback(null, true);
          return;
        }

        if (isLocalNetwork && (url.port === '4173' || url.port === '5173')) {
          callback(null, true);
          return;
        }
      } catch {
        callback(new Error('CORS origin parse error'));
        return;
      }

      callback(new Error('CORS origin denied'));
    },
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
