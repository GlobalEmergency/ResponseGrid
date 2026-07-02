/**
 * Content-based image detection ("magic bytes").
 *
 * The upload endpoint's Multer fileFilter trusts the client-supplied MIME type,
 * which an attacker fully controls. This inspects the actual first bytes of the
 * uploaded buffer so we can reject files whose content is not one of the image
 * formats we serve — a mislabelled payload (e.g. an HTML/SVG document sent as
 * image/png) never reaches storage.
 *
 * Pure domain helper — no framework/infra dependency.
 */
export function isSupportedImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG — FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }
  // GIF — "GIF87a" / "GIF89a"
  if (
    buffer.toString('ascii', 0, 6) === 'GIF87a' ||
    buffer.toString('ascii', 0, 6) === 'GIF89a'
  ) {
    return true;
  }
  // WebP — "RIFF" .... "WEBP"
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return true;
  }
  // BMP — "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return true;
  }
  // TIFF — "II*\0" (little-endian) or "MM\0*" (big-endian)
  if (
    (buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
    (buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a)
  ) {
    return true;
  }

  return false;
}
