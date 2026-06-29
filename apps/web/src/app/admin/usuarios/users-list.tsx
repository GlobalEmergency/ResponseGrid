'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Messages } from '@/i18n/messages/es';
import { Badge } from '@/components/atoms/badge';
import { LocalDate } from '@/components/atoms/local-date';
import { EmptyState } from '@/components/molecules/empty-state';
import type { UserListItem } from './actions';

type AdminMessages = Messages['admin'];

interface UsersListProps {
  users: UserListItem[];
  ta: AdminMessages;
}

export function UsersList({ users, ta }: UsersListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email].join(' ').toLowerCase().includes(q),
    );
  }, [users, query]);

  if (users.length === 0) {
    return (
      <EmptyState
        title={ta.users_empty_title}
        description={ta.users_empty_description}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="user-search"
          className="text-sm font-semibold text-gray-700"
        >
          {ta.users_search_label}
        </label>
        <input
          id="user-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ta.users_search_ph}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <h2 className="text-base font-bold text-gray-900">
        {ta.users_list_heading.replace('{count}', String(filtered.length))}
      </h2>

      {filtered.length === 0 ? (
        <EmptyState
          title={ta.users_no_results_title}
          description={ta.users_no_results_description}
        />
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {filtered.map((user) => (
            <li key={user.id}>
              <Link
                href={`/admin/usuarios/${user.id}`}
                aria-label={user.name || user.email}
                className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="min-w-0 break-words text-base font-bold text-gray-900">
                    {user.name || user.email} →
                  </span>
                  {user.isAdmin && (
                    <Badge variant="verification-official">
                      {ta.users_admin_badge}
                    </Badge>
                  )}
                </div>
                <dl className="flex flex-col gap-0.5 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-gray-500">
                      {ta.users_email_label}
                    </dt>
                    <dd className="break-all">{user.email}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-gray-500">
                      {ta.users_created_label}
                    </dt>
                    <dd>
                      <LocalDate iso={user.createdAt} />
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-gray-500">
                      {ta.users_last_login_label}
                    </dt>
                    <dd>
                      {user.lastLoginAt ? (
                        <LocalDate iso={user.lastLoginAt} withTime />
                      ) : (
                        ta.users_never
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-gray-500">
                      {ta.users_roles_label}
                    </dt>
                    <dd className="break-words">
                      {user.roles.length > 0
                        ? user.roles.join(', ')
                        : ta.users_no_roles}
                    </dd>
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
