// Seed script — inserts health emergency template idempotently.
//
// Uses a fixed UUID so the template can be re-seeded without duplication.
// Safe to run multiple times: onConflictDoUpdate keeps data current.
//
// Usage:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     ts-node --transpile-only apps/api/scripts/seed-templates.ts
//
// Or from apps/api directory:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     npx ts-node --transpile-only scripts/seed-templates.ts

import { createDb } from '../src/shared/db';
import { templatesTable } from '../src/contexts/templates/infrastructure/drizzle/schema';

const HEALTH_TEMPLATE_ID = 'aaaabbbb-cccc-4ddd-8eee-ffff00001111';

const DONT_BRING_LIST = [
  'Medicamentos sin envase original o sin prospecto',
  'Equipos médicos sin batería ni manual de uso',
  'Alimentos perecederos sin refrigeración',
  'Donantes de sangre no convocados por los servicios de salud',
  'Personas sin formación sanitaria mínima en zonas de atención',
];

const RECOMMENDED_LIST = [
  'Agua potable y alimento de fácil consumo',
  'Documento de identidad y tarjeta sanitaria',
  'Medicamentos personales con receta o prospecto',
  'Ropa de recambio y cargadores portátiles',
  'Mascarillas, guantes y gel hidroalcohólico',
];

const DEFAULT_ANNOUNCEMENT =
  'Activado protocolo de emergencia sanitaria. Coordinamos necesidades de ' +
  'medicamentos, equipos e insumos médicos. Solo personal sanitario ' +
  'acreditado en zonas de triaje. Siga las instrucciones del coordinador ' +
  'antes de acercarse a los puntos de atención.';

async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, pool } = createDb(url);

  try {
    await db
      .insert(templatesTable)
      .values({
        id: HEALTH_TEMPLATE_ID,
        name: 'Emergencia sanitaria',
        description:
          'Plantilla para emergencias del vertical sanitario: hospitales, ' +
          'refugios médicos y situaciones que requieren taxonomía médica.',
        dontBringList: DONT_BRING_LIST,
        recommendedList: RECOMMENDED_LIST,
        defaultAnnouncement: DEFAULT_ANNOUNCEMENT,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: templatesTable.id,
        set: {
          name: 'Emergencia sanitaria',
          description:
          'Plantilla para emergencias del vertical sanitario: hospitales, ' +
          'refugios médicos y situaciones que requieren taxonomía médica.',
          dontBringList: DONT_BRING_LIST,
          recommendedList: RECOMMENDED_LIST,
          defaultAnnouncement: DEFAULT_ANNOUNCEMENT,
        },
      });

    console.log(
      `Seed completed: health template upserted (id=${HEALTH_TEMPLATE_ID}).`,
    );
  } finally {
    await pool.end();
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
