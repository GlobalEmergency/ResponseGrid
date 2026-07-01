import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emergencyAccountLinks } from './app-bar-context.ts';

test('sin slug no hay enlaces de emergencia', () => {
  assert.deepEqual(emergencyAccountLinks(undefined), []);
});

test('con slug devuelve los 3 enlaces contextuales', () => {
  const links = emergencyAccountLinks('terremoto-venezuela-2026');
  assert.equal(links.length, 3);
  assert.deepEqual(
    links.map((l) => l.href),
    [
      '/e/terremoto-venezuela-2026/mis-puntos',
      '/e/terremoto-venezuela-2026/mi-voluntariado',
      '/e/terremoto-venezuela-2026/mis-expediciones',
    ],
  );
  assert.deepEqual(
    links.map((l) => l.labelKey),
    ['my_points', 'my_volunteering', 'my_shipments'],
  );
});
