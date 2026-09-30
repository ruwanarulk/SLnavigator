import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/** Shared by the real server (main.ts) and the e2e tests. */
export function configureApp(app: INestApplication) {
  // Behind Vercel/Next proxies: take the client IP from X-Forwarded-For so
  // per-IP rate limits apply per traveller, not per proxy.
  (app as NestExpressApplication).set('trust proxy', true);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true });
  return app;
}
