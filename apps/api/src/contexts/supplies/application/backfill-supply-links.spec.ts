import { BackfillSupplyLinks } from './backfill-supply-links';
import {
  PublicSupplyRecord,
  UnlinkedLineGroup,
} from '@globalemergency/warehouse-core/catalog';

function makeRecord(
  overrides: Partial<PublicSupplyRecord> & { id: string; name: string },
): PublicSupplyRecord {
  return {
    code: 'INS-9999',
    translations: {},
    categorySlug: 'food',
    categoryLabel: 'Alimentos',
    categoryTranslations: {},
    defaultUnit: null,
    attributes: {},
    variantOfId: null,
    aliases: [],
    ...overrides,
  };
}

function makeUseCase(
  records: PublicSupplyRecord[],
  groups: UnlinkedLineGroup[],
  linkedLines = 0,
) {
  const catalog = { listActive: jest.fn().mockResolvedValue(records) };
  const repo = {
    listUnlinked: jest.fn().mockResolvedValue(groups),
    applyLinks: jest.fn().mockResolvedValue(linkedLines),
  };
  return { useCase: new BackfillSupplyLinks(catalog, repo), catalog, repo };
}

const water = makeRecord({
  id: 'sup-water',
  code: 'INS-0001',
  name: 'Agua potable',
  translations: { en: 'Drinking water' },
  categorySlug: 'water',
  aliases: ['agua embotellada'],
});

describe('BackfillSupplyLinks', () => {
  it('enlaza por nombre y alias (normalización de mayúsculas/tildes) y deja el resto como no-casado', async () => {
    const { useCase, repo } = makeUseCase(
      [water],
      [
        { source: 'need_items', name: 'AGUA   Potable', lines: 3 },
        { source: 'offer_items', name: 'Agua embotellada', lines: 2 },
        { source: 'resource_items', name: 'Harina PAN', lines: 5 },
      ],
      5,
    );

    const result = await useCase.execute();

    expect(repo.applyLinks).toHaveBeenCalledWith([
      { source: 'need_items', name: 'AGUA   Potable', supplyId: 'sup-water' },
      {
        source: 'offer_items',
        name: 'Agua embotellada',
        supplyId: 'sup-water',
      },
    ]);
    expect(result.linkedNames).toBe(2);
    expect(result.linkedLines).toBe(5);
    expect(result.unmatched).toEqual([
      {
        name: 'Harina PAN',
        lines: 5,
        sources: ['resource_items'],
        ambiguous: false,
      },
    ]);
    expect(result.unmatchedLines).toBe(5);
  });

  it('es idempotente: sin grupos resolubles no escribe nada', async () => {
    const { useCase, repo } = makeUseCase(
      [water],
      [{ source: 'container_lines', name: 'Harina PAN', lines: 1 }],
    );

    const result = await useCase.execute();

    expect(repo.applyLinks).not.toHaveBeenCalled();
    expect(result.linkedLines).toBe(0);
    expect(result.linkedNames).toBe(0);
  });

  it('agrega los no-casados por texto normalizado sumando líneas y fuentes, ordenado por volumen', async () => {
    const { useCase } = makeUseCase(
      [water],
      [
        { source: 'need_items', name: 'Harina PAN', lines: 2 },
        { source: 'container_lines', name: 'harina  pan', lines: 3 },
        { source: 'offer_items', name: 'Pañales', lines: 1 },
      ],
    );

    const report = await useCase.report();

    expect(report.unmatched).toEqual([
      {
        name: 'Harina PAN',
        lines: 5,
        sources: ['need_items', 'container_lines'],
        ambiguous: false,
      },
      { name: 'Pañales', lines: 1, sources: ['offer_items'], ambiguous: false },
    ]);
    expect(report.unmatchedLines).toBe(6);
  });

  it('una etiqueta ambigua (misma forma normalizada en dos insumos) no se enlaza', async () => {
    const gloves = makeRecord({
      id: 'sup-gloves-a',
      code: 'INS-0002',
      name: 'Guantes',
    });
    const glovesDupe = makeRecord({
      id: 'sup-gloves-b',
      code: 'INS-0003',
      name: 'GUANTES',
    });
    const { useCase, repo } = makeUseCase(
      [gloves, glovesDupe],
      [{ source: 'resource_items', name: 'guantes', lines: 4 }],
    );

    const result = await useCase.execute();

    expect(repo.applyLinks).not.toHaveBeenCalled();
    // ambiguous=true distingue el remedio: fusionar duplicados, no crear alias.
    expect(result.unmatched).toEqual([
      {
        name: 'guantes',
        lines: 4,
        sources: ['resource_items'],
        ambiguous: true,
      },
    ]);
  });

  it('report() calcula lo que casaría sin ejecutar el backfill', async () => {
    const { useCase, repo } = makeUseCase(
      [water],
      [
        { source: 'need_items', name: 'agua potable', lines: 3 },
        { source: 'donation_intake_lines', name: 'INS-0001', lines: 1 },
        { source: 'offer_items', name: 'Leche en polvo', lines: 2 },
      ],
    );

    const report = await useCase.report();

    expect(repo.applyLinks).not.toHaveBeenCalled();
    expect(report.pendingNames).toBe(2);
    expect(report.pendingLines).toBe(4);
    expect(report.unmatched).toEqual([
      {
        name: 'Leche en polvo',
        lines: 2,
        sources: ['offer_items'],
        ambiguous: false,
      },
    ]);
  });
});
