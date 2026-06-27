import { ImageResponse } from 'next/og';
import { brandIconDataUri } from './brand-icon';

/**
 * Renders a maskable PWA icon: the brand mark padded inside a navy square so it
 * survives Android's adaptive-icon mask (the disc stays within the safe zone).
 * Used by the /icons/icon-*.png route handlers — no raster tooling required.
 */
export function maskableIcon(n: number): ImageResponse {
  const inner = Math.round(n * 0.62);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#112b4a',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandIconDataUri()} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: n, height: n },
  );
}
