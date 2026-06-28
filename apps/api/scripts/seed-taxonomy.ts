// Seed script — inserts taxonomy categories and aliases idempotently.
//
// Inserts a base set of categories and normalised aliases so that external
// ingest sources (acopiove, etc.) can classify dirty labels without needing
// schema migrations.
//
// Usage:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     ts-node --transpile-only apps/api/scripts/seed-taxonomy.ts
//
// Or from apps/api directory:
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     npx ts-node --transpile-only scripts/seed-taxonomy.ts

import { createDb } from '../src/shared/db';
import {
  categoriesTable,
  categoryAliasesTable,
} from '../src/contexts/supplies/infrastructure/drizzle/schema';

interface CategoryRow {
  slug: string;
  labelEs: string;
  labelEn: string;
  parentSlug: string | null;
  vertical: string;
  sort: number;
}

const CATEGORIES: CategoryRow[] = [
  {
    slug: 'food',
    labelEs: 'Alimentos',
    labelEn: 'Food',
    parentSlug: null,
    vertical: 'general',
    sort: 10,
  },
  {
    slug: 'water',
    labelEs: 'Agua',
    labelEn: 'Water',
    parentSlug: null,
    vertical: 'general',
    sort: 20,
  },
  {
    slug: 'hygiene',
    labelEs: 'Higiene',
    labelEn: 'Hygiene',
    parentSlug: null,
    vertical: 'general',
    sort: 30,
  },
  {
    slug: 'medical',
    labelEs: 'Médico',
    labelEn: 'Medical',
    parentSlug: null,
    vertical: 'general',
    sort: 40,
  },
  {
    slug: 'medicines',
    labelEs: 'Medicamentos',
    labelEn: 'Medicines',
    parentSlug: 'medical',
    vertical: 'general',
    sort: 41,
  },
  {
    slug: 'medical_equipment',
    labelEs: 'Equipamiento médico',
    labelEn: 'Medical equipment',
    parentSlug: 'medical',
    vertical: 'general',
    sort: 42,
  },
  {
    slug: 'medical_supplies',
    labelEs: 'Insumos médicos',
    labelEn: 'Medical supplies',
    parentSlug: 'medical',
    vertical: 'general',
    sort: 43,
  },
  {
    slug: 'medical_personnel',
    labelEs: 'Personal médico',
    labelEn: 'Medical personnel',
    parentSlug: 'medical',
    vertical: 'general',
    sort: 44,
  },
  {
    slug: 'shelter',
    labelEs: 'Refugio',
    labelEn: 'Shelter',
    parentSlug: null,
    vertical: 'general',
    sort: 50,
  },
  {
    slug: 'clothing',
    labelEs: 'Ropa',
    labelEn: 'Clothing',
    parentSlug: null,
    vertical: 'general',
    sort: 60,
  },
  {
    slug: 'tools',
    labelEs: 'Herramientas',
    labelEn: 'Tools',
    parentSlug: null,
    vertical: 'general',
    sort: 70,
  },
  {
    slug: 'other',
    labelEs: 'Otros',
    labelEn: 'Other',
    parentSlug: null,
    vertical: 'general',
    sort: 99,
  },
];

interface AliasRow {
  aliasNorm: string;
  categorySlug: string;
}

const ALIASES: AliasRow[] = [
  // water
  { aliasNorm: 'agua', categorySlug: 'water' },
  { aliasNorm: 'agua potable', categorySlug: 'water' },
  // food
  { aliasNorm: 'alimentos', categorySlug: 'food' },
  { aliasNorm: 'alimentos no perecederos', categorySlug: 'food' },
  { aliasNorm: 'comida', categorySlug: 'food' },
  { aliasNorm: 'viveres', categorySlug: 'food' },
  // clothing
  { aliasNorm: 'ropa', categorySlug: 'clothing' },
  { aliasNorm: 'abrigos', categorySlug: 'clothing' },
  { aliasNorm: 'ropa y abrigos', categorySlug: 'clothing' },
  // medicines
  { aliasNorm: 'medicamentos', categorySlug: 'medicines' },
  { aliasNorm: 'medicinas', categorySlug: 'medicines' },
  // medical_supplies
  { aliasNorm: 'insumos medicos', categorySlug: 'medical_supplies' },
  { aliasNorm: 'material medico', categorySlug: 'medical_supplies' },
  // hygiene
  { aliasNorm: 'higiene', categorySlug: 'hygiene' },
  { aliasNorm: 'aseo', categorySlug: 'hygiene' },
  { aliasNorm: 'panales', categorySlug: 'hygiene' },
  // shelter
  { aliasNorm: 'frazadas', categorySlug: 'shelter' },
  { aliasNorm: 'cobijas', categorySlug: 'shelter' },
  { aliasNorm: 'mantas', categorySlug: 'shelter' },
  { aliasNorm: 'cobertores', categorySlug: 'shelter' },
];

async function seed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, pool } = createDb(url);

  try {
    // Insert parent categories first (those with no parent), then children.
    // ON CONFLICT DO NOTHING makes this fully idempotent.
    const parents = CATEGORIES.filter((c) => c.parentSlug === null);
    const children = CATEGORIES.filter((c) => c.parentSlug !== null);

    for (const batch of [parents, children]) {
      if (batch.length > 0) {
        await db.insert(categoriesTable).values(batch).onConflictDoNothing();
      }
    }

    console.log(
      `Seed: ${CATEGORIES.length} categories inserted (ON CONFLICT DO NOTHING).`,
    );

    await db
      .insert(categoryAliasesTable)
      .values(ALIASES)
      .onConflictDoNothing();

    console.log(
      `Seed: ${ALIASES.length} aliases inserted (ON CONFLICT DO NOTHING).`,
    );

    // Simple verification via drizzle select
    const cats = await db.select({ slug: categoriesTable.slug }).from(categoriesTable);
    const aliases = await db
      .select({ aliasNorm: categoryAliasesTable.aliasNorm })
      .from(categoryAliasesTable);

    console.log(
      `Verification: categories=${cats.length}, category_aliases=${aliases.length}`,
    );
  } finally {
    await pool.end();
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
