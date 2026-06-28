import { CreateTemplate } from './create-template';
import { InMemoryTemplateRepository } from '../infrastructure/in-memory-template.repository';

describe('CreateTemplate', () => {
  it('creates a template and returns its id', async () => {
    const repo = new InMemoryTemplateRepository();
    const useCase = new CreateTemplate(repo);

    const result = await useCase.execute({
      name: 'Terremoto',
      description: 'Template básico para terremotos',
      dontBringList: ['mascotas', 'joyas'],
      recommendedList: ['agua', 'dieta líquida'],
      defaultAnnouncement: 'No traer mascotas',
    });

    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);

    const all = await repo.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Terremoto');
    expect(all[0].dontBringList).toEqual(['mascotas', 'joyas']);
    expect(all[0].recommendedList).toEqual(['agua', 'dieta líquida']);
    expect(all[0].defaultAnnouncement).toBe('No traer mascotas');
  });

  it('creates a template without optional defaultAnnouncement', async () => {
    const repo = new InMemoryTemplateRepository();
    const useCase = new CreateTemplate(repo);

    const result = await useCase.execute({
      name: 'Inundación',
      description: 'Template para inundaciones',
      dontBringList: [],
      recommendedList: [],
    });

    expect(typeof result.id).toBe('string');
    const all = await repo.listAll();
    expect(all[0].defaultAnnouncement).toBeNull();
  });
});
