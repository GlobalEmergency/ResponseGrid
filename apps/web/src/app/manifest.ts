import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ResponseGrid',
    short_name: 'ResponseGrid',
    description: 'Coordinación de ayuda en emergencias — un proyecto de Global Emergency',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfaf8',
    theme_color: '#112b4a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
