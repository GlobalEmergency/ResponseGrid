import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppBar } from '@/components/organisms/app-bar';
import { GruposWhatsapp } from '@/components/molecules/grupos-whatsapp';
import { ApoyoViolencia } from '@/components/molecules/apoyo-violencia';
import { AvisoDestacado } from '@/components/molecules/aviso-destacado';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { PORTADA } from '@/lib/portada-galapagos';
import { plataformaActiva } from '@/lib/plataforma';
import { fechaLarga, leerInformes } from '@/lib/informes';

// Portada de la instancia USFQ Galápagos. Sustituye la portada genérica de
// ResponseGrid (directorio de emergencias): esta instancia atiende una sola
// emergencia. El texto fijo vive en lib/portada-galapagos.ts; las necesidades
// se leen en vivo de la plataforma.
export const dynamic = 'force-dynamic';

const TITULO = 'Gestión de Emergencias — Sociedad Civil Galápagos';
const DESCRIPCION =
  'Un solo lugar para coordinar la ayuda por las inundaciones en Santa Cruz, junto a organizaciones de la sociedad civil y en coordinación con el COE.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: '/' },
  openGraph: { title: TITULO, description: DESCRIPCION, url: '/' },
};

const PRIORIDAD: Record<string, { texto: string; clase: string }> = {
  urgent: { texto: 'Urgente', clase: 'bg-accent text-white' },
  high: { texto: 'Alta', clase: 'bg-black text-white' },
  medium: { texto: 'Media', clase: 'border border-black text-black' },
  low: { texto: 'Baja', clase: 'border border-line-strong text-muted' },
};
const ORDEN: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const h2 = 'font-display text-lg font-black uppercase leading-[0.95] tracking-[-0.01em] text-black lg:text-xl';
const tarjeta = 'rounded-card border border-line bg-white p-5 lg:p-6';
const botonNegro =
  'inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2';
const botonRojo =
  'inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2';
const botonBorde =
  'inline-flex items-center justify-center rounded-lg border-[1.5px] border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2';

export default async function HomePage() {
  // Con la plataforma apagada (PLATAFORMA_ACTIVA=false) la portada no enlaza a
  // ninguna ruta de ResponseGrid ni muestra su barra: quedan el contenido fijo,
  // /mapas/ y /clima/.
  const activa = plataformaActiva();
  const slug = PORTADA.emergenciaSlug;
  const emergencia = await getEmergencyBySlug(slug);
  const base = `/e/${slug}`;

  const { data: necesidades } = emergencia
    ? await api.GET('/emergencies/{emergencyId}/public/needs', {
        params: { path: { emergencyId: emergencia.id }, query: { limit: '50' } },
      })
    : { data: undefined };
  const informes = await leerInformes();
  const hoy = [...(necesidades ?? [])]
    .sort((a, b) => (ORDEN[a.priority] ?? 9) - (ORDEN[b.priority] ?? 9))
    .slice(0, 8);

  return (
    <main className="flex-1 bg-surface">
      {!activa ? null : emergencia ? (
        <AppBar variant="emergency" slug={slug} emergency={{ name: emergencia.name, status: emergencia.status }} />
      ) : (
        <AppBar variant="home" />
      )}

      {/* ── Portada ─────────────────────────────────────────────────── */}
      <section className="bg-black text-white">
        <div className="mx-auto w-full max-w-5xl px-5 pb-10 pt-9 lg:px-8 lg:pb-14 lg:pt-12">
          <p className="inline-block bg-white px-2 py-1 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-black">
            Inundaciones · Santa Cruz, Galápagos
          </p>
          <h1 className="mt-4 font-display text-[34px] font-black uppercase leading-[0.9] tracking-[-0.01em] lg:text-[56px]">
            Gestión de
            <br />
            Emergencias
          </h1>
          <p className="mt-3 font-display text-lg font-black uppercase leading-none text-accent lg:text-2xl">
            Sociedad Civil Galápagos
          </p>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/85 lg:text-base">
            Un solo lugar para coordinar la ayuda por las inundaciones en Santa Cruz. Trabajamos junto a organizaciones
            de la sociedad civil y en coordinación con el COE.
          </p>
          {activa ? (
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href={`${base}/peticion`} className={botonRojo}>
              Necesito ayuda
            </Link>
            <Link href={`${base}/voluntario`} className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-white/85">
              Quiero ayudar
            </Link>
            <Link href={base} className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-white/60 px-4 py-2.5 text-sm font-bold text-white hover:border-white">
              Ver el mapa y los puntos
            </Link>
          </div>
          ) : null}
          {/* /riesgos y /clima los sirve Caddy fuera de la app: van con <a>, no con <Link>. */}
          <div className={`${activa ? 'mt-2.5' : 'mt-6'} flex flex-wrap gap-2.5`}>
            <a href="/riesgos/" title="Reportes de la comunidad y estimaciones propias, no oficiales" className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-white/60 px-4 py-2.5 text-sm font-bold text-white hover:border-white">
              <span aria-hidden="true">🗺️</span> Mapa de riesgos
            </a>
            <a href="/clima/" className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-white/60 px-4 py-2.5 text-sm font-bold text-white hover:border-white">
              <span aria-hidden="true">🌧️</span> Clima en vivo
            </a>
          </div>
          <p className="mt-5 text-sm text-white/70">
            En una emergencia, llama al{' '}
            <a href="tel:911" className="font-bold text-white underline underline-offset-2">
              ECU 911
            </a>
            .
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 lg:gap-10 lg:px-8 lg:py-10">
        <AvisoDestacado />

        {/* ── Advertencia oficial vigente (se oculta sola al vencer) ──────── */}
        {PORTADA.advertencia && Date.now() < Date.parse(PORTADA.advertencia.hasta) ? (
          <section aria-labelledby="advertencia-heading" className={`${tarjeta} border-t-4 border-t-accent`}>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-accent">
              Advertencia oficial · {PORTADA.advertencia.emisor}
            </p>
            <h2 id="advertencia-heading" className={`${h2} mt-1`}>{PORTADA.advertencia.titulo}</h2>
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
              <a href={PORTADA.advertencia.imagen} target="_blank" rel="noopener" title="Abrir la imagen en grande">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen fija de public/avisos, sin optimizador */}
                <img
                  src={PORTADA.advertencia.imagen}
                  alt={PORTADA.advertencia.alt}
                  width={863}
                  height={1148}
                  className="w-full rounded-lg border border-line bg-white"
                />
              </a>
              <div>
                <p className="text-[15px] font-bold leading-snug text-ink">{PORTADA.advertencia.vigencia}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{PORTADA.advertencia.texto}</p>
                {PORTADA.advertencia.nota ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{PORTADA.advertencia.nota}</p>
                ) : null}
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  Es un comunicado del {PORTADA.advertencia.emisor}, no de SOS Galápagos. Sigue las indicaciones del COE y, en una
                  emergencia, llama al ECU 911.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <a href="/clima/" className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-black/85">
                    Ver la lluvia en vivo
                  </a>
                  <a href="/riesgos/" className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-black px-4 py-2.5 text-sm font-bold text-black hover:bg-surface">
                    Ver el mapa de riesgos
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Situación hoy ─────────────────────────────────────────── */}
        <section aria-labelledby="situacion-heading" className={tarjeta}>
          <h2 id="situacion-heading" className={h2}>Situación hoy</h2>
          <p className="mt-2 text-[13px] text-muted">Actualizado el {PORTADA.actualizado}.</p>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {PORTADA.situacion.map((s) => (
              <div key={s.tema} className="rounded-lg border border-line bg-surface px-3.5 py-3">
                <dt className="text-[12px] font-extrabold uppercase tracking-wide text-accent">{s.tema}</dt>
                <dd className="mt-1 text-[14px] leading-snug text-ink">{s.texto}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Necesitas ayuda / Quieres ayudar ──────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="necesitas-heading" className={`${tarjeta} border-t-4 border-t-accent`}>
            <h2 id="necesitas-heading" className={h2}>Si necesitas ayuda</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
              {activa ? 'Registra tu necesidad en esta plataforma y regístrate' : 'Regístrate'} como damnificado en el GAD
              Municipal de Santa Cruz. En una emergencia, llama al ECU 911.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activa ? (
                <Link href={`${base}/peticion`} className={botonNegro}>
                  Registrar mi necesidad
                </Link>
              ) : null}
              <a href={PORTADA.registroGAD} target="_blank" rel="noopener noreferrer" className={botonBorde}>
                Registro de damnificados (GAD) ↗
              </a>
              <a href={PORTADA.formularioCOE} target="_blank" rel="noopener noreferrer" className={botonBorde}>
                Formulario del COE ↗
              </a>
            </div>
          </section>

          <section aria-labelledby="quieres-heading" className={`${tarjeta} border-t-4 border-t-black`}>
            <h2 id="quieres-heading" className={h2}>Si quieres ayudar</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
              <b>No envíes donaciones físicas desde el continente.</b> Ponen en riesgo la bioseguridad de las islas y
              saturan una logística que hoy necesitamos para medicinas y agua. Dona dinero a organizaciones con
              trazabilidad{activa ? ' y registra aquí tu oferta de voluntariado' : ''}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activa ? (
                <Link href={`${base}/voluntario`} className={botonNegro}>
                  Apuntarme como voluntario
                </Link>
              ) : null}
              <a href="#organizaciones" className={botonRojo}>
                Donar ↓
              </a>
              <a href="#mascotas" className={botonBorde}>
                Mascotas
              </a>
            </div>
          </section>
        </div>

        {/* ── Lo que se necesita hoy (en vivo) ──────────────────────── */}
        {activa || hoy.length > 0 ? (
        <section aria-labelledby="hoy-heading" className={tarjeta}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="hoy-heading" className={h2}>Lo que se necesita hoy</h2>
            {activa ? (
              <Link href={`${base}#explore-heading`} className="text-sm font-bold text-black underline underline-offset-2 hover:text-accent">
                Ver todas las necesidades →
              </Link>
            ) : null}
          </div>
          <p className="mt-2 text-[14px] text-ink-soft">
            Repelente, mosquiteros, artículos de higiene y agua. Lo que se pueda, cómpralo en Santa Cruz.
          </p>
          {hoy.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2" role="list">
              {hoy.map((n) => {
                const p = PRIORIDAD[n.priority] ?? PRIORIDAD.medium!;
                return (
                  <li key={n.id} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${p.clase}`}>
                      {p.texto}
                    </span>
                    <span className="text-[13.5px] font-semibold leading-snug text-ink">{n.title}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Aún no hay necesidades validadas.</p>
          )}
        </section>
        ) : null}

        {/* ── Para entender la emergencia: /riesgos y /clima ── */}
        <section aria-labelledby="consulta-heading" className={tarjeta}>
          <h2 id="consulta-heading" className={h2}>Mapas y clima</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-soft">
            Información abierta para entender qué pasó y dónde está el riesgo. Sirve a vecinos, voluntarios, técnicos y
            autoridades.
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3" role="list">
            {PORTADA.consulta.map((c) => (
              <li key={c.ruta}>
                <a
                  href={c.ruta}
                  className="group flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-black focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <span className="font-display text-base font-black uppercase leading-tight text-black">{c.titulo}</span>
                  <span className="mt-0.5 text-[12px] font-semibold text-muted">sosgalapagos.org{c.ruta.replace(/\/$/, '')}</span>
                  <span className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{c.resumen}</span>
                  <ul className="mt-2 flex flex-col gap-1 text-[13px] leading-snug text-ink">
                    {c.contenido.map((t) => (
                      <li key={t} className="flex gap-1.5">
                        <span aria-hidden="true" className="text-accent">·</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto pt-3 text-[13px] font-bold text-black group-hover:text-accent">Abrir →</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Informes y mapas descargables (PDF en /descargas/, fuera de la app: van con <a>) ── */}
        {informes.length > 0 || PORTADA.referencias.length > 0 ? (
          <section id="informes" aria-labelledby="informes-heading" className={`${tarjeta} scroll-mt-20`}>
            <h2 id="informes-heading" className={h2}>Informes y mapas para descargar</h2>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-soft">
              Mapas e informes en PDF listos para imprimir o compartir. Son <b>estimaciones propias de SOS Galápagos, no
              datos oficiales</b>: sirven para priorizar y deben verificarse en campo.
            </p>
            {informes.length > 0 ? (
            <ul className="mt-4 grid gap-3 md:grid-cols-2" role="list">
              {informes.map((i) => (
                <li key={i.archivo} className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
                  {i.portada ? (
                    // eslint-disable-next-line @next/next/no-img-element -- la miniatura la sirve Caddy desde /descargas/, fuera de la app
                    <img
                      src={`/descargas/${i.portada}`}
                      alt=""
                      loading="lazy"
                      width={728}
                      height={515}
                      className="aspect-[1.414] w-full border-b border-line bg-white object-cover object-left-top"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col p-4">
                    <span className="font-display text-base font-black uppercase leading-tight text-black">{i.titulo}</span>
                    <span className="mt-1 text-[12px] font-semibold text-muted">
                      {[fechaLarga(i.fecha), i.formato, i.paginas ? `${i.paginas} páginas` : null, i.tamano].filter(Boolean).join(' · ')}
                    </span>
                    {i.resumen ? <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{i.resumen}</p> : null}
                    <a href={`/descargas/${i.archivo}`} download className={`${botonNegro} mt-auto self-start`} style={{ marginTop: '0.9rem' }}>
                      Descargar PDF ↓
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            ) : null}
            {PORTADA.referencias.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-accent">Publicaciones científicas de referencia</h3>
                <ul className="mt-2 flex flex-col gap-3" role="list">
                  {PORTADA.referencias.map((r) => (
                    <li key={r.doi} className="text-[13.5px] leading-relaxed text-ink">
                      {r.autores} ({r.anio}). {r.titulo}. <i>{r.revista}</i>, {r.detalle}.{' '}
                      <a
                        href={`https://doi.org/${r.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-semibold text-accent underline-offset-2 hover:underline"
                      >
                        https://doi.org/{r.doi} ↗
                      </a>
                      {r.nota ? <span className="mt-0.5 block text-[12.5px] text-muted">{r.nota}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <ApoyoViolencia headingId="apoyo-violencia-portada" />

        <GruposWhatsapp headingId="grupos-whatsapp-portada" />

        {/* ── Organizaciones ───────────────────────────────────────── */}
        <section id="organizaciones" aria-labelledby="org-heading" className={`${tarjeta} scroll-mt-20`}>
          <h2 id="org-heading" className={h2}>Organizaciones aliadas</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-soft">
            Si quieres donar dinero, hazlo a organizaciones con trazabilidad y por sus canales oficiales.{' '}
            <b>No dones a cuentas personales.</b> Todo se coordina con el COE.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {PORTADA.organizaciones.map((o) => (
              <li key={o.nombre} className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-3 py-2.5">
                <span className="text-[13.5px] font-semibold text-ink">{o.nombre}</span>
                {o.whatsapp ? (
                  <a
                    href={`https://wa.me/${o.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    WhatsApp +{o.whatsapp.replace(/\D/g, '')} ↗
                  </a>
                ) : null}
                {o.instagram ? (
                  <a
                    href={`https://www.instagram.com/${o.instagram}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Instagram @{o.instagram} ↗
                  </a>
                ) : null}
                {o.enlaces?.map((e) => (
                  <a
                    key={e.url}
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    {e.etiqueta} ↗
                  </a>
                ))}
                {o.donar ? (
                  <a
                    href={o.donar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${botonRojo} mt-2 w-full px-5 py-3 text-[15px]`}
                  >
                    Donar ↗
                  </a>
                ) : null}
                {!o.instagram && !o.whatsapp && !o.enlaces ? (
                  <span className="text-[12px] text-muted">Contactar por sus canales oficiales</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Mascotas ─────────────────────────────────────────────── */}
        <section id="mascotas" aria-labelledby="mascotas-heading" className={`${tarjeta} scroll-mt-20`}>
          <h2 id="mascotas-heading" className={h2}>Ayuda para mascotas</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-soft">
            Los perros y gatos de las familias damnificadas y los refugios de animales también lo perdieron todo. Se
            necesita alimento para perros y gatos, collares, correas, transportadoras, toallas y dinero. Estas
            organizaciones de Santa Cruz los están atendiendo.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2" role="list">
            {PORTADA.mascotas.map((m) => (
              <li key={m.nombre} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
                <span className="font-display text-base font-black uppercase leading-tight text-black">{m.nombre}</span>
                {m.detalle ? <p className="text-[13px] leading-snug text-ink-soft">{m.detalle}</p> : null}
                {m.banco ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px] leading-snug">
                    <dt className="text-muted">Banco</dt>
                    <dd className="font-semibold text-ink">{m.banco.banco}</dd>
                    <dt className="text-muted">{m.banco.tipo}</dt>
                    <dd className="select-all font-mono font-semibold text-ink">{m.banco.numero}</dd>
                    <dt className="text-muted">Titular</dt>
                    <dd className="font-semibold text-ink">{m.banco.titular}</dd>
                    <dt className="text-muted">{m.banco.idTipo}</dt>
                    <dd className="select-all font-mono font-semibold text-ink">{m.banco.id}</dd>
                  </dl>
                ) : null}
                {m.paypal ? (
                  <a href={m.paypal} target="_blank" rel="noopener noreferrer" className={`${botonNegro} self-start`}>
                    Donar por PayPal ↗
                  </a>
                ) : null}
                {m.facebook ? (
                  <a
                    href={m.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Facebook ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-muted">
            Datos de donación compartidos por la coordinación de SOS Galápagos y por las propias fundaciones.
          </p>
        </section>

        <p className="text-[12.5px] text-muted">
          Información actualizada al {PORTADA.actualizado}. Fuentes: COE Provincial y cantonal, GAD Santa Cruz y
          organizaciones de la sociedad civil.
        </p>
      </div>
    </main>
  );
}
