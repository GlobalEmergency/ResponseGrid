import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';
import { BotChannels } from '@/components/molecules/bot-channels';
import { AID_BOTS_ENABLED } from '@/lib/bots';
import { GitHubIcon } from '@/components/atoms/brand-icons';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';
import { LEGAL } from '@/lib/legal';
import { GITHUB_REPO_URL } from '@/lib/bots';
import { MARCA } from '@/lib/marca';
import { plataformaActiva } from '@/lib/plataforma';
import type { Messages } from '@/i18n/messages/es';

interface GlobalFooterProps {
  tf: Messages['common']['footer'];
  tb: Messages['common']['bots'];
}

const colHeading = 'font-display text-xs font-bold uppercase tracking-wide text-white/55';
const inlineLink =
  'font-semibold text-white/85 underline underline-offset-2 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 rounded';
const linkClass =
  'text-sm text-white/75 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 rounded';

export function GlobalFooter({ tf, tb }: GlobalFooterProps) {
  const year = new Date().getFullYear();

  // Con la plataforma apagada solo quedan los enlaces que siguen publicados.
  const activa = plataformaActiva();
  const nav = activa
    ? [
        { href: '/', label: tf.nav_home },
        { href: '/#emergencias', label: tf.nav_emergencies },
        { href: '/panel/organizaciones', label: tf.nav_orgs },
        { href: '/login', label: tf.nav_coordination },
      ]
    : [
        { href: '/', label: tf.nav_home },
        { href: '/mapas/', label: 'Mapas de riesgo' },
        { href: '/clima/', label: 'Clima en vivo' },
      ];
  const resources = !activa ? [] : [
    { href: '/funcionalidades', label: tf.resources_features },
    { href: '/sobre', label: tf.resources_about },
    { href: '/como-funciona', label: tf.resources_how },
    { href: '/transparencia', label: tf.resources_transparency },
    { href: '/verificar', label: tf.resources_verify },
    { href: '/docs', label: tf.resources_developers },
  ];

  return (
    <footer aria-label={tf.aria_label} className="mt-auto bg-navy text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="col-span-2">
            <BrandLogo usfq size={24} wordmarkClassName="text-base text-white" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">{tf.cobrand_tagline}</p>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/60">
              {tf.based_on}{' '}
              <a href="https://responsegrid.app" target="_blank" rel="noopener noreferrer" className={inlineLink}>
                {MARCA.plataforma}
              </a>
              {tf.free_software_of}{' '}
              <a href={GLOBAL_EMERGENCY.site} target="_blank" rel="noopener noreferrer" className={inlineLink}>
                {tf.org}
              </a>{' '}
              (
              <a href={MARCA.licenciaUrl} target="_blank" rel="noopener noreferrer" className={inlineLink}>
                {MARCA.licencia}
              </a>
              ).
            </p>
          </div>

          <nav aria-label={tf.nav_heading} className="flex flex-col gap-2.5">
            <h2 className={colHeading}>{tf.nav_heading}</h2>
            {nav.map((l) =>
              // /mapas/ y /clima/ los sirve Caddy fuera de la app: <a>, no <Link>.
              /^\/(mapas|clima)\//.test(l.href) ? (
                <a key={l.href} href={l.href} className={linkClass}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              ),
            )}
          </nav>

          <nav aria-label={tf.resources_heading} className={resources.length > 0 ? 'flex flex-col gap-2.5' : 'hidden'}>
            <h2 className={colHeading}>{tf.resources_heading}</h2>
            {resources.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>

          {AID_BOTS_ENABLED && (
            <div className="flex flex-col gap-2.5">
              <h2 className={colHeading}>{tf.bots_heading}</h2>
              <BotChannels t={tb} variant="footer" />
            </div>
          )}

          <nav aria-label={tf.legal_heading} className="flex flex-col gap-2.5">
            <h2 className={colHeading}>{tf.legal_heading}</h2>
            <a href={LEGAL.privacidad} className={linkClass}>
              {tf.privacy}
            </a>
            <a href={LEGAL.eliminarDatos} className={linkClass}>
              Eliminar tus datos
            </a>
            <a href={GLOBAL_EMERGENCY.terms} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {tf.terms}
            </a>
          </nav>
        </div>

        {/* Cierre de pie WE WANT MORE: «MORE HUMANS,» + bloque rojo «MORE DRAGONS.» + logo */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-8">
          <p
            lang="en"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 font-display text-2xl font-black uppercase leading-none tracking-[-0.01em]"
          >
            <span className="text-white">MORE HUMANS,</span>
            <span className="bg-accent px-2 py-1 text-black">MORE DRAGONS.</span>
          </p>
          <Image
            src={MARCA.logoOscuro}
            alt={`${MARCA.usfq} — Galápagos`}
            width={166}
            height={36}
            unoptimized
            style={{ height: 36, width: 'auto' }}
          />
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-white/60">
            {tf.copyright_usfq.replace('{year}', String(year))} · {tf.developed_by}{' '}
            <a
              href={MARCA.desarrolloSitio}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-2 transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-white/60 rounded"
            >
              {MARCA.desarrollo} · iahumana.org
            </a>
          </p>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={tf.github_aria}
              className="flex items-center gap-2 text-xs text-white/70 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 rounded"
            >
              <GitHubIcon className="h-4 w-4" />
              {tf.source_code}
            </a>
            <LanguageSwitcher tone="dark" />
          </div>
        </div>
      </div>
    </footer>
  );
}
