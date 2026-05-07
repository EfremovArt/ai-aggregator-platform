import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, raw } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TrustProxyLoader } from './common/security/trust-proxy.loader';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 4000);
  const isProd = process.env.NODE_ENV === 'production';

  // Trust proxies (Cloudflare / Nginx) so we can read real IPs
  TrustProxyLoader.apply(app);

  // Raw body for webhook signature verification — must be registered BEFORE json parser.
  app.use(
    '/api/billing/webhooks',
    raw({ type: '*/*', limit: '2mb' }),
    (req: import('express').Request, _res: import('express').Response, next: () => void) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
  );
  app.use(json({ limit: '2mb' }));

  app.use(cookieParser(process.env.COOKIE_SECRET ?? process.env.JWT_ACCESS_SECRET));

  // Security headers — CSP applies to API responses (mostly JSON), but we still set them.
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: [`'self'`],
              scriptSrc: [`'self'`],
              styleSrc: [`'self'`, `'unsafe-inline'`],
              imgSrc: [`'self'`, 'data:', 'https:'],
              connectSrc: [`'self'`, 'https:'],
              frameAncestors: [`'none'`],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: (origin, cb) => {
      const allowList = (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim());
      if (!origin || allowList.includes(origin) || allowList.includes('*')) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('AI Aggregator API')
      .setDescription('REST API for the AI Aggregator Platform.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, doc);
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on http://0.0.0.0:${port}`);
}

bootstrap();
