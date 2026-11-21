import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Informes y mapas descargables de la portada.
 *
 * Los archivos NO viven en este repositorio ni en la imagen: están en el
 * servidor, en /srv/sosgalapagos-descargas, que Caddy sirve en /descargas/ y
 * que el contenedor web monta en solo lectura para leer `indice.json`. Así
 * un informe nuevo aparece en la portada sin reconstruir la web. Se publican
 * desde el repositorio sosgalapagos-datos (`servidores/publicar.sh descargas`).
 *
 * Si la carpeta o el índice no existen, la portada no muestra la sección.
 */
export interface Informe {
  archivo: string;
  portada?: string;
  titulo: string;
  resumen: string;
  fecha: string;
  paginas?: number;
  formato?: string;
  tamano?: string;
}

const DIR = process.env.INFORMES_DIR ?? '/srv/descargas';
/** Solo nombres simples: nada de rutas ni de extensiones que Caddy no sirve. */
const ARCHIVO = /^[A-Za-z0-9][A-Za-z0-9_.-]*\.pdf$/;
const PORTADA = /^[A-Za-z0-9][A-Za-z0-9_.-]*\.(jpg|png)$/;
const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validarInformes(dato: unknown): Informe[] {
  const lista = (dato as { informes?: unknown } | null)?.informes;
  if (!Array.isArray(lista)) return [];
  const out: Informe[] = [];
  for (const x of lista as Record<string, unknown>[]) {
    const archivo = texto(x?.archivo, 120);
    const titulo = texto(x?.titulo, 140);
    const fecha = texto(x?.fecha, 10);
    if (!ARCHIVO.test(archivo) || !titulo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    const portada = texto(x?.portada, 120);
    out.push({
      archivo,
      titulo,
      fecha,
      resumen: texto(x?.resumen, 400),
      ...(PORTADA.test(portada) ? { portada } : {}),
      ...(typeof x.paginas === 'number' && x.paginas > 0 ? { paginas: Math.round(x.paginas) } : {}),
      ...(texto(x?.formato, 30) ? { formato: texto(x?.formato, 30) } : {}),
      ...(texto(x?.tamano, 20) ? { tamano: texto(x?.tamano, 20) } : {}),
    });
  }
  // Los más recientes, primero (a igual fecha se respeta el orden del índice).
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
}

export async function leerInformes(): Promise<Informe[]> {
  try {
    return validarInformes(JSON.parse(await readFile(path.join(DIR, 'indice.json'), 'utf8')));
  } catch {
    return [];
  }
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «2026-11-21» → «21 de noviembre de 2026». */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1] ?? ''} de ${a}`;
}
