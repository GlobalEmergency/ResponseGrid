'use client';

// Labels arrive pre-resolved (the server shell resolves i18n + dynamic names),
// so this atom only needs the current path.
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ResolvedNavItem {
  key: string;
  href: string;
  label: string;
  badgeCount?: number;
  exact?: boolean;
  children?: ResolvedNavItem[];
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * True when `pathname` falls anywhere inside this node's subtree — the node
 * itself (prefix match) or any descendant. Used to decide whether a collapsible
 * branch starts expanded (the branch that contains the current route does).
 */
function subtreeContainsPath(item: ResolvedNavItem, pathname: string): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return item.children?.some((child) => subtreeContainsPath(child, pathname)) ?? false;
}

/** Left padding per nesting level — indentation only, no colored side-stripe. */
const INDENT_BY_LEVEL = ['pl-3', 'pl-6', 'pl-9', 'pl-12'] as const;

function indentClass(level: number): string {
  return INDENT_BY_LEVEL[Math.min(level, INDENT_BY_LEVEL.length - 1)];
}

interface NavItemProps {
  item: ResolvedNavItem;
  /** Called after navigation (used by the mobile drawer to close itself). */
  onNavigate?: () => void;
  /** Nesting depth, used to compute indentation for `children`. Root items are level 0. */
  level?: number;
  /** aria-label for the expand/collapse toggle button (pre-resolved i18n). */
  toggleLabel?: string;
}

export function NavItem({ item, onNavigate, level = 0, toggleLabel }: NavItemProps) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href, item.exact);
  const hasChildren = item.children != null && item.children.length > 0;
  // Default collapsed, EXCEPT the branch that contains the current route: a
  // node whose subtree holds the active path starts expanded so the user lands
  // with their section open. The toggle then lets them expand/collapse freely.
  const [expanded, setExpanded] = useState(() =>
    hasChildren ? subtreeContainsPath(item, pathname) : false,
  );
  const childrenId = `nav-children-${item.key}`;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={!hasChildren && pathname === item.href ? 'page' : undefined}
          className={[
            'flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-3 text-sm font-medium transition-colors',
            indentClass(level),
            active
              ? 'bg-white/15 text-white'
              : 'text-on-navy hover:bg-white/10 hover:text-white',
          ].join(' ')}
        >
          <span className="truncate">{item.label}</span>
          {item.badgeCount != null && item.badgeCount > 0 ? (
            <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
              {item.badgeCount > 99 ? '99+' : item.badgeCount}
            </span>
          ) : null}
        </Link>
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={childrenId}
            aria-label={toggleLabel}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="ml-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-navy transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className={[
                'h-4 w-4 transition-transform',
                expanded ? 'rotate-90' : '',
              ].join(' ')}
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <div id={childrenId} className="flex flex-col gap-0.5">
          {item.children?.map((child) => (
            <NavItem
              key={child.key}
              item={child}
              onNavigate={onNavigate}
              level={level + 1}
              toggleLabel={toggleLabel}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
