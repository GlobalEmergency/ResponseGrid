// Seed script — da de alta en el catálogo maestro los insumos del folleto de
// donaciones "Cáritas — Parroquia San Bernardino de Siena" (jornada 05/07/2026).
//
// NO usa migraciones: registra los productos a través de la MISMA capa de
// aplicación que la API de administración (`CreateSupply` + repositorio de
// alias). Así el código de insumo se asigna por el allocator real
// (getCategoryPrefix + supply_code_seq), se validan las invariantes de dominio
// y las variantes exigen que su producto base exista — igual que POST
// /admin/supplies.
//
// Es idempotente: reconoce los productos ya existentes por nombre (no duplica),
// reutiliza sus ids como base de variantes/alias, y reapunta alias genéricos.
//
// El catálogo modela los MEDICAMENTOS como grupos terapéuticos + alias (el
// nombre de cada fármaco es un alias que resuelve a su grupo) y los CONSUMIBLES
// como productos concretos. Se respeta ese modelo: sólo se dan de alta los
// artículos sin representación previa.
//
// Uso (desde la raíz del repo, contra la BD destino):
//   DATABASE_URL=postgres://reliefhub:reliefhub@localhost:5433/reliefhub \
//     npx ts-node --transpile-only apps/api/scripts/seed-caritas-san-bernardino.ts
//
// Precondición: migraciones aplicadas y taxonomía sembrada (categorías
// medicines / medical_supplies / medical_equipment / hygiene_infantile /
// tools_extraction / clothing ya existen).

import { sql } from 'drizzle-orm';
import { createDb } from '../src/shared/db';
import { DrizzleSupplyRepository } from '../src/contexts/supplies/infrastructure/drizzle/drizzle-supply.repository';
import { DrizzleCategoryRepository } from '../src/contexts/supplies/infrastructure/drizzle/drizzle-category.repository';
import { CreateSupply } from '../src/contexts/supplies/application/create-supply';
import { SupplyAlias } from '../src/contexts/supplies/domain/supply-alias';
import { normalizeSupplyText } from '../src/contexts/supplies/domain/supply-normalize';

interface ProductSpec {
  key: string;
  name: string;
  categorySlug: string;
  /** Producto base: clave de otro producto de esta semilla o nombre de un insumo existente. */
  variantOf?: { key: string } | { existingName: string };
  attributes?: Record<string, unknown>;
  registrationNotes?: string;
}

// Productos nuevos (bases antes que sus variantes). Los grupos terapéuticos y
// consumibles concretos que YA existen no se listan aquí: sólo se les añade
// alias más abajo.
const PRODUCTS: ProductSpec[] = [
  // — Medicamentos: clase terapéutica sin grupo previo —
  {
    key: 'anticoagulantes',
    name: 'Anticoagulantes',
    categorySlug: 'medicines',
    registrationNotes: 'Grupo terapéutico. Incluye enoxaparina (HBPM) y afines.',
  },
  // — Insulina como producto con variantes por tipo (cadena de frío) —
  {
    key: 'insulina',
    name: 'Insulina',
    categorySlug: 'medicines',
    registrationNotes: 'Requiere cadena de frío (2–8 °C).',
  },
  {
    key: 'insulina_nph',
    name: 'Insulina NPH',
    categorySlug: 'medicines',
    variantOf: { key: 'insulina' },
    attributes: { tipo: 'NPH', accion: 'intermedia' },
  },
  {
    key: 'insulina_reg',
    name: 'Insulina regular (cristalina)',
    categorySlug: 'medicines',
    variantOf: { key: 'insulina' },
    attributes: { tipo: 'regular', accion: 'rápida' },
  },
  // — Insumos médicos (medical_supplies) —
  {
    key: 'guantes_est',
    name: 'Guantes quirúrgicos estériles',
    categorySlug: 'medical_supplies',
    registrationNotes: 'Estériles, de un solo uso.',
  },
  {
    key: 'guantes_est_70',
    name: 'Guantes quirúrgicos estériles talla 7.0',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'guantes_est' },
    attributes: { talla: '7.0' },
  },
  {
    key: 'guantes_est_75',
    name: 'Guantes quirúrgicos estériles talla 7.5',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'guantes_est' },
    attributes: { talla: '7.5' },
  },
  {
    key: 'guantes_est_80',
    name: 'Guantes quirúrgicos estériles talla 8.0',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'guantes_est' },
    attributes: { talla: '8.0' },
  },
  {
    key: 'kn95',
    name: 'Mascarillas KN95',
    categorySlug: 'medical_supplies',
    registrationNotes: 'Estándar KN95 (GB2626). Equivalente funcional a N95.',
  },
  { key: 'gasa', name: 'Gasa estéril', categorySlug: 'medical_supplies' },
  { key: 'venda', name: 'Venda elástica', categorySlug: 'medical_supplies' },
  {
    key: 'yeso',
    name: 'Venda de yeso (yeso ortopédico)',
    categorySlug: 'medical_supplies',
  },
  {
    key: 'nacl',
    name: 'Solución salina (NaCl)',
    categorySlug: 'medical_supplies',
  },
  {
    key: 'nacl_09',
    name: 'Solución salina NaCl 0.9%',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'nacl' },
    attributes: { concentracion: '0.9%' },
  },
  {
    key: 'nacl_20',
    name: 'Solución salina NaCl 20%',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'nacl' },
    attributes: { concentracion: '20%' },
  },
  {
    key: 'sutura',
    name: 'Sutura quirúrgica',
    categorySlug: 'medical_supplies',
  },
  {
    key: 'sutura_ny20',
    name: 'Sutura Nylon 2-0',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'sutura' },
    attributes: { material: 'nylon', calibre: '2-0' },
  },
  {
    key: 'sutura_ny30',
    name: 'Sutura Nylon 3-0',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'sutura' },
    attributes: { material: 'nylon', calibre: '3-0' },
  },
  {
    key: 'sutura_se20',
    name: 'Sutura Seda 2-0',
    categorySlug: 'medical_supplies',
    variantOf: { key: 'sutura' },
    attributes: { material: 'seda', calibre: '2-0' },
  },
  {
    key: 'hidrocoloide',
    name: 'Apósitos hidrocoloides',
    categorySlug: 'medical_supplies',
  },
  {
    key: 'gasa_paraf',
    name: 'Gasa parafinada',
    categorySlug: 'medical_supplies',
  },
  {
    key: 'hemocultivo',
    name: 'Frascos de hemocultivo',
    categorySlug: 'medical_supplies',
  },
  {
    key: 'kit_vac',
    name: 'Kit de sistema VAC (esponja y apósito adhesivo)',
    categorySlug: 'medical_supplies',
    registrationNotes: 'Consumible del sistema de presión negativa (VAC).',
  },
  // — Equipamiento médico —
  {
    key: 'equipo_vac',
    name: 'Equipo VAC portátil (terapia de presión negativa)',
    categorySlug: 'medical_equipment',
    registrationNotes: 'Portátil o inalámbrico.',
  },
  // — Higiene infantil —
  {
    key: 'esterilizador',
    name: 'Esterilizador de biberones',
    categorySlug: 'hygiene_infantile',
  },
  {
    key: 'formula_e1',
    name: 'Fórmula infantil etapa 1 (0-6 meses)',
    categorySlug: 'hygiene_infantile',
    variantOf: { existingName: 'Fórmula para bebé' },
    attributes: { etapa: '1', edad: '0-6 meses' },
  },
  {
    key: 'formula_e2',
    name: 'Fórmula infantil etapa 2 (6-12 meses)',
    categorySlug: 'hygiene_infantile',
    variantOf: { existingName: 'Fórmula para bebé' },
    attributes: { etapa: '2', edad: '6-12 meses' },
  },
  {
    key: 'formula_e3',
    name: 'Fórmula infantil etapa 3 (mayores de 12 meses)',
    categorySlug: 'hygiene_infantile',
    variantOf: { existingName: 'Fórmula para bebé' },
    attributes: { etapa: '3', edad: '12+ meses' },
  },
  // — Herramientas / seguridad —
  {
    key: 'carnaza',
    name: 'Guantes de carnaza',
    categorySlug: 'tools_extraction',
    registrationNotes: 'Guantes de cuero para trabajo/seguridad.',
  },
  // — Ropa (para los refugios) —
  {
    key: 'ropa',
    name: 'Ropa en buen estado',
    categorySlug: 'clothing',
    registrationNotes: 'Ropa de segunda mano en buen estado para refugios.',
  },
];

// Alias de búsqueda. target = clave de producto nuevo o nombre de insumo
// existente. Se aplican con "upsert + reapuntado" (idempotente).
type AliasTarget = { key: string } | { existingName: string };
const ALIASES: { target: AliasTarget; terms: string[] }[] = [
  // Fármacos nuevos hacia grupos terapéuticos ya existentes
  {
    target: {
      existingName: 'Antihipertensivos — IECA, ARA II y Calcioantagonistas',
    },
    terms: ['valsartán', 'telmisartán'],
  },
  { target: { existingName: 'Antiácidos y Gastroprotectores' }, terms: ['pantoprazol'] },
  // Productos nuevos
  {
    target: { key: 'anticoagulantes' },
    terms: ['anticoagulante', 'anticoagulantes', 'enoxaparina', 'heparina de bajo peso molecular'],
  },
  { target: { key: 'insulina' }, terms: ['insulina'] },
  { target: { key: 'insulina_nph' }, terms: ['insulina NPH'] },
  {
    target: { key: 'insulina_reg' },
    terms: ['insulina regular', 'insulina cristalina', 'insulina simple'],
  },
  { target: { key: 'guantes_est' }, terms: ['guantes estériles', 'guantes quirúrgicos'] },
  { target: { existingName: 'Guantes de nitrilo (caja)' }, terms: ['guantes descartables', 'guantes desechables'] },
  {
    target: { key: 'kn95' },
    terms: ['KN95', 'mascarilla KN95', 'mascarillas KN95', 'tapabocas KN95', 'tapa bocas KN95 3M', 'KN95 3M'],
  },
  { target: { key: 'gasa' }, terms: ['gasa', 'gasas'] },
  { target: { key: 'venda' }, terms: ['venda', 'vendas', 'venda elástica'] },
  { target: { key: 'yeso' }, terms: ['yeso', 'venda de yeso', 'yeso ortopédico'] },
  { target: { key: 'nacl' }, terms: ['solución salina', 'cloruro de sodio', 'suero fisiológico NaCl'] },
  { target: { key: 'nacl_09' }, terms: ['NaCl 0.9', 'solución NaCl 0.9', 'solución salina 0.9'] },
  { target: { key: 'nacl_20' }, terms: ['NaCl 20', 'solución NaCl 20', 'solución salina 20'] },
  { target: { key: 'sutura' }, terms: ['sutura', 'sutura quirúrgica', 'suturas'] },
  { target: { key: 'sutura_ny20' }, terms: ['sutura nylon 2.0', 'sutura nylon 2-0'] },
  { target: { key: 'sutura_ny30' }, terms: ['sutura nylon 3.0', 'sutura nylon 3-0'] },
  { target: { key: 'sutura_se20' }, terms: ['sutura seda 2.0', 'sutura seda 2-0'] },
  { target: { key: 'hidrocoloide' }, terms: ['apósito hidrocoloide', 'apósitos hidrocoloides', 'hidrocoloide'] },
  { target: { key: 'gasa_paraf' }, terms: ['gasa parafinada', 'gasas parafinadas'] },
  { target: { key: 'hemocultivo' }, terms: ['frasco de hemocultivo', 'frascos de hemocultivo', 'hemocultivo'] },
  { target: { key: 'kit_vac' }, terms: ['kit VAC', 'kit de sistema VAC', 'esponja VAC', 'sistema VAC'] },
  {
    target: { key: 'equipo_vac' },
    terms: ['VAC portátil', 'VAC inalámbrico', 'equipo VAC', 'terapia de presión negativa', 'presión negativa'],
  },
  { target: { key: 'esterilizador' }, terms: ['esterilizador de biberones', 'esterilizador de teteros'] },
  { target: { existingName: 'Biberón / tetero' }, terms: ['teteros'] },
  { target: { key: 'formula_e1' }, terms: ['fórmula 0 a 6', 'fórmula etapa 1', 'fórmula de inicio'] },
  { target: { key: 'formula_e2' }, terms: ['fórmula 6 a 12', 'fórmula etapa 2', 'fórmula de continuación'] },
  { target: { key: 'formula_e3' }, terms: ['fórmula mayores de 12', 'fórmula etapa 3', 'fórmula de crecimiento'] },
  { target: { key: 'carnaza' }, terms: ['guantes de carnaza', 'guante de carnaza', 'guantes de cuero'] },
  { target: { key: 'ropa' }, terms: ['ropa', 'ropa en buen estado', 'vestimenta'] },
  // Términos del folleto hacia productos de higiene/seguridad/refugio existentes
  { target: { existingName: 'Limpiapisos / desinfectante multiusos' }, terms: ['productos de limpieza'] },
  { target: { existingName: 'Toallitas húmedas' }, terms: ['toallas húmedas'] },
  { target: { existingName: 'Jabón de baño' }, terms: ['jabón corporal', 'jabones corporales'] },
  { target: { existingName: 'Champú' }, terms: ['shampoo'] },
  { target: { existingName: 'Pasta dental' }, terms: ['pasta de dientes'] },
  { target: { existingName: 'Papel higiénico' }, terms: ['papel toilet', 'papel toillet'] },
  { target: { existingName: 'Casco de seguridad' }, terms: ['casco de seguridad con arnés', 'casco con arnés'] },
  { target: { existingName: 'Botas de seguridad (par)' }, terms: ['botas de seguridad'] },
  { target: { existingName: 'Colchón individual' }, terms: ['colchones', 'colchón'] },
];

async function run(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, pool } = createDb(url);
  const supplyRepo = new DrizzleSupplyRepository(db);
  const categoryRepo = new DrizzleCategoryRepository(db);
  const createSupply = new CreateSupply(supplyRepo, categoryRepo);

  try {
    // 0) Posiciona el allocator de códigos por encima del máximo global. La
    //    semilla histórica dejó supply_code_seq en 1, lo que colisionaría con
    //    códigos ya sembrados; sin esto, el propio CreateSupply fallaría.
    await db.execute(sql`
      SELECT setval(
        'supply_code_seq',
        GREATEST(
          (SELECT COALESCE(MAX(substring(code FROM 5)::int), 0)
             FROM supplies WHERE code ~ '^[A-Z]{3}-[0-9]+$'),
          (SELECT last_value FROM supply_code_seq)
        ),
        true
      )
    `);

    // 1) Índice nombre-normalizado -> id de los insumos existentes (idempotencia).
    const existing = await supplyRepo.list({});
    const byName = new Map<string, string>();
    for (const s of existing) byName.set(normalizeSupplyText(s.name), s.id);

    const existingId = (name: string): string => {
      const id = byName.get(normalizeSupplyText(name));
      if (!id) throw new Error(`Insumo base/target no encontrado: "${name}"`);
      return id;
    };

    // 2) Alta de productos (con variantes). Reutiliza los que ya existan por nombre.
    const idByKey = new Map<string, string>();
    let created = 0;
    let reused = 0;
    for (const p of PRODUCTS) {
      const already = byName.get(normalizeSupplyText(p.name));
      if (already) {
        idByKey.set(p.key, already);
        reused++;
        continue;
      }
      let variantOfId: string | null = null;
      if (p.variantOf) {
        variantOfId =
          'key' in p.variantOf
            ? idByKey.get(p.variantOf.key) ??
              (() => {
                throw new Error(`Base "${p.variantOf.key}" no creada aún`);
              })()
            : existingId(p.variantOf.existingName);
      }
      const res = await createSupply.execute({
        name: p.name,
        categorySlug: p.categorySlug,
        defaultUnit: 'und',
        attributes: p.attributes ?? null,
        registrationNotes: p.registrationNotes ?? null,
        variantOfId,
      });
      idByKey.set(p.key, res.id);
      byName.set(normalizeSupplyText(p.name), res.id);
      created++;
      console.log(`  + ${res.code}  ${p.name}`);
    }

    const resolveTarget = (t: AliasTarget): string =>
      'key' in t ? idByKey.get(t.key)! : existingId(t.existingName);

    // 3) Alias: upsert idempotente + reapuntado (borra el alias si apuntaba a
    //    otro insumo y lo vuelve a crear hacia el destino correcto).
    let aliasUpserts = 0;
    for (const group of ALIASES) {
      const supplyId = resolveTarget(group.target);
      for (const term of group.terms) {
        const norm = SupplyAlias.normalize(term);
        const found = await db.execute<{ supply_id: string }>(sql`
          SELECT supply_id FROM supply_aliases WHERE alias_norm = ${norm} LIMIT 1
        `);
        const row = found.rows[0];
        if (row && row.supply_id === supplyId) continue; // ya correcto
        if (row) await supplyRepo.removeAlias(norm); // reapunta
        await supplyRepo.addAlias(SupplyAlias.create({ alias: term, supplyId }));
        aliasUpserts++;
      }
    }

    console.log(
      `\n[seed-caritas] Productos creados: ${created}, reutilizados: ${reused}. Alias upserts: ${aliasUpserts}.`,
    );
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[seed-caritas] ERROR', err);
  process.exitCode = 1;
});
