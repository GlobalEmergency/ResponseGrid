import { ImageResponse } from 'next/og';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { brandIconDataUri } from '@/lib/brand-icon';

// Per-emergency social preview (WhatsApp, X, AI assistants). Generated on
// demand from live emergency data — no raster tooling, uses the default font
// (Latin + accents cover Spanish names).
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'ResponseGrid';

type Props = { params: Promise<{ slug: string }> };

const STATUS_LABEL: Record<string, string> = {
  active: 'Operativo activo',
  paused: 'En pausa',
  closed: 'Cerrada',
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const name = emergency?.name ?? 'Emergencia';
  const status = emergency ? (STATUS_LABEL[emergency.status] ?? '') : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#112b4a',
          padding: '72px',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandIconDataUri()} width={64} height={64} alt="" />
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.5px' }}>ResponseGrid</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {status !== '' && (
            <span
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: '#e8740e',
                color: '#ffffff',
                fontSize: 24,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 999,
              }}
            >
              {status}
            </span>
          )}
          <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1.5px' }}>
            {name}
          </span>
        </div>

        <span style={{ fontSize: 30, color: '#9db4d0' }}>
          Puntos de acopio, necesidades y cómo ayudar · responsegrid.app
        </span>
      </div>
    ),
    size,
  );
}
