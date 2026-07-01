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
