import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emergencyAccountLinks, resolveAppBarCurrentPath } from './app-bar-context.ts';

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

// #278: el `next` del login desde sub-páginas (ej. `/e/:slug/registrar`) debe
// apuntar a la página exacta, no colapsar a la raíz de la emergencia.
test('con currentPath explícito, se usa tal cual (página exacta)', () => {
  assert.equal(
    resolveAppBarCurrentPath('terremoto-venezuela-2026', '/e/terremoto-venezuela-2026/registrar'),
    '/e/terremoto-venezuela-2026/registrar',
  );
});

test('sin currentPath pero con slug, cae a la raíz de la emergencia', () => {
  assert.equal(resolveAppBarCurrentPath('terremoto-venezuela-2026', undefined), '/e/terremoto-venezuela-2026');
});

test('sin currentPath ni slug, cae a la raíz del sitio', () => {
  assert.equal(resolveAppBarCurrentPath(undefined, undefined), '/');
});
