import type { MetadataRoute } from 'next';

/**
 * Origin robots policy: allow indexing, expose the sitemap, keep private
 * surfaces out of the index.
 *
 * NOTE: responsegrid.app is fronted by Cloudflare, whose "Managed robots.txt"
 * may serve its own file at the edge and shadow this one. The AI-citation
 * crawlers (OAI-SearchBot, PerplexityBot, Googlebot for AI Overviews) must be
 * allowed there too — see the GEO audit. This file is the correct origin
 * default and takes over if the managed robots.txt is disabled.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/panel/', '/auth/', '/login', '/signup', '/api/'],
    },
    sitemap: 'https://responsegrid.app/sitemap.xml',
    host: 'https://responsegrid.app',
  };
}
