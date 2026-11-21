import { MARCA } from '@/lib/marca';
import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { plataformaActiva } from '@/lib/plataforma';

// Emergencies come and go; keep the sitemap in sync with live backend state.
export const dynamic = 'force-dynamic';

const BASE = MARCA.sitio;

/**
 * Dynamic sitemap: static info pages + one entry per emergency (`/e/{slug}`).
 * Without this, search engines have no systematic way to discover the
 * per-emergency landing pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Plataforma apagada: solo lo que sigue publicado.
  if (!plataformaActiva()) {
    return [
      { url: `${BASE}/`, changeFrequency: 'hourly', priority: 1 },
      { url: `${BASE}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
      { url: `${BASE}/eliminar-datos`, changeFrequency: 'yearly', priority: 0.3 },
    ];
  }
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE}/funcionalidades`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/sobre`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/como-funciona`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/transparencia`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/eliminar-datos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/verificar`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/docs`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const { data: emergencies } = await api.GET('/emergencies');
  const emergencyRoutes: MetadataRoute.Sitemap = (emergencies ?? []).map((e) => ({
    url: `${BASE}/e/${e.slug}`,
    lastModified: e.updatedAt,
    changeFrequency: e.status === 'active' ? 'hourly' : 'weekly',
    priority: e.status === 'active' ? 0.9 : 0.4,
  }));

  return [...staticRoutes, ...emergencyRoutes];
}
