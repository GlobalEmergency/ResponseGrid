'use client';

/**
 * AccountMenu — user chip + language switch + logout, pinned to the bottom of
 * the app shell. Rendered on the navy sidebar (and inside the mobile drawer).
 * Receives the principal as plain props; labels are pre-resolved by the shell.
 */
import { logoutAction } from '@/app/actions';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';

interface AccountMenuProps {
  name: string;
  email: string;
  isAdmin: boolean;
  adminLabel: string;
  logoutLabel: string;
}

export function AccountMenu({
  name,
  email,
  isAdmin,
  adminLabel,
  logoutLabel,
}: AccountMenuProps) {
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-3 border-t border-white/15 px-3 pt-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-white">{name}</span>
          <span className="truncate text-xs text-on-navy-soft">{email}</span>
        </span>
        {isAdmin ? (
          <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {adminLabel}
          </span>
        ) : null}
      </div>

      <LanguageSwitcher tone="dark" />

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-on-navy transition-colors hover:bg-white/10 hover:text-white"
        >
          {logoutLabel}
        </button>
      </form>
    </div>
  );
}
