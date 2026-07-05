import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromSupplyDto } from './catalogue-supply.ts';

const dto = {
  id: 'cf8da6e3-7b91-52ff-8cf7-bbff50786c35',
  code: 'WAT-0001',
  name: 'Agua potable (botellón 18L)',
  categorySlug: 'water',
  categoryLabel: 'Agua',
  defaultUnit: 'und',
  attributes: { size: '18L' },
  variantOfId: null,
  aliases: ['botellón'],
};

test('fromSupplyDto keeps only UI fields, localized name', () => {
  assert.deepEqual(fromSupplyDto(dto), {
    id: 'cf8da6e3-7b91-52ff-8cf7-bbff50786c35',
    code: 'WAT-0001',
    name: 'Agua potable (botellón 18L)',
    categorySlug: 'water',
    defaultUnit: 'und',
    aliases: ['botellón'],
  });
});

test('tolerates a null defaultUnit', () => {
  assert.equal(fromSupplyDto({ ...dto, defaultUnit: null }).defaultUnit, null);
});
