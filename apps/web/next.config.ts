import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@reliefhub/api-client'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // The authenticated area was consolidated under /panel/*. Personal pages have
  // since migrated to /dashboard/* (English). Keep old bookmarks working. Order
  // matters: specific rules before the /admin/* catch-all so it isn't shadowed.
  async redirects() {
    return [
      // --- Personal: migrado a /dashboard/* (inglés) ---
      { source: '/panel/mi-perfil', destination: '/dashboard/profile', permanent: true },
      { source: '/panel/notificaciones', destination: '/dashboard/notifications', permanent: true },
      { source: '/panel/mis-donaciones', destination: '/dashboard/donations', permanent: true },
      { source: '/panel/mis-permisos', destination: '/dashboard/permissions', permanent: true },
      { source: '/notificaciones', destination: '/dashboard/notifications', permanent: true },
      { source: '/mis-permisos', destination: '/dashboard/permissions', permanent: true },
      // --- Sin migrar aún (los invierten C2/C3). Orden: específicas antes que catch-all ---
      {
        source: '/admin/templates/:path*',
        destination: '/panel/administracion/plantillas/:path*',
        permanent: true,
      },
      { source: '/admin/:path*', destination: '/panel/administracion/:path*', permanent: true },
      { source: '/administracion/:path*', destination: '/panel/administracion/:path*', permanent: true },
      { source: '/grupos/:path*', destination: '/panel/grupos/:path*', permanent: true },
      {
        source: '/organizaciones/:path*',
        destination: '/panel/organizaciones/:path*',
        permanent: true,
      },
      // --- Coordinación de emergencia: migrado a /emergencies/:slug/manage/* ---
      { source: '/e/:slug/coordinacion', destination: '/emergencies/:slug/manage', permanent: true },
      {
        source: '/e/:slug/coordinacion/recursos',
        destination: '/emergencies/:slug/manage/resources',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/puntos-en-duda',
        destination: '/emergencies/:slug/manage/resources/disputes',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/peticiones',
        destination: '/emergencies/:slug/manage/needs',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/ofertas',
        destination: '/emergencies/:slug/manage/offers',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/expediciones',
        destination: '/emergencies/:slug/manage/logistics',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/voluntarios',
        destination: '/emergencies/:slug/manage/volunteers',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/reportes',
        destination: '/emergencies/:slug/manage/reports',
        permanent: true,
      },
      {
        source: '/e/:slug/coordinacion/actividad',
        destination: '/emergencies/:slug/manage/activity',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
