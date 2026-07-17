import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CategoryRegistry, CategoryNode } from './category-registry.js';
import { getCategoryPrefix } from './category.js';
import { UnknownCategoryError } from './category-errors.js';

const NODES: CategoryNode[] = [
  { slug: 'food', parentSlug: null, codePrefix: 'FOO' },
  { slug: 'food_fresh', parentSlug: 'food', codePrefix: null },
  { slug: 'food_non_perishable', parentSlug: 'food', codePrefix: 'FNP' },
  { slug: 'medical', parentSlug: null, codePrefix: 'MED' },
  { slug: 'medicines', parentSlug: 'medical', codePrefix: null },
  { slug: 'orphan', parentSlug: 'ghost', codePrefix: null },
];

function registry(): CategoryRegistry {
  return CategoryRegistry.fromNodes(NODES);
}

test('has / get / resolve', () => {
  const r = registry();
  assert.ok(r.has('food'));
  assert.ok(!r.has('nope'));
  assert.equal(r.get('food')?.codePrefix, 'FOO');
  assert.equal(r.get('nope'), null);
  assert.equal(r.resolve('medical').slug, 'medical');
  assert.throws(() => r.resolve('nope'), UnknownCategoryError);
});

test('parentOf / childrenOf', () => {
  const r = registry();
  assert.equal(r.parentOf('food_fresh')?.slug, 'food');
  assert.equal(r.parentOf('food'), null); // root
  assert.equal(r.parentOf('orphan'), null); // dangling parent
  assert.deepEqual(
    r.childrenOf('food').map((n) => n.slug),
    ['food_fresh', 'food_non_perishable'],
  );
  assert.deepEqual(r.childrenOf('medicines'), []);
});

test('roots include real roots and nodes with a dangling parent', () => {
  const r = registry();
  assert.deepEqual(
    r.roots().map((n) => n.slug),
    ['food', 'medical', 'orphan'],
  );
});

test('ancestorsOf walks nearest-first to the root', () => {
  const r = registry();
  assert.deepEqual(
    r.ancestorsOf('food_fresh').map((n) => n.slug),
    ['food'],
  );
  assert.deepEqual(r.ancestorsOf('food'), []);
});

test('prefixFor falls back through the hierarchy then to VAR', () => {
  const r = registry();
  assert.equal(r.prefixFor('food'), 'FOO');
  assert.equal(r.prefixFor('food_fresh'), 'FOO'); // inherits parent
  assert.equal(r.prefixFor('food_non_perishable'), 'FNP'); // own prefix wins
  assert.equal(r.prefixFor('medicines'), 'MED'); // inherits medical
  assert.equal(r.prefixFor('orphan'), 'VAR'); // dangling → fallback
  assert.equal(r.prefixFor('unknown'), 'VAR');
});

test('prefixFor matches the free getCategoryPrefix helper', () => {
  const r = registry();
  for (const slug of [
    'food',
    'food_fresh',
    'food_non_perishable',
    'medicines',
    'orphan',
    'unknown',
  ]) {
    assert.equal(r.prefixFor(slug), getCategoryPrefix(slug, NODES));
  }
});

test('is cycle-safe on a parent cycle', () => {
  const cyclic = CategoryRegistry.fromNodes([
    { slug: 'a', parentSlug: 'b', codePrefix: null },
    { slug: 'b', parentSlug: 'a', codePrefix: null },
  ]);
  assert.equal(cyclic.prefixFor('a'), 'VAR');
  assert.deepEqual(
    cyclic.ancestorsOf('a').map((n) => n.slug),
    ['b'],
  );
});

test('duplicate slugs keep the last (lenient ingest)', () => {
  const r = CategoryRegistry.fromNodes([
    { slug: 'x', parentSlug: null, codePrefix: 'AAA' },
    { slug: 'x', parentSlug: null, codePrefix: 'BBB' },
  ]);
  assert.equal(r.get('x')?.codePrefix, 'BBB');
  assert.deepEqual(r.slugs(), ['x']);
});
