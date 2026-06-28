import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './contexts/resources/infrastructure/http/domain-exception.filter';
import { NeedsDomainExceptionFilter } from './contexts/needs/infrastructure/http/domain-exception.filter';
import { ReportExceptionFilter } from './contexts/reports/infrastructure/http/report-exception.filter';

/**
 * Validates that JWT_SECRET is strong enough in production.
 * In dev/test the short default secret is intentionally allowed.
 */
function validateJwtSecret(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters long in production. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
}

async function bootstrap(): Promise<void> {
  validateJwtSecret();

  const app = await NestFactory.create(AppModule);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  // crossOriginResourcePolicy: 'cross-origin' is required so that the Next.js
  // frontend (port 3001) can load images served from GET /files/:key (port 3000).
  // Without it, Helmet's default CORP: same-origin would block cross-origin
  // image requests.
  // contentSecurityPolicy is disabled because this is a JSON API (not a
  // browser-rendered HTML app); Swagger /docs uses its own inline scripts that
  // a strict CSP would break.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────────
  // The Next.js frontend issues client-side fetches (e.g. the public resource
  // points consumed by the Leaflet map) to this API from a different origin
  // (3001 → 3000). Without CORS the browser blocks those responses ("Failed to
  // fetch"). credentials:true allows the httpOnly auth cookie on client-side
  // authenticated calls. Origin is restricted to FRONTEND_URL (no wildcard).
  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:3001').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new DomainExceptionFilter(),
    new NeedsDomainExceptionFilter(),
    new ReportExceptionFilter(),
  );
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('ResponseGrid API')
    .setDescription('API for humanitarian emergency resource coordination')
    .setVersion('0.1')
    .addTag('resources')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
