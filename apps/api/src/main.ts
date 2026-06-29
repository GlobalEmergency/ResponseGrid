import 'dotenv/config';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureHttpApp } from './shared/configure-http-app';
import { httpLogger } from './shared/http/http-logger.middleware';

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

  // En producción emitimos logs JSON estructurados (sin colores ANSI) para que
  // Datadog los parsee en campos; en dev seguimos con el logger coloreado.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...(process.env.NODE_ENV === 'production'
      ? { logger: new ConsoleLogger({ json: true }) }
      : {}),
  });

  // Behind Caddy (single proxy hop): trust it so req.ip / X-Forwarded-For
  // resolve the real client IP instead of the proxy's.
  app.set('trust proxy', 1);

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

  // One structured access-log line per request (method, status, latency, IP,
  // user-agent…) correlated with its APM trace. See http-logger.middleware.ts.
  app.use(httpLogger);

  configureHttpApp(app);
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('ResponseGrid API')
    .setDescription('API for humanitarian emergency resource coordination')
    .setVersion('0.1')
    // Bearer JWT (user accounts) — matches @ApiBearerAuth() on write endpoints.
    .addBearerAuth()
    // Service-account API keys — matches @ApiSecurity('api-key'); sent as the
    // `X-API-Key: rh_live_…` header (issue #96).
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .addTag('resources')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
