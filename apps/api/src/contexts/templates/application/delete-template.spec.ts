import { DeleteTemplate } from './delete-template';
import { CreateTemplate } from './create-template';
import { InMemoryTemplateRepository } from '../infrastructure/in-memory-template.repository';
import { TemplateNotFoundError } from './template-not-found.error';

describe('DeleteTemplate', () => {
  it('deletes an existing template', async () => {
    const repo = new InMemoryTemplateRepository();
    const create = new CreateTemplate(repo);
    const deleteUc = new DeleteTemplate(repo);

    const { id } = await create.execute({
      name: 'To Delete',
      description: 'Desc',
      dontBringList: [],
      recommendedList: [],
    });

    await deleteUc.execute({ id });

    const all = await repo.listAll();
    expect(all).toHaveLength(0);
  });

  it('throws TemplateNotFoundError when template does not exist', async () => {
    const repo = new InMemoryTemplateRepository();
    const deleteUc = new DeleteTemplate(repo);

    await expect(
      deleteUc.execute({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
    ).rejects.toThrow(TemplateNotFoundError);
  });
});
