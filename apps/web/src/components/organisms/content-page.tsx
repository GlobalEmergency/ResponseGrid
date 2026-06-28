/**
 * ContentPage — shared chrome for the static content/marketing pages
 * (/sobre, /como-funciona, /transparencia, /verificar). Renders the branded
 * header band, a hero (overline + H1 + lead + illustration) and a closing CTA.
 * The global footer comes from the root layout. Server component.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeaderBand } from '@/components/organisms/site-header-band';

interface Cta {
  href: string;
  label: string;
  heading: string;
  body: string;
  external?: boolean;
}

interface ContentPageProps {
  overline: string;
  h1: string;
  lead: string;
  illustration: ReactNode;
  children: ReactNode;
  cta: Cta;
}

export function ContentPage({ overline, h1, lead, illustration, children, cta }: ContentPageProps) {
  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md bg-surface lg:max-w-5xl">
        <SiteHeaderBand />

        <article className="px-5 pb-16 pt-8 lg:px-8 lg:pt-10">
          {/* Hero */}
          <header className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-accent">{overline}</p>
              <h1 className="mt-2 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-navy lg:text-[40px] lg:leading-[1.05]">
                {h1}
              </h1>
              <p className="mt-4 text-[15px] leading-[1.6] text-ink-soft lg:text-base">{lead}</p>
            </div>
            <div aria-hidden="true">{illustration}</div>
          </header>

          {/* Sections */}
          <div className="mt-12 flex flex-col gap-10 lg:mt-16">{children}</div>

          {/* CTA */}
          <section className="mt-12 rounded-card border border-line bg-surface-alt px-6 py-8 text-center lg:mt-16">
            <h2 className="font-display text-xl font-bold text-navy">{cta.heading}</h2>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-[1.55] text-muted">{cta.body}</p>
            {cta.external ? (
              <a
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded-xl bg-navy px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                {cta.label}
              </a>
            ) : (
              <Link
                href={cta.href}
                className="mt-5 inline-block rounded-xl bg-navy px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                {cta.label}
              </Link>
            )}
          </section>
        </article>
      </div>
    </main>
  );
}

interface ContentSectionProps {
  heading: string;
  children: ReactNode;
}

/** A titled prose block. */
export function ContentSection({ heading, children }: ContentSectionProps) {
  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-navy lg:text-2xl">{heading}</h2>
      <div className="mt-2.5 text-[15px] leading-[1.65] text-ink-soft">{children}</div>
    </section>
  );
}
