import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupByCountry,
  isVenezuela,
  type ResourceViewDto,
} from './group-by-country.ts';

/**
 * groupByCountry only inspects `country`, but we build a complete
 * ResourceViewDto so the fixtures stay type-honest against the real DTO.
 */
function makeResource(id: string, country: string | null): ResourceViewDto {
  return {
    id,
    type: 'collection_point',
    stage: 'origin',
    name: `Resource ${id}`,
    description: null,
    location: { address: '—', latitude: 0, longitude: 0 },
    verificationLevel: 'unverified',
    publicStatus: 'active',
    ownerOrganizationId: null,
    accepts: [],
    contact: null,
    schedule: null,
    manager: null,
    sourceName: null,
    externalUpdatedAt: null,
    country,
    city: null,
  };
}

test('groups a full-name "Venezuela" (the real ingested value) into venezuela', () => {
  const ve = makeResource('1', 'Venezuela');
  const { venezuela, diaspora, other } = groupByCountry([ve]);

  assert.deepEqual(venezuela, [ve]);
  assert.equal(diaspora.length, 0);
  assert.equal(other.length, 0);
});

test('matches Venezuela case-insensitively, trimmed, and via the "VE" fallback', () => {
  const items = [
    makeResource('1', 'venezuela'),
    makeResource('2', '  VENEZUELA  '),
    makeResource('3', 'VE'),
    makeResource('4', 've'),
  ];

  const { venezuela, diaspora, other } = groupByCountry(items);

  assert.equal(venezuela.length, 4);
  assert.equal(diaspora.length, 0);
  assert.equal(other.length, 0);
});

test('buckets other full Spanish country names into diaspora', () => {
  const es = makeResource('1', 'España');
  const co = makeResource('2', 'Colombia');

  const { venezuela, diaspora, other } = groupByCountry([es, co]);

  assert.equal(venezuela.length, 0);
  assert.deepEqual(diaspora, [es, co]);
  assert.equal(other.length, 0);
});

test('buckets null and empty-string country into other', () => {
  const items = [makeResource('1', null), makeResource('2', '')];

  const { venezuela, diaspora, other } = groupByCountry(items);

  assert.equal(venezuela.length, 0);
  assert.equal(diaspora.length, 0);
  assert.equal(other.length, 2);
});

test('partitions a mixed list while preserving per-group order', () => {
  const items = [
    makeResource('1', 'Venezuela'),
    makeResource('2', 'España'),
    makeResource('3', null),
    makeResource('4', 've'),
  ];

  const { venezuela, diaspora, other } = groupByCountry(items);

  assert.deepEqual(
    venezuela.map((r) => r.id),
    ['1', '4'],
  );
  assert.deepEqual(
    diaspora.map((r) => r.id),
    ['2'],
  );
  assert.deepEqual(
    other.map((r) => r.id),
    ['3'],
  );
});

test('isVenezuela accepts the full name and ISO code, rejects everything else', () => {
  assert.equal(isVenezuela('Venezuela'), true);
  assert.equal(isVenezuela('venezuela'), true);
  assert.equal(isVenezuela('  Venezuela  '), true);
  assert.equal(isVenezuela('VE'), true);
  assert.equal(isVenezuela('ve'), true);
  assert.equal(isVenezuela('España'), false);
  assert.equal(isVenezuela('Colombia'), false);
  assert.equal(isVenezuela('Venezolano'), false);
  assert.equal(isVenezuela(''), false);
});
