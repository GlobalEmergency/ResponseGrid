'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';
import { Badge } from '@/components/atoms/badge';
import { EmptyState } from '@/components/molecules/empty-state';
import type { ResourceAdminListItem } from './actions';
import {
  resourceTypeLabel,
  statusLabel,
  statusPillClasses,
  verificationLabel,
  verificationBadgeVariant,
  RESOURCE_TYPES,
  PUBLIC_STATUSES,
} from './centro-presentation';

type AdminMessages = Messages['admin'];

interface CentrosListProps {
  resources: ResourceAdminListItem[];
  ta: AdminMessages;
}

const SELECT_CLASSES =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy';

export function CentrosList({ resources, ta }: CentrosListProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [emergency, setEmergency] = useState('');

  // Emergency options derived from the data (id → name), sorted by name.
  const emergencies = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of resources) {
      if (!byId.has(r.emergencyId)) {
        byId.set(
          r.emergencyId,
          r.emergencyName ?? ta.centros_emergency_unknown,
        );
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resources, ta]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (type && r.type !== type) return false;
      if (status && r.publicStatus !== status) return false;
      if (emergency && r.emergencyId !== emergency) return false;
      if (!q) return true;
      const haystack = [
        r.name,
        r.location?.address ?? '',
        r.city ?? '',
        r.emergencyName ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [resources, query, type, status, emergency]);

  if (resources.length === 0) {
    return (
      <EmptyState
        title={ta.centros_empty_title}
        description={ta.centros_empty_description}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="centro-search"
          className="text-sm font-semibold text-ink-soft"
        >
          {ta.centros_search_label}
        </label>
        <input
          id="centro-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ta.centros_search_ph}
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink placeholder:text-muted-soft focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </div>

      {/* ── Filters (mobile-first: stack, then 3-up) ────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="centro-type"
            className="text-sm font-semibold text-ink-soft"
          >
            {ta.centros_filter_type_label}
          </label>
          <select
            id="centro-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={SELECT_CLASSES}
          >
            <option value="">{ta.centros_filter_all}</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {resourceTypeLabel(t, ta)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="centro-status"
            className="text-sm font-semibold text-ink-soft"
          >
            {ta.centros_filter_status_label}
          </label>
          <select
            id="centro-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={SELECT_CLASSES}
          >
            <option value="">{ta.centros_filter_all}</option>
            {PUBLIC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, ta)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="centro-emergency"
            className="text-sm font-semibold text-ink-soft"
          >
            {ta.centros_filter_emergency_label}
          </label>
          <select
            id="centro-emergency"
            value={emergency}
            onChange={(e) => setEmergency(e.target.value)}
            className={SELECT_CLASSES}
          >
            <option value="">{ta.centros_filter_all_f}</option>
            {emergencies.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h2 className="text-base font-bold text-ink">
        {ta.centros_list_heading.replace('{count}', String(filtered.length))}
      </h2>

      {filtered.length === 0 ? (
        <EmptyState
          title={ta.centros_no_results_title}
          description={ta.centros_no_results_description}
        />
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/panel/administracion/centros/${r.id}`}
                aria-label={r.name}
                className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4 transition-colors hover:bg-surface"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="min-w-0 break-words text-base font-bold text-ink">
                    {r.name} →
                  </span>
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClasses(
                        r.publicStatus,
                      )}`}
                    >
                      {statusLabel(r.publicStatus, ta)}
                    </span>
                    <Badge variant={verificationBadgeVariant(r.verificationLevel)}>
                      {verificationLabel(r.verificationLevel, ta)}
                    </Badge>
                  </div>
                </div>
                <dl className="flex flex-col gap-0.5 text-sm text-muted">
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-ink-soft">
                      {ta.centros_filter_type_label}:
                    </dt>
                    <dd>{resourceTypeLabel(r.type, ta)}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-ink-soft">
                      {ta.centros_emergency_label}
                    </dt>
                    <dd className="break-words">
                      {r.emergencyName ?? ta.centros_emergency_unknown}
                    </dd>
                  </div>
                  {r.location?.address && (
                    <div className="flex flex-wrap gap-x-1.5">
                      <dt className="font-semibold text-ink-soft">
                        {ta.centros_address_label}
                      </dt>
                      <dd className="break-words">{r.location.address}</dd>
                    </div>
                  )}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
