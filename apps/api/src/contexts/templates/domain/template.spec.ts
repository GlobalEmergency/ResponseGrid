import { Template } from './template';
import { TemplateId } from './template-id';

describe('Template', () => {
  const id = TemplateId.fromString('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

  it('creates a template with all fields', () => {
    const t = Template.create({
      id,
      name: 'Terremoto básico',
      description: 'Template para terremotos de magnitud moderada',
      dontBringList: ['mascotas', 'vehículos grandes'],
      defaultAnnouncement: 'No traer mascotas al centro de acopio',
    });

    expect(t.id.value).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(t.name).toBe('Terremoto básico');
    expect(t.description).toBe('Template para terremotos de magnitud moderada');
    expect(t.dontBringList).toEqual(['mascotas', 'vehículos grandes']);
    expect(t.defaultAnnouncement).toBe('No traer mascotas al centro de acopio');
    expect(t.createdAt).toBeInstanceOf(Date);
  });

  it('creates a template with null defaultAnnouncement', () => {
    const t = Template.create({
      id,
      name: 'Template sin anuncio',
      description: 'Descripción',
      dontBringList: [],
      defaultAnnouncement: null,
    });

    expect(t.defaultAnnouncement).toBeNull();
    expect(t.dontBringList).toEqual([]);
  });

  it('round-trips through snapshot', () => {
    const original = Template.create({
      id,
      name: 'Template round-trip',
      description: 'Desc',
      dontBringList: ['item1', 'item2'],
      defaultAnnouncement: 'Anuncio',
    });

    const restored = Template.fromSnapshot(original.toSnapshot());

    expect(restored.id.value).toBe(original.id.value);
    expect(restored.name).toBe(original.name);
    expect(restored.description).toBe(original.description);
    expect(restored.dontBringList).toEqual(original.dontBringList);
    expect(restored.defaultAnnouncement).toBe(original.defaultAnnouncement);
    expect(restored.createdAt).toEqual(original.createdAt);
  });
});
