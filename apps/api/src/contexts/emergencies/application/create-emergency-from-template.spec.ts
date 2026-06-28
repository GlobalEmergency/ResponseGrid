import { CreateEmergencyFromTemplate } from './create-emergency-from-template';
import { InMemoryEmergencyRepository } from '../infrastructure/in-memory-emergency.repository';
import { InMemoryTemplateRepository } from '../../templates/infrastructure/in-memory-template.repository';
import { Template } from '../../templates/domain/template';
import { TemplateId } from '../../templates/domain/template-id';
import { TemplateNotFoundError } from '../../templates/application/template-not-found.error';
import { SlugAlreadyExistsError } from './slug-already-exists.error';
import { Slug } from '../domain/slug';

const TEMPLATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('CreateEmergencyFromTemplate', () => {
  function makeTemplate(opts: {
    dontBringList?: string[];
    recommendedList?: string[];
    defaultAnnouncement?: string | null;
  }) {
    return Template.create({
      id: TemplateId.fromString(TEMPLATE_ID),
      name: 'Terremoto básico',
      description: 'Template de prueba',
      dontBringList: opts.dontBringList ?? [],
      recommendedList: opts.recommendedList ?? [],
      defaultAnnouncement: opts.defaultAnnouncement ?? null,
    });
  }

  it('creates an emergency copying lists and announcement from template', async () => {
    const emergencyRepo = new InMemoryEmergencyRepository();
    const templateRepo = new InMemoryTemplateRepository();
    await templateRepo.save(
      makeTemplate({
        dontBringList: ['mascotas', 'joyas'],
        recommendedList: ['agua', 'dieta líquida'],
        defaultAnnouncement: 'No traer mascotas',
      }),
    );

    const useCase = new CreateEmergencyFromTemplate(
      emergencyRepo,
      templateRepo,
    );
    const result = await useCase.execute({
      templateId: TEMPLATE_ID,
      name: 'Terremoto Valencia',
      slug: 'terremoto-valencia',
      country: 'ES',
    });

    expect(typeof result.id).toBe('string');
    expect(result.slug).toBe('terremoto-valencia');

    const created = await emergencyRepo.findBySlug(
      Slug.fromString('terremoto-valencia'),
    );
    expect(created).not.toBeNull();
    expect(created?.dontBringList).toEqual(['mascotas', 'joyas']);
    expect(created?.recommendedList).toEqual(['agua', 'dieta líquida']);
    expect(created?.announcement).toBe('No traer mascotas');
  });

  it('works when template has null defaultAnnouncement', async () => {
    const emergencyRepo = new InMemoryEmergencyRepository();
    const templateRepo = new InMemoryTemplateRepository();
    await templateRepo.save(
      makeTemplate({
        dontBringList: [],
        recommendedList: [],
        defaultAnnouncement: null,
      }),
    );

    const useCase = new CreateEmergencyFromTemplate(
      emergencyRepo,
      templateRepo,
    );
    const result = await useCase.execute({
      templateId: TEMPLATE_ID,
      name: 'Inundación Murcia',
      slug: 'inundacion-murcia',
      country: 'ES',
    });

    const created = await emergencyRepo.findBySlug(
      Slug.fromString('inundacion-murcia'),
    );
    expect(created?.announcement).toBeNull();
    expect(result.slug).toBe('inundacion-murcia');
  });

  it('throws TemplateNotFoundError when template does not exist', async () => {
    const emergencyRepo = new InMemoryEmergencyRepository();
    const templateRepo = new InMemoryTemplateRepository();
    const useCase = new CreateEmergencyFromTemplate(
      emergencyRepo,
      templateRepo,
    );

    await expect(
      useCase.execute({
        templateId: TEMPLATE_ID,
        name: 'Test',
        slug: 'test',
        country: 'ES',
      }),
    ).rejects.toThrow(TemplateNotFoundError);
  });

  it('throws SlugAlreadyExistsError when slug is taken', async () => {
    const emergencyRepo = new InMemoryEmergencyRepository();
    const templateRepo = new InMemoryTemplateRepository();
    await templateRepo.save(makeTemplate({}));

    const useCase = new CreateEmergencyFromTemplate(
      emergencyRepo,
      templateRepo,
    );
    await useCase.execute({
      templateId: TEMPLATE_ID,
      name: 'Primera',
      slug: 'taken',
      country: 'ES',
    });

    await expect(
      useCase.execute({
        templateId: TEMPLATE_ID,
        name: 'Segunda',
        slug: 'taken',
        country: 'ES',
      }),
    ).rejects.toThrow(SlugAlreadyExistsError);
  });
});
