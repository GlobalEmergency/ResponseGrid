import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plataformaActiva, rutaAbiertaSinPlataforma, rutaProtegida } from './plataforma.ts';

test('la plataforma está activa salvo que la variable diga false', () => {
  const antes = process.env.PLATAFORMA_ACTIVA;
  delete process.env.PLATAFORMA_ACTIVA;
  assert.equal(plataformaActiva(), true);
  process.env.PLATAFORMA_ACTIVA = 'true';
  assert.equal(plataformaActiva(), true);
  process.env.PLATAFORMA_ACTIVA = 'false';
  assert.equal(plataformaActiva(), false);
  if (antes === undefined) delete process.env.PLATAFORMA_ACTIVA;
  else process.env.PLATAFORMA_ACTIVA = antes;
});

test('con la plataforma apagada siguen la portada, lo legal y los estáticos', () => {
  for (const ruta of [
    '/',
    '/privacidad',
    '/privacidad/',
    '/eliminar-datos',
    '/offline',
    '/apple-icon',
    '/_next/static/chunks/a.js',
    '/_next/image',
    '/capas/galapagos-2026/puntos.geojson',
    '/marca/logo.svg',
    '/icons/icon-192.png',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
    '/sw.js',
    '/icon.svg',
  ]) {
    assert.equal(rutaAbiertaSinPlataforma(ruta), true, ruta);
  }
});

test('con la plataforma apagada se cierran las rutas de ResponseGrid', () => {
  for (const ruta of [
    '/e/galapagos-2026',
    '/e/galapagos-2026/peticion',
    '/e/galapagos-2026/foto.png',
    '/login',
    '/signup',
    '/dashboard',
    '/admin/users',
    '/panel/organizaciones',
    '/como-funciona',
    '/docs',
    '/verificar',
    '/api/upload',
    '/api/geocode',
    '/emergencies/galapagos-2026/manage',
  ]) {
    assert.equal(rutaAbiertaSinPlataforma(ruta), false, ruta);
  }
});

test('áreas que exigen sesión', () => {
  for (const ruta of ['/dashboard', '/dashboard/profile', '/admin', '/organizations/1/manage', '/panel/grupos', '/emergencies/x/manage', '/emergencies/x/manage/needs']) {
    assert.equal(rutaProtegida(ruta), true, ruta);
  }
  for (const ruta of ['/', '/e/x', '/emergencies/x', '/administracion', '/login']) {
    assert.equal(rutaProtegida(ruta), false, ruta);
  }
});
