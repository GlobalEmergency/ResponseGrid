import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaLarga, validarInformes } from './informes.ts';

const base = { archivo: 'mapa.pdf', titulo: 'Mapa', resumen: 'Texto', fecha: '2026-11-21' };

test('acepta un informe bien formado y ordena por fecha', () => {
  const r = validarInformes({ informes: [{ ...base, archivo: 'a.pdf', fecha: '2026-11-01' }, { ...base, portada: 'mapa.jpg', paginas: 14, tamano: '9 MB' }] });
  assert.equal(r.length, 2);
  assert.equal(r[0]!.archivo, 'mapa.pdf');
  assert.equal(r[0]!.portada, 'mapa.jpg');
  assert.equal(r[0]!.paginas, 14);
});

test('descarta rutas, otras extensiones y entradas incompletas', () => {
  for (const mal of [
    { ...base, archivo: '../secreto.pdf' },
    { ...base, archivo: 'carpeta/mapa.pdf' },
    { ...base, archivo: 'mapa.exe' },
    { ...base, archivo: 'https://otro.sitio/mapa.pdf' },
    { ...base, titulo: '' },
    { ...base, fecha: '21-11-2026' },
    null,
  ]) {
    assert.deepEqual(validarInformes({ informes: [mal] }), [], JSON.stringify(mal));
  }
  assert.deepEqual(validarInformes(null), []);
  assert.deepEqual(validarInformes({ informes: 'x' }), []);
});

test('una portada con ruta se ignora, pero el informe queda', () => {
  const r = validarInformes({ informes: [{ ...base, portada: '../x.jpg' }] });
  assert.equal(r.length, 1);
  assert.equal(r[0]!.portada, undefined);
});

test('fecha larga en español', () => {
  assert.equal(fechaLarga('2026-11-21'), '21 de noviembre de 2026');
});
