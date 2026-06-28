import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeaderBand } from '@/components/organisms/site-header-band';
import { CoordinationIllustration } from '@/components/atoms/illustrations';
import { getT } from '@/i18n/server';
import { CodeBlock } from './code-block';

/**
 * /docs — public developer documentation for the ResponseGrid API.
 *
 * Audience: third-party projects that want to CONSUME our verified data
 * (logistics points + validated needs) and build on top of it — the "source of
 * truth" use case. Read endpoints are the centrepiece; contributing data (the
 * authenticated writes) is a secondary section.
 *
 * Server Component. Prose/labels come from the i18n dictionary (t.docs); code
 * samples are language-neutral constants built against the deployment's API
 * base URL.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.responsegrid.app';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const d = t.docs;
  return {
    title: d.meta_title,
    description: d.meta_description,
    alternates: { canonical: '/docs' },
    openGraph: {
      title: d.meta_title,
      description: d.meta_description,
      url: '/docs',
      siteName: 'ResponseGrid',
      type: 'website',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ResponseGrid' }],
    },
  };
}

// ── Small presentational helpers (server components) ─────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-xl font-bold text-navy lg:text-2xl">{title}</h2>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-[1.65] text-ink-soft">{children}</p>;
}

function Endpoint({ method, path, auth }: { method: 'GET' | 'POST'; path: string; auth?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-card border border-line bg-surface-alt px-3.5 py-2.5">
      <span
        className={`rounded-md px-2 py-0.5 font-mono text-[12px] font-bold text-white ${
          method === 'GET' ? 'bg-success' : 'bg-accent'
        }`}
      >
        {method}
      </span>
      <code className="break-all font-mono text-[13px] text-ink">{path}</code>
      {auth ? (
        <span className="ml-auto rounded-md bg-navy/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy">
          Authorization: Bearer
        </span>
      ) : null}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="bg-surface-alt">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3.5 py-2.5 font-display text-[11px] font-bold uppercase tracking-wide text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-line align-top">
              {cells.map((c, j) => (
                <td key={j} className="px-3.5 py-2.5 text-ink-soft">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[12.5px] text-ink">{children}</code>;
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <code
          key={it}
          className="rounded-md border border-line bg-surface-alt px-2 py-1 font-mono text-[12.5px] text-ink"
        >
          {it}
        </code>
      ))}
    </div>
  );
}

function Callout({ children, tone = 'note' }: { children: ReactNode; tone?: 'note' | 'warn' }) {
  const tones = {
    note: 'border-line bg-surface-alt',
    warn: 'border-warning/30 bg-warning-soft',
  } as const;
  return (
    <div className={`rounded-card border px-4 py-3 text-[14px] leading-[1.6] text-ink-soft ${tones[tone]}`}>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface-alt p-5">
      <h3 className="font-display text-base font-bold text-navy">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-soft">{children}</p>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 font-display text-base font-bold text-navy">{children}</h3>;
}

export default async function DocsPage() {
  const { t } = await getT();
  const d = t.docs;

  const toc: [string, string][] = [
    ['intro', d.nav_intro],
    ['concepts', d.nav_concepts],
    ['auth', d.nav_auth],
    ['quickstart', d.nav_quickstart],
    ['emergencies', d.nav_emergencies],
    ['resources', d.nav_resources],
    ['needs', d.nav_needs],
    ['enums', d.nav_enums],
    ['write', d.nav_write],
    ['practices', d.nav_practices],
    ['license', d.nav_license],
    ['links', d.nav_links],
  ];

  // ── Language-neutral code samples (built against this deployment) ───────────
  const curlQuickstart = `curl ${API_BASE}/emergencies

curl "${API_BASE}/emergencies/{emergencyId}/public/resources?limit=100"`;

  const jsQuickstart = `const base = "${API_BASE}";

// 1) pick an emergency
const list = await fetch(base + "/emergencies").then((r) => r.json());
const id = list[0].id;

// 2) fetch its public points and plot them
const url = base + "/emergencies/" + id + "/public/resources?limit=100";
const { items } = await fetch(url).then((r) => r.json());

for (const p of items) {
  addMarker({
    title: p.name,
    lat: p.location.latitude,
    lng: p.location.longitude,
    status: p.publicStatus, // active | saturated | paused | closed
  });
}`;

  const emergenciesJson = `[
  {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Emergencia sísmica — Venezuela",
    "slug": "venezuela",
    "country": "VE",
    "status": "active",
    "announcement": "El puente de acceso norte está cortado.",
    "dontBringList": ["ropa usada", "medicamentos caducados"],
    "updatedAt": "2026-06-25T10:00:00.000Z"
  }
]`;

  const curlBySlug = `curl ${API_BASE}/emergencies/by-slug/venezuela`;

  const curlResources = `curl "${API_BASE}/emergencies/{emergencyId}/public/resources?category=water&limit=100&page=1"`;

  const resourcesJson = `{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "collection_point",
      "stage": "destination",
      "name": "Cruz Roja — Centro de acopio",
      "description": "Acopio de agua y alimentos no perecederos",
      "location": {
        "address": "Calle Mayor 1, Valencia",
        "latitude": 39.4699,
        "longitude": -0.3763
      },
      "verificationLevel": "official",
      "publicStatus": "active",
      "accepts": ["water", "food"],
      "contact": "+34 600 000 000",
      "schedule": "Lun-Vie 08-18",
      "manager": "Juan Pérez",
      "sourceName": "acopiove.org",
      "externalUpdatedAt": "2026-06-27T00:00:00.000Z",
      "country": "España",
      "city": "Valencia",
      "ownerOrganizationId": null
    }
  ],
  "total": 128,
  "page": 1,
  "limit": 100
}`;

  const facetsJson = `{
  "byCategory": { "water": 12, "food": 9, "medical": 4 },
  "byCountry": { "VE": 18, "CO": 7 },
  "total": 25
}`;

  const curlNeeds = `curl "${API_BASE}/emergencies/{emergencyId}/public/needs?priority=high"`;

  const needsJson = `[
  {
    "id": "9c2f...",
    "title": "Agua para 50 familias",
    "description": null,
    "priority": "high",
    "status": "validated",
    "location": {
      "address": "Caracas",
      "latitude": 10.49,
      "longitude": -66.90
    },
    "locationSensitivity": "approximate",
    "items": [
      { "name": "Agua", "quantity": 100, "unit": "litros", "category": "water" }
    ],
    "createdAt": "2026-06-27T09:00:00.000Z",
    "expiresAt": "2026-06-29T09:00:00.000Z",
    "lastVerifiedAt": "2026-06-27T10:00:00.000Z"
  }
]`;

  const curlRegister = `curl -X POST ${API_BASE}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@ong.org","password":"supersecret","name":"Mi ONG"}'

# → { "accessToken": "eyJhbGciOi..." }`;

  const curlCreateNeed = `curl -X POST ${API_BASE}/emergencies/{emergencyId}/needs \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Agua para 50 familias",
    "priority": "high",
    "location": { "address": "Caracas", "latitude": 10.49, "longitude": -66.90 },
    "items": [{ "name": "Agua", "quantity": 100, "unit": "litros", "category": "water" }]
  }'`;

  const curlCreateOffer = `curl -X POST ${API_BASE}/emergencies/{emergencyId}/offers \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "category": "food",
    "description": "Arroz 25kg",
    "quantity": 50,
    "unit": "sacos",
    "location": { "address": "Valencia", "latitude": 39.47, "longitude": -0.38 }
  }'`;

  const curlCreateResource = `curl -X POST ${API_BASE}/emergencies/{emergencyId}/resources \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "collection_point",
    "stage": "destination",
    "name": "Punto de acopio barrio Norte",
    "location": { "address": "Av. Norte 12", "latitude": 10.50, "longitude": -66.91 },
    "accepts": ["water", "food"]
  }'`;

  const attributionText =
    'ResponseGrid by Global Emergency — CC BY-SA 4.0 — https://responsegrid.app';

  const attributionHtml =
    '<a href="https://responsegrid.app">ResponseGrid</a> by <a href="https://globalemergency.online">Global Emergency</a>, licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>';

  const resourceFields: [string, string, string][] = [
    ['name', 'string', d.f_name],
    ['type', 'enum', d.f_type],
    ['stage', 'enum', d.f_stage],
    ['location', '{ address, latitude, longitude }', d.f_location],
    ['publicStatus', 'enum', d.f_status],
    ['verificationLevel', 'enum', d.f_verification],
    ['accepts', 'string[]', d.f_accepts],
    ['contact', 'string | null', d.f_contact],
    ['schedule', 'string | null', d.f_schedule],
    ['manager', 'string | null', d.f_manager],
    ['sourceName', 'string | null', d.f_source],
    ['externalUpdatedAt', 'string | null', d.f_freshness],
    ['country', 'string | null', d.f_country],
    ['city', 'string | null', d.f_city],
    ['id', 'string (uuid)', d.f_id],
    ['ownerOrganizationId', 'string | null', d.f_owner],
  ];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md bg-surface lg:max-w-6xl">
        <SiteHeaderBand />

        <div className="px-5 pb-16 pt-8 lg:px-8 lg:pt-10">
          {/* Hero */}
          <header className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-accent">
                {d.overline}
              </p>
              <h1 className="mt-2 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-navy lg:text-[40px] lg:leading-[1.05]">
                {d.h1}
              </h1>
              <p className="mt-4 text-[15px] leading-[1.6] text-ink-soft lg:text-base">{d.lead}</p>
            </div>
            <div aria-hidden="true">
              <CoordinationIllustration className="w-full" />
            </div>
          </header>

          {/* Body: sticky TOC + content */}
          <div className="mt-12 lg:mt-16 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
            {/* TOC — sidebar on lg, <details> on mobile */}
            <aside className="mb-8 lg:mb-0">
              <details className="rounded-card border border-line bg-surface-alt p-4 lg:hidden">
                <summary className="cursor-pointer font-display text-sm font-bold text-navy">
                  {d.toc_heading}
                </summary>
                <nav className="mt-3 flex flex-col gap-2">
                  {toc.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="text-[14px] text-ink-soft hover:text-accent">
                      {label}
                    </a>
                  ))}
                </nav>
              </details>
              <nav
                aria-label={d.toc_heading}
                className="sticky top-6 hidden self-start lg:flex lg:flex-col lg:gap-1.5"
              >
                <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-wide text-muted">
                  {d.toc_heading}
                </p>
                {toc.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="rounded-md px-2 py-1 text-[13.5px] text-ink-soft transition-colors hover:bg-surface-alt hover:text-accent"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="flex min-w-0 flex-col gap-12">
              {/* Overview */}
              <Section id="intro" title={d.intro_heading}>
                <Lead>{d.intro_p1}</Lead>
                <Lead>{d.intro_p2}</Lead>

                <div>
                  <h3 className="mb-2 font-display text-base font-bold text-navy">{d.base_url_heading}</h3>
                  <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={API_BASE} lang="Base URL" />
                  <p className="mt-2 text-[13px] leading-[1.55] text-muted">{d.base_url_note}</p>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    [d.overview_format_label, d.overview_format_value],
                    [d.overview_read_label, d.overview_read_value],
                    [d.overview_write_label, d.overview_write_value],
                    [d.overview_scope_label, d.overview_scope_value],
                    [d.overview_license_label, d.overview_license_value],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-card border border-line bg-surface-alt px-4 py-3">
                      <dt className="font-display text-[11px] font-bold uppercase tracking-wide text-muted">
                        {label}
                      </dt>
                      <dd className="mt-1 text-[14px] leading-[1.55] text-ink-soft">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>

              {/* Concepts */}
              <Section id="concepts" title={d.concepts_heading}>
                <Lead>{d.concepts_intro}</Lead>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card title={d.concept_emergency_t}>{d.concept_emergency_b}</Card>
                  <Card title={d.concept_resource_t}>{d.concept_resource_b}</Card>
                  <Card title={d.concept_need_t}>{d.concept_need_b}</Card>
                  <Card title={d.concept_trust_t}>{d.concept_trust_b}</Card>
                </div>
              </Section>

              {/* Authentication */}
              <Section id="auth" title={d.auth_heading}>
                <Lead>{d.auth_intro}</Lead>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card title={d.auth_read_t}>{d.auth_read_b}</Card>
                  <Card title={d.auth_write_t}>{d.auth_write_b}</Card>
                </div>
              </Section>

              {/* Quickstart */}
              <Section id="quickstart" title={d.qs_heading}>
                <Lead>{d.qs_intro}</Lead>
                <ol className="ml-4 list-decimal space-y-1.5 text-[14.5px] leading-[1.6] text-ink-soft marker:font-bold marker:text-accent">
                  <li>{d.qs_step1}</li>
                  <li>{d.qs_step2}</li>
                  <li>{d.qs_step3}</li>
                </ol>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlQuickstart} lang="cURL" />
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={jsQuickstart} lang="JavaScript" />
                <Callout>{d.qs_note}</Callout>
              </Section>

              {/* List emergencies */}
              <Section id="emergencies" title={d.e_heading}>
                <Endpoint method="GET" path="/emergencies" />
                <Lead>{d.e_intro}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={emergenciesJson} lang="JSON" />
                <Lead>{d.e_fields}</Lead>
                <Endpoint method="GET" path="/emergencies/by-slug/{slug}" />
                <Lead>{d.e_byslug}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlBySlug} lang="cURL" />
              </Section>

              {/* Logistics points (read) — the star */}
              <Section id="resources" title={d.r_heading}>
                <Endpoint method="GET" path="/emergencies/{emergencyId}/public/resources" />
                <Lead>{d.r_intro}</Lead>

                <SubHeading>{d.r_params_heading}</SubHeading>
                <Table
                  headers={[d.th_param, d.th_desc]}
                  rows={[
                    [<Mono key="p">page</Mono>, d.r_param_page],
                    [<Mono key="l">limit</Mono>, d.r_param_limit],
                    [<Mono key="c">category</Mono>, d.r_param_category],
                    [<Mono key="co">country</Mono>, d.r_param_country],
                  ]}
                />
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlResources} lang="cURL" />

                <SubHeading>{d.r_response_heading}</SubHeading>
                <Lead>{d.r_response_intro}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={resourcesJson} lang="JSON" />

                <SubHeading>{d.r_fields_heading}</SubHeading>
                <Lead>{d.r_fields_intro}</Lead>
                <Table
                  headers={[d.th_field, d.th_type, d.th_desc]}
                  rows={resourceFields.map(([f, ty, desc]) => [
                    <Mono key={f}>{f}</Mono>,
                    <Mono key={`${f}-t`}>{ty}</Mono>,
                    desc,
                  ])}
                />

                <SubHeading>{d.r_facets_heading}</SubHeading>
                <Endpoint method="GET" path="/emergencies/{emergencyId}/public/resources/facets" />
                <Lead>{d.r_facets_intro}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={facetsJson} lang="JSON" />
              </Section>

              {/* Needs (read) */}
              <Section id="needs" title={d.n_heading}>
                <Endpoint method="GET" path="/emergencies/{emergencyId}/public/needs" />
                <Lead>{d.n_intro}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlNeeds} lang="cURL" />
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={needsJson} lang="JSON" />
                <Lead>{d.n_fields}</Lead>
                <Callout tone="warn">{d.n_privacy}</Callout>
              </Section>

              {/* States & categories */}
              <Section id="enums" title={d.enums_heading}>
                <Lead>{d.enums_intro}</Lead>

                <SubHeading>{d.enum_status_heading}</SubHeading>
                <Lead>{d.enum_status_intro}</Lead>
                <Table
                  headers={[d.th_value, d.th_desc]}
                  rows={[
                    [<Mono key="a">active</Mono>, d.status_active],
                    [<Mono key="s">saturated</Mono>, d.status_saturated],
                    [<Mono key="p">paused</Mono>, d.status_paused],
                    [<Mono key="c">closed</Mono>, d.status_closed],
                  ]}
                />

                <SubHeading>{d.enum_verification_heading}</SubHeading>
                <Lead>{d.enum_verification_intro}</Lead>
                <Table
                  headers={[d.th_value, d.th_desc]}
                  rows={[
                    [<Mono key="u">unverified</Mono>, d.verification_unverified],
                    [<Mono key="v">verified</Mono>, d.verification_verified],
                    [<Mono key="o">official</Mono>, d.verification_official],
                  ]}
                />

                <SubHeading>{d.enum_type_heading}</SubHeading>
                <Lead>{d.enum_type_intro}</Lead>
                <Chips
                  items={[
                    'collection_point',
                    'delivery_point',
                    'collection_and_delivery',
                    'warehouse',
                    'transport',
                    'supplier',
                    'venue',
                  ]}
                />

                <SubHeading>{d.enum_stage_heading}</SubHeading>
                <Lead>{d.enum_stage_intro}</Lead>
                <Chips items={['origin', 'intermediate', 'destination']} />

                <SubHeading>{d.enum_category_heading}</SubHeading>
                <Lead>{d.enum_category_intro}</Lead>
                <Chips
                  items={[
                    'hygiene',
                    'water',
                    'food',
                    'medical',
                    'shelter',
                    'tools',
                    'other',
                    'medicines',
                    'medical_equipment',
                    'medical_supplies',
                    'medical_personnel',
                  ]}
                />

                <SubHeading>{d.enum_priority_heading}</SubHeading>
                <Lead>{d.enum_priority_intro}</Lead>
                <Chips items={['low', 'medium', 'high', 'urgent']} />
              </Section>

              {/* Contribute data (writes) */}
              <Section id="write" title={d.w_heading}>
                <Lead>{d.w_intro}</Lead>
                <Callout tone="warn">{d.w_moderation_note}</Callout>

                <Lead>{d.w_auth_step}</Lead>
                <Endpoint method="POST" path="/auth/register" />
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlRegister} lang="cURL" />

                <SubHeading>{d.w_need_t}</SubHeading>
                <Endpoint method="POST" path="/emergencies/{emergencyId}/needs" auth />
                <Lead>{d.w_need_b}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlCreateNeed} lang="cURL" />

                <SubHeading>{d.w_offer_t}</SubHeading>
                <Endpoint method="POST" path="/emergencies/{emergencyId}/offers" auth />
                <Lead>{d.w_offer_b}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlCreateOffer} lang="cURL" />

                <SubHeading>{d.w_resource_t}</SubHeading>
                <Endpoint method="POST" path="/emergencies/{emergencyId}/resources" auth />
                <Lead>{d.w_resource_b}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={curlCreateResource} lang="cURL" />
              </Section>

              {/* Best practices */}
              <Section id="practices" title={d.bp_heading}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card title={d.bp_cache_t}>{d.bp_cache_b}</Card>
                  <Card title={d.bp_attribution_t}>{d.bp_attribution_b}</Card>
                  <Card title={d.bp_canonical_t}>{d.bp_canonical_b}</Card>
                  <Card title={d.bp_privacy_t}>{d.bp_privacy_b}</Card>
                  <Card title={d.bp_cors_t}>{d.bp_cors_b}</Card>
                </div>
              </Section>

              {/* License & attribution */}
              <Section id="license" title={d.license_heading}>
                <Lead>{d.license_intro}</Lead>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card title={d.license_attribution_t}>{d.license_attribution_b}</Card>
                  <Card title={d.license_sharealike_t}>{d.license_sharealike_b}</Card>
                </div>
                <Lead>{d.license_snippet_intro}</Lead>
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={attributionText} lang="TXT" />
                <CodeBlock copyLabel={d.copy} copiedLabel={d.copied} code={attributionHtml} lang="HTML" />
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-accent hover:underline"
                >
                  {d.license_full_link} →
                </a>
              </Section>

              {/* Reference & links */}
              <Section id="links" title={d.links_heading}>
                <div className="flex flex-col gap-3">
                  <a
                    href={`${API_BASE}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-card border border-line bg-surface-alt p-5 transition-colors hover:border-accent"
                  >
                    <h3 className="font-display text-base font-bold text-navy">{d.links_swagger_t}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-soft">{d.links_swagger_b}</p>
                    <code className="mt-2 inline-block font-mono text-[12.5px] text-accent">{`${API_BASE}/docs`}</code>
                  </a>
                  <a
                    href={`${API_BASE}/docs-json`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-card border border-line bg-surface-alt p-5 transition-colors hover:border-accent"
                  >
                    <h3 className="font-display text-base font-bold text-navy">{d.links_openapi_t}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-soft">{d.links_openapi_b}</p>
                    <code className="mt-2 inline-block font-mono text-[12.5px] text-accent">{`${API_BASE}/docs-json`}</code>
                  </a>
                  <div className="rounded-card border border-line bg-surface-alt p-5">
                    <h3 className="font-display text-base font-bold text-navy">{d.links_client_t}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-soft">{d.links_client_b}</p>
                    <code className="mt-2 inline-block font-mono text-[12.5px] text-ink">@reliefhub/api-client</code>
                  </div>
                </div>
              </Section>

              {/* CTA */}
              <section className="rounded-card border border-line bg-surface-alt px-6 py-8 text-center">
                <h2 className="font-display text-xl font-bold text-navy">{d.cta_heading}</h2>
                <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-[1.55] text-muted">{d.cta_body}</p>
                <Link
                  href="/#emergencias"
                  className="mt-5 inline-block rounded-xl bg-navy px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                >
                  {d.cta_button}
                </Link>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
