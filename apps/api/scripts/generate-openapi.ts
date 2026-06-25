/**
 * Generate OpenAPI spec — writes apps/api/openapi.json
 *
 * Prerequisites: Postgres on localhost:5433 and Redis on localhost:6380 must be running,
 * because ResourcesModule eagerly creates the DB pool and IORedis connection.
 * In the local stack this means: `docker compose up -d`.
 *
 * Usage (from repo root):
 *   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
 *   REDIS_URL=redis://localhost:6380 \
 *   pnpm --filter api gen:openapi
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('ReliefHub API')
    .setDescription('API for humanitarian emergency resource coordination')
    .setVersion('0.1')
    .addTag('resources')
    .addTag('emergencies')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // ts-node runs from apps/api directory
  const outPath = resolve(process.cwd(), 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to: ${outPath}`);

  await app.close();
}

generate().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
