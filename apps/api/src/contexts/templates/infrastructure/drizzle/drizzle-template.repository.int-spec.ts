import { createDb, Db } from '../../../../shared/db';
import { templatesTable } from './schema';
import { DrizzleTemplateRepository } from './drizzle-template.repository';
import { Template } from '../../domain/template';
import { TemplateId } from '../../domain/template-id';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const SEED_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('DrizzleTemplateRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleTemplateRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleTemplateRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(templatesTable);
  });

  it('round-trips a Template through Postgres (save + findById)', async () => {
    const template = Template.create({
      id: TemplateId.fromString(SEED_ID),
      name: 'Terremoto básico',
      description: 'Template para terremotos',
      dontBringList: ['mascotas', 'joyas'],
      recommendedList: ['agua', 'dieta líquida'],
      defaultAnnouncement: 'No traer mascotas',
    });

    await repo.save(template);
    const found = await repo.findById(TemplateId.fromString(SEED_ID));

    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(SEED_ID);
    expect(found?.name).toBe('Terremoto básico');
    expect(found?.description).toBe('Template para terremotos');
    expect(found?.dontBringList).toEqual(['mascotas', 'joyas']);
    expect(found?.recommendedList).toEqual(['agua', 'dieta líquida']);
    expect(found?.defaultAnnouncement).toBe('No traer mascotas');
  });

  it('listAll returns all saved templates', async () => {
    await repo.save(
      Template.create({
        id: TemplateId.fromString(SEED_ID),
        name: 'T1',
        description: 'D1',
        dontBringList: [],
        recommendedList: [],
        defaultAnnouncement: null,
      }),
    );
    await repo.save(
      Template.create({
        id: TemplateId.fromString('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        name: 'T2',
        description: 'D2',
        dontBringList: ['x'],
        recommendedList: ['y'],
        defaultAnnouncement: null,
      }),
    );

    const all = await repo.listAll();
    expect(all).toHaveLength(2);
  });

  it('delete removes the template', async () => {
    const id = TemplateId.fromString(SEED_ID);
    await repo.save(
      Template.create({
        id,
        name: 'To Delete',
        description: 'Desc',
        dontBringList: [],
        recommendedList: [],
        defaultAnnouncement: null,
      }),
    );

    await repo.delete(id);
    const found = await repo.findById(id);
    expect(found).toBeNull();
  });

  it('findById returns null when absent', async () => {
    const result = await repo.findById(
      TemplateId.fromString('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
    );
    expect(result).toBeNull();
  });
});
