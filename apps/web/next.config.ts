import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@reliefhub/api-client'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // The authenticated area was consolidated under /panel/*. Keep old bookmarks
  // working. Order matters: templates → plantillas must precede the /admin/*
  // catch-all so it is not shadowed by it.
  async redirects() {
    return [
      {
        source: '/admin/templates/:path*',
        destination: '/panel/administracion/plantillas/:path*',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: '/panel/administracion/:path*',
        permanent: true,
      },
      {
        source: '/administracion/:path*',
        destination: '/panel/administracion/:path*',
        permanent: true,
      },
      { source: '/mis-permisos', destination: '/panel/mis-permisos', permanent: true },
      { source: '/grupos/:path*', destination: '/panel/grupos/:path*', permanent: true },
      {
        source: '/organizaciones/:path*',
        destination: '/panel/organizaciones/:path*',
        permanent: true,
      },
      { source: '/notificaciones', destination: '/panel/notificaciones', permanent: true },
    ];
  },
};

export default nextConfig;
