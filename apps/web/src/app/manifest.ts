import type { MetadataRoute } from 'next';

/**
 * Manifiesto de la app instalable. Portada, mapa de riesgos y clima son UNA sola app:
 * este manifiesto repite el que sirve el mapa de riesgos (/riesgos/app.webmanifest, repo
 * sosgalapagos-plataforma). Si cambia uno, cambia el otro. El `id` es el mismo en los dos
 * para que el teléfono no los tome por dos apps distintas.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/riesgos/',
    name: 'SOS Galápagos',
    short_name: 'SOS Galápagos',
    description:
      'Mapa de riesgos, clima en vivo y avisos de la emergencia en Galápagos. Información preliminar, no oficial.',
    lang: 'es',
    start_url: '/riesgos/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/riesgos/estaticos/app/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/riesgos/estaticos/app/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/riesgos/estaticos/app/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Reportar', url: '/riesgos/reportar/' },
      { name: 'Clima en vivo', url: '/clima/' },
      { name: 'Ver como lista', url: '/riesgos/informe/' },
    ],
  };
}
