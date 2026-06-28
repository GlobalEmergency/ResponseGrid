'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';
import { Badge } from '@/components/atoms/badge';
import { EmptyState } from '@/components/molecules/empty-state';
import type { OrganizationListItem } from './actions';
import {
  orgTypeLabel,
  accreditationLabel,
  accreditationBadgeVariant,
} from './org-presentation';

type AdminMessages = Messages['admin'];

interface OrganizationsListProps {
  organizations: OrganizationListItem[];
  ta: AdminMessages;
}

export function OrganizationsList({
  organizations,
  ta,
}: OrganizationsListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => {
      const haystack = [o.name, o.taxId ?? '', o.contactEmail ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [organizations, query]);

  if (organizations.length === 0) {
    return (
      <EmptyState
        title={ta.orgs_empty_title}
        description={ta.orgs_empty_description}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="org-search"
          className="text-sm font-semibold text-gray-700"
        >
          {ta.orgs_search_label}
        </label>
        <input
          id="org-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ta.orgs_search_ph}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <h2 className="text-base font-bold text-gray-900">
        {ta.orgs_list_heading.replace('{count}', String(filtered.length))}
      </h2>

      {filtered.length === 0 ? (
        <EmptyState
          title={ta.orgs_no_results_title}
          description={ta.orgs_no_results_description}
        />
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {filtered.map((org) => (
            <li key={org.id}>
              <Link
                href={`/admin/organizaciones/${org.id}`}
                aria-label={org.name}
                className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {org.name} →
                  </span>
                  <Badge variant={accreditationBadgeVariant(org.accreditationStatus)}>
                    {accreditationLabel(org.accreditationStatus, ta)}
                  </Badge>
                </div>
                <dl className="flex flex-col gap-0.5 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-gray-500">
                      {ta.orgs_type_label}
                    </dt>
                    <dd>{orgTypeLabel(org.type, ta)}</dd>
                  </div>
                  {org.taxId && (
                    <div className="flex flex-wrap gap-x-1.5">
                      <dt className="font-semibold text-gray-500">
                        {ta.orgs_taxid_label}
                      </dt>
                      <dd className="break-all">{org.taxId}</dd>
                    </div>
                  )}
                  {org.contactEmail && (
                    <div className="flex flex-wrap gap-x-1.5">
                      <dt className="font-semibold text-gray-500">
                        {ta.orgs_contact_label}
                      </dt>
                      <dd className="break-all">{org.contactEmail}</dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-gray-500">
                      {ta.orgs_members_label}
                    </dt>
                    <dd>{org.memberCount}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
