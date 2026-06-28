import { ImageResponse } from 'next/og';
import { brandIconDataUri } from '@/lib/brand-icon';

// Apple touch icon — opaque, full-bleed square (iOS applies its own mask).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbfaf8',
        }}
      >
        <img src={brandIconDataUri()} width={132} height={132} alt="" />
      </div>
    ),
    { ...size },
  );
}
