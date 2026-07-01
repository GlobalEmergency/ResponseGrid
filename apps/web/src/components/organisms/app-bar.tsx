import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken, authHeaders, loginHref as buildLoginHref } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';
import { AccountControl } from '@/components/molecules/account-control';
import { PublicMenu, type PublicLink } from '@/components/molecules/public-menu';
import { MobileNav } from '@/components/molecules/mobile-nav';

export const APP_BAR_H = 52;

type AppBarVariant = 'home' | 'emergency' | 'action' | 'content';

interface AppBarProps {
  variant: AppBarVariant;
  slug?: string;
  emergency?: { name: string; status: 'active' | 'paused' | 'closed' };
  backHref?: string;
}

const STATUS_DOT: Record<'active' | 'paused' | 'closed', string> = {
  active: 'bg-success-dot',
  paused: 'bg-warning-dot',
  closed: 'bg-white/50',
};

export async function AppBar({ variant, slug, emergency, backHref }: AppBarProps) {
  const { t } = await getT();
  const ta = t.appbar;
  const token = await getToken();

  let user: { name: string; email: string; isAdmin: boolean } | null = null;
  let unreadCount = 0;
  if (token != null) {
    const [meRes, notifRes] = await Promise.all([
      api.GET('/auth/me', { headers: authHeaders(token) }),
      api.GET('/notifications/mine', { headers: authHeaders(token) }),
    ]);
    if (meRes.data != null) {
      user = { name: meRes.data.name, email: meRes.data.email, isAdmin: meRes.data.isAdmin === true };
    }
    if (notifRes.data != null) unreadCount = notifRes.data.unreadCount;
  }

  const currentPath = slug != null ? `/e/${slug}` : '/';
  const loginHref = buildLoginHref(currentPath);

  const infoLinks: PublicLink[] = [
    { href: '/como-funciona', label: ta.how_it_works },
    { href: '/verificar', label: ta.verify },
  ];

  const accountLabels = {
    login: ta.login,
    account_aria: ta.account_aria,
    section_emergency: ta.section_emergency,
    my_points: ta.my_points,
    my_volunteering: ta.my_volunteering,
    my_shipments: ta.my_shipments,
    notifications: ta.notifications,
    my_panel: ta.my_panel,
    logout: ta.logout,
    admin: ta.admin,
  };

  const account = (
    <AccountControl
      user={user}
      unreadCount={unreadCount}
      loginHref={loginHref}
      t={accountLabels}
      {...(slug !== undefined && { slug })}
    />
  );

  const brand = (
    <Link
      href="/"
      aria-label="ResponseGrid"
      className="inline-flex text-white rounded focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      <BrandLogo size={22} wordmarkClassName="text-base text-white" />
    </Link>
  );

  const isEmergency = variant === 'emergency' && emergency !== undefined;

  return (
    <header className="sticky top-0 z-40 bg-navy text-white">
      {/* Rama escritorio: brand + contexto + CTAs + idioma + cuenta, todo inline. */}
      <div className="hidden items-center gap-3 px-4 lg:flex lg:px-8" style={{ height: APP_BAR_H }}>
        {brand}

        {/* contexto */}
        {isEmergency ? (
          <span className="ml-1 flex max-w-[220px] items-center gap-2 truncate border-l border-white/20 pl-3 text-[13px] text-on-navy">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[emergency.status]}`}
              aria-hidden="true"
            />
            <span className="truncate">{emergency.name}</span>
          </span>
        ) : variant !== 'action' ? (
          <PublicMenu links={infoLinks} className="ml-2" ariaLabel={ta.info_nav} />
        ) : backHref !== undefined ? (
          <Link
            href={backHref}
            className="ml-1 flex items-center gap-1 border-l border-white/20 pl-3 text-[13px] text-on-navy hover:text-white"
          >
            {ta.back}
          </Link>
        ) : null}

        <span className="flex-1" />

        {/* CTAs */}
        {isEmergency && slug !== undefined && (
          <div className="flex items-center gap-2">
            <Link
              href={`/e/${slug}/donar`}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-accent-600"
            >
              {ta.offer}
            </Link>
            <Link
              href={`/e/${slug}/peticion`}
              className="rounded-lg bg-accent-2 px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-accent-2-600"
            >
              {ta.request}
            </Link>
          </div>
        )}
        {variant === 'home' && (
          <Link
            href="#emergencias"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-accent-600"
          >
            {ta.see_emergencies}
          </Link>
        )}

        {/* idioma + cuenta */}
        <span className="flex items-center gap-2.5">
          <LanguageSwitcher tone="dark" />
          {account}
        </span>
      </div>

      {/*
        Rama móvil: NavDrawer (dentro de MobileNav) ya pinta su propia fila
        navy de ancho completo (brand a la izquierda, hamburguesa a la
        derecha, con su propio bg-navy/px-4/py-3) — por eso aquí NO se repite
        el brand ni se añade fondo/alto propio al contenedor. El único
        control que se agrega a esa fila es el CTA "Ofrecer ayuda" (si hay
        emergencia), como hermano flex a la izquierda de MobileNav para que
        la fila se lea: [CTA] [brand … hamburguesa].
      */}
      {/* Altura natural (~64px): la fija la fila propia de NavDrawer, no APP_BAR_H
          (52 es solo escritorio). El offset del mapa en móvil usa top-16 = 64px. */}
      <div className="flex items-center lg:hidden">
        {isEmergency && slug !== undefined && (
          <Link
            href={`/e/${slug}/donar`}
            className="ml-4 shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-bold text-white"
          >
            {ta.offer}
          </Link>
        )}

        {variant === 'action' && backHref !== undefined && (
          <Link
            href={backHref}
            className="ml-4 flex shrink-0 items-center gap-1 text-[13px] font-semibold text-on-navy transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {ta.back}
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <MobileNav
            brand={brand}
            account={<div className="px-3">{account}</div>}
            links={infoLinks}
            labels={{ openMenu: ta.open_menu, closeMenu: ta.close_menu, navAria: ta.menu_aria }}
            {...(isEmergency && slug !== undefined
              ? { requestCta: { href: `/e/${slug}/peticion`, label: ta.request } }
              : {})}
          />
        </div>
      </div>
    </header>
  );
}
