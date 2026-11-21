/**
 * Interruptor de la plataforma de coordinación (ResponseGrid) en SOS Galápagos.
 *
 * Con `PLATAFORMA_ACTIVA=false` el sitio publica solo la portada (/), las
 * páginas legales y los archivos estáticos. El resto de rutas de la app (mapa
 * de la emergencia, formularios, inicio de sesión, paneles) redirige a la
 * portada. /riesgos/, /mapas/ y /clima/ no pasan por la app: los sirve Caddy.
 *
 * Se lee en tiempo de ejecución (variable del contenedor web), así que
 * volver a activar la plataforma no exige reconstruir la imagen.
 * Sin la variable, la plataforma está activa.
 */
export function plataformaActiva(): boolean {
  return process.env.PLATAFORMA_ACTIVA !== 'false';
}

/** Páginas de la app que siguen publicadas con la plataforma apagada. */
const PAGINAS_ABIERTAS = new Set(['/', '/privacidad', '/eliminar-datos', '/offline', '/apple-icon']);

/** Carpetas de recursos estáticos (build de Next y `public/`). */
const PREFIJOS_ESTATICOS = ['/_next/', '/capas/', '/marca/', '/videos/', '/icons/', '/avisos/'];

/** Archivos sueltos en la raíz: robots.txt, sitemap.xml, sw.js, icon.svg… */
const ARCHIVO_RAIZ = /^\/[^/]+\.[a-z0-9]+$/i;

/** ¿Se sirve esta ruta con la plataforma apagada? */
export function rutaAbiertaSinPlataforma(pathname: string): boolean {
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PAGINAS_ABIERTAS.has(ruta)) return true;
  if (PREFIJOS_ESTATICOS.some((p) => pathname.startsWith(p))) return true;
  return ARCHIVO_RAIZ.test(ruta);
}

/** Áreas que exigen sesión (redirección temprana a /login; ver proxy.ts). */
const AREAS_PROTEGIDAS = [/^\/dashboard(\/|$)/, /^\/admin(\/|$)/, /^\/organizations(\/|$)/, /^\/panel(\/|$)/, /^\/emergencies\/[^/]+\/manage(\/|$)/];

export function rutaProtegida(pathname: string): boolean {
  return AREAS_PROTEGIDAS.some((r) => r.test(pathname));
}
