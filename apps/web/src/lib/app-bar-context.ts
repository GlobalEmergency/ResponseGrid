export interface AccountLink {
  href: string;
  labelKey: 'my_points' | 'my_volunteering' | 'my_shipments';
}

export function emergencyAccountLinks(slug: string | undefined): AccountLink[] {
  if (slug === undefined) return [];
  return [
    { href: `/e/${slug}/mis-puntos`, labelKey: 'my_points' },
    { href: `/e/${slug}/mi-voluntariado`, labelKey: 'my_volunteering' },
    { href: `/e/${slug}/mis-expediciones`, labelKey: 'my_shipments' },
  ];
}

/**
 * Resolves the exact path AppBar's login link should send the user back to
 * (built into `?next=` via `loginHref`). Pages on an emergency subpage (e.g.
 * `/e/:slug/registrar`) must pass their own `currentPath` explicitly; without
 * it, this falls back to the emergency root (`/e/:slug`) or the site root
 * (`/`) — imprecise but not wrong, so it stays a safe default for callers that
 * don't (yet) pass one.
 *
 * Fixes #278: clicking "Iniciar sesión" from a sub-página used to always land
 * back on the emergency home instead of the exact page the user was on.
 */
export function resolveAppBarCurrentPath(slug: string | undefined, currentPath: string | undefined): string {
  if (currentPath !== undefined) return currentPath;
  return slug !== undefined ? `/e/${slug}` : '/';
}
