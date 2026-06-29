import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Números de secuencia que YA tienen migraciones duplicadas en `main`, fruto de
 * PRs paralelas mergeadas a la vez. Son inocuos (tanto `deploy/migrate.sh` como
 * el global-setup aplican por NOMBRE DE FICHERO completo, no por número) y están
 * aplicados en producción: son historia congelada y NO se renombran —renombrar
 * una migración aplicada haría que el deploy la re-ejecute y rompa prod.
 *
 * Este guard solo evita la PROLIFERACIÓN: cualquier número duplicado NUEVO fuera
 * de esta lista es un error de la PR; usa el siguiente número libre (mira el
 * directorio) en vez de reutilizar uno.
 */
const GRANDFATHERED_DUPLICATE_PREFIXES = new Set([
  '0005',
  '0023',
  '0028',
  '0029',
  '0032',
  '0034',
]);

describe('numeración de migraciones drizzle', () => {
  it('no introduce números de migración duplicados nuevos', () => {
    const dir = resolve(__dirname, '../../drizzle');
    const byPrefix = new Map<string, string[]>();
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
      const prefix = file.slice(0, 4);
      byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), file]);
    }

    const offending = [...byPrefix.entries()]
      .filter(
        ([prefix, files]) =>
          files.length > 1 && !GRANDFATHERED_DUPLICATE_PREFIXES.has(prefix),
      )
      .map(([prefix, files]) => `${prefix}: ${files.join(', ')}`);

    expect(offending).toEqual([]);
  });
});
