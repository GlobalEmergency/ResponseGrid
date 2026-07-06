import Link from 'next/link';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';
import { BotChannels } from '@/components/molecules/bot-channels';
import { GitHubIcon } from '@/components/atoms/brand-icons';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';
import { GITHUB_REPO_URL } from '@/lib/bots';
import type { Messages } from '@/i18n/messages/es';

interface GlobalFooterProps {
  tf: Messages['common']['footer'];
  tb: Messages['common']['bots'];
}

const colHeading = 'font-display text-xs font-bold uppercase tracking-wide text-white/55';
const linkClass =
  'text-sm text-white/75 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 rounded';

export function GlobalFooter({ tf, tb }: GlobalFooterProps) {
  const year = new Date().getFullYear();

  const nav = [
    { href: '/', label: tf.nav_home },
    { href: '/#emergencias', label: tf.nav_emergencies },
    { href: '/panel/organizaciones', label: tf.nav_orgs },
    { href: '/login', label: tf.nav_coordination },
  ];
  const resources = [
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
          <div className="col-span-2 lg:col-span-1">
            <BrandLogo size={26} wordmarkClassName="text-base text-white" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">{tf.tagline}</p>
            <p className="mt-4 text-sm text-white/70">
              {tf.project_of}{' '}
              <a
                href={GLOBAL_EMERGENCY.site}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white underline underline-offset-2 transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-white/60 rounded"
              >
                {tf.org}
              </a>
            </p>
          </div>

          <nav aria-label={tf.nav_heading} className="flex flex-col gap-2.5">
            <h2 className={colHeading}>{tf.nav_heading}</h2>
            {nav.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>

          <nav aria-label={tf.resources_heading} className="flex flex-col gap-2.5">
            <h2 className={colHeading}>{tf.resources_heading}</h2>
            {resources.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2.5">
            <h2 className={colHeading}>{tf.bots_heading}</h2>
            <BotChannels t={tb} variant="footer" />
          </div>

          <nav aria-label={tf.legal_heading} className="flex flex-col gap-2.5">
            <h2 className={colHeading}>{tf.legal_heading}</h2>
            <a href={GLOBAL_EMERGENCY.privacy} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {tf.privacy}
            </a>
            <a href={GLOBAL_EMERGENCY.terms} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {tf.terms}
            </a>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/60">
            {tf.copyright.replace('{year}', String(year))} · {tf.built_by}
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
              {tf.github}
            </a>
            <LanguageSwitcher tone="dark" />
          </div>
        </div>
      </div>
    </footer>
  );
}
