import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@reliefhub/api-client'],
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  // The authenticated area was consolidated under /panel/*. Personal pages and
  // platform administration have since migrated to /dashboard/* and /admin/*
  // (English). Keep old bookmarks working.
  async redirects() {
    return [
      // --- Personal: migrado a /dashboard/* (inglés) ---
      { source: '/panel', destination: '/dashboard', permanent: true },
      { source: '/panel/mi-perfil', destination: '/dashboard/profile', permanent: true },
      { source: '/panel/notificaciones', destination: '/dashboard/notifications', permanent: true },
      { source: '/panel/mis-donaciones', destination: '/dashboard/donations', permanent: true },
      { source: '/panel/mis-permisos', destination: '/dashboard/permissions', permanent: true },
      { source: '/notificaciones', destination: '/dashboard/notifications', permanent: true },
      { source: '/mis-permisos', destination: '/dashboard/permissions', permanent: true },
      // --- Administración: migrado a /admin/* (inglés). Orden: rutas específicas
      // antes que la raíz para que ninguna quede eclipsada. ---
      { source: '/panel/administracion', destination: '/admin', permanent: true },
      {
        source: '/panel/administracion/usuarios/:path*',
        destination: '/admin/users/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/organizaciones/:path*',
        destination: '/admin/organizations/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/centros/:path*',
        destination: '/admin/points/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/permisos/:path*',
        destination: '/admin/permissions/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/api-keys/:path*',
        destination: '/admin/api-keys/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/acreditaciones/:path*',
        destination: '/admin/accreditations/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/plantillas/:path*',
        destination: '/admin/templates/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/auditoria/:path*',
        destination: '/admin/audit/:path*',
        permanent: true,
      },
      {
        source: '/panel/administracion/ambito/:path*',
        destination: '/admin/scope/:path*',
        permanent: true,
      },
      { source: '/administracion', destination: '/admin', permanent: true },
      // --- Organizaciones: detalle migrado a /organizations/:id/manage (inglés) ---
      {
        source: '/panel/organizaciones/:id',
        destination: '/organizations/:id/manage',
        permanent: true,
      },
      // --- Sin migrar aún ---
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
