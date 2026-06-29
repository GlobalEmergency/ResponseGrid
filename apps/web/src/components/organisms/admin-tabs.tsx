'use client';

import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { SectionTabs, type SectionTab } from '@/components/organisms/section-tabs';

interface AdminTabsProps {
  isPlatformAdmin: boolean;
}

export function AdminTabs({ isPlatformAdmin }: AdminTabsProps) {
  const tn = getMessages(useLocale()).nav;

  // Scope-only admins reach just the hub — no global tools to tab between.
  if (!isPlatformAdmin) return null;

  const base = '/panel/administracion';
  const tabs: SectionTab[] = [
    { href: base, label: tn.admin_overview, exact: true },
    { href: `${base}/usuarios`, label: tn.admin_users },
    { href: `${base}/organizaciones`, label: tn.admin_orgs },
    { href: `${base}/centros`, label: tn.admin_centros },
    { href: `${base}/permisos`, label: tn.admin_permissions },
    { href: `${base}/api-keys`, label: tn.admin_api_keys },
    { href: `${base}/acreditaciones`, label: tn.admin_accreditations },
    { href: `${base}/plantillas`, label: tn.admin_templates },
    { href: `${base}/auditoria`, label: tn.admin_audit },
  ];

  return <SectionTabs tabs={tabs} ariaLabel={tn.admin_tabs_aria} />;
}
