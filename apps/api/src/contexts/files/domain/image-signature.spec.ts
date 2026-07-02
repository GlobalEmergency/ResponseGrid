import { isSupportedImage } from './image-signature';

/** Build a 16-byte buffer starting with the given signature bytes. */
function bufWith(...bytes: number[]): Buffer {
  const b = Buffer.alloc(16);
  bytes.forEach((v, i) => (b[i] = v));
  return b;
}

describe('isSupportedImage', () => {
  it('accepts a JPEG signature', () => {
    expect(isSupportedImage(bufWith(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
  });

  it('accepts a PNG signature', () => {
    expect(
      isSupportedImage(bufWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe(true);
  });

  it('accepts a GIF signature', () => {
    expect(isSupportedImage(Buffer.from('GIF89a....................'))).toBe(
      true,
    );
  });

  it('accepts a WebP signature', () => {
    const b = Buffer.from('RIFF0000WEBPVP8 ', 'ascii');
    expect(isSupportedImage(b)).toBe(true);
  });

  it('rejects an HTML/script payload mislabelled as an image', () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    expect(isSupportedImage(html)).toBe(false);
  });

  it('rejects an SVG payload', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(isSupportedImage(svg)).toBe(false);
  });

  it('rejects a too-short buffer', () => {
    expect(isSupportedImage(Buffer.from([0xff, 0xd8]))).toBe(false);
  });
});
