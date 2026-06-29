/**
 * Generate OpenAPI spec — writes apps/api/openapi.json
 *
 * Usage (from repo root):
 *   pnpm --filter api gen:openapi
 */
import 'dotenv/config';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy-secret-for-openapi-generation-at-least-32-chars-long';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { DB, PG_POOL } from '../src/shared/database.module';
import { EVENT_QUEUE } from '../src/contexts/needs/infrastructure/needs.module';
import { SHIPMENT_EVENT_QUEUE } from '../src/contexts/logistics/infrastructure/logistics.module';

const mockPgPool = {
  end: () => Promise.resolve(),
};
const mockDb = {};
const mockQueue = {
  close: () => Promise.resolve(),
};
const mockRedis = {
  quit: () => Promise.resolve(),
};
const mockEventQueue = {
  queue: mockQueue,
  connection: mockRedis,
};

async function generate(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PG_POOL)
    .useValue(mockPgPool)
    .overrideProvider(DB)
    .useValue(mockDb)
    .overrideProvider(EVENT_QUEUE)
    .useValue(mockEventQueue)
    .overrideProvider(SHIPMENT_EVENT_QUEUE)
    .useValue(mockEventQueue)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

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
