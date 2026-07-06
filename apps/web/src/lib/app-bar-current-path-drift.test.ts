import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * #342 (follow-up de #336/#278): AppBar.currentPath se pasa como ~24 literales
 * de ruta duplicando el routing file-based de `src/app`, sin nada que
 * garantice que el literal coincide con la URL real — un rename de carpeta o
 * un typo pasaría build/lint/tests y solo se notaría en runtime como un `next`
 * de login incorrecto.
 *
 * En vez del refactor mayor evaluado en el issue (exponer el pathname vía
 * header de proxy — descartado por ser desproporcionado para un follow-up
 * pequeño y por acoplar rutas no protegidas al matcher de auth), este test
 * escanea cada `page.tsx` bajo `src/app` y comprueba que todo `currentPath`
 * que declara coincide con la ruta real derivada de la carpeta del fichero.
 */

const LIB_DIR = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(LIB_DIR, '..', 'app');

function findPageFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findPageFiles(full));
    } else if (entry.name === 'page.tsx') {
      files.push(full);
    }
  }
  return files;
}

/**
 * Ruta esperada en la misma notación `${param}` que usan los literales de
 * `currentPath` (p. ej. `/e/${slug}/registrar` para
 * `app/e/[slug]/registrar/page.tsx`). Los route groups `(name)` no aparecen
 * en la URL y se descartan.
 */
function expectedRouteFromFile(pageFile: string): string {
  const segments = relative(APP_DIR, dirname(pageFile))
    .split(/[\\/]/)
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
    .map((seg) => {
      const dynamic = /^\[(?:\.\.\.)?(\w+)\]$/.exec(seg);
      return dynamic ? '${' + dynamic[1] + '}' : seg;
    });
  return '/' + segments.join('/');
}

// Cubre las dos formas que usan las páginas: currentPath="literal" y
// currentPath={`template ${literal}`}.
const CURRENT_PATH_RE = /currentPath=(?:"([^"]*)"|\{`([^`]*)`\})/g;

test('cada currentPath declarado coincide con la ruta real del fichero (evita drift #342)', () => {
  const pageFiles = findPageFiles(APP_DIR);
  let checked = 0;

  for (const pageFile of pageFiles) {
    const source = readFileSync(pageFile, 'utf8');
    const expected = expectedRouteFromFile(pageFile);
    CURRENT_PATH_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CURRENT_PATH_RE.exec(source)) !== null) {
      const literal = match[1] ?? match[2] ?? '';
      const pathname = literal.split('?')[0];
      assert.equal(
        pathname,
        expected,
        `${relative(APP_DIR, pageFile)}: currentPath "${literal}" no coincide con la ruta real "${expected}"`,
      );
      checked += 1;
    }
  }

  // Guarda al guardián: si nadie pasara ya currentPath, el test pasaría sin
  // comprobar nada. ~24 literales conocidos a fecha de #342.
  assert.ok(checked >= 20, `se esperaban >=20 literales de currentPath, se hallaron ${checked}`);
});

test('#342: el resourceId del currentPath de pre-registro va URL-encoded', () => {
  const file = join(APP_DIR, 'e', '[slug]', 'pre-registro', 'page.tsx');
  const source = readFileSync(file, 'utf8');
  assert.match(
    source,
    /currentPath=\{`\/e\/\$\{slug\}\/pre-registro\?resourceId=\$\{encodeURIComponent\(resourceId\)\}`\}/,
    'currentPath debe codificar resourceId con encodeURIComponent para que un id con &/#/espacio no rompa el redirect de login',
  );
});
