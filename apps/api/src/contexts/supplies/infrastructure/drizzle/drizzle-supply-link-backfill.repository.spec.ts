import { relinkContainerLines } from './drizzle-supply-link-backfill.repository';
import { SupplyLineSnapshot } from '@globalemergency/warehouse-core/kernel';

function line(overrides: Partial<SupplyLineSnapshot>): SupplyLineSnapshot {
  return {
    name: 'Agua potable',
    quantity: 1,
    unit: null,
    category: 'water',
    supplyId: null,
    presentation: null,
    expiresAt: null,
    ...overrides,
  } as SupplyLineSnapshot;
}

describe('relinkContainerLines', () => {
  const map = new Map([['Agua potable', 'sup-water']]);

  it('enlaza solo las líneas sin supplyId cuyo nombre crudo casa', () => {
    const lines = [
      line({}),
      line({ name: 'Harina PAN' }),
      line({ supplyId: 'sup-manual' }),
    ];

    const result = relinkContainerLines(lines, map);

    expect(result.relinked).toBe(1);
    expect(result.lines[0].supplyId).toBe('sup-water');
    expect(result.lines[1].supplyId).toBeNull();
    expect(result.lines[2].supplyId).toBe('sup-manual');
  });

  it('no muta el array original y preserva el resto de campos de la línea', () => {
    const original = line({ quantity: 7, presentation: 'botella 1.5L' });

    const result = relinkContainerLines([original], map);

    expect(original.supplyId).toBeNull();
    expect(result.lines[0]).toEqual({
      ...original,
      supplyId: 'sup-water',
    });
  });

  it('devuelve relinked=0 cuando no hay nada que enlazar', () => {
    const lines = [line({ supplyId: 'sup-water' }), line({ name: 'Otro' })];

    const result = relinkContainerLines(lines, map);

    expect(result.relinked).toBe(0);
    expect(result.lines).toEqual(lines);
  });
});
