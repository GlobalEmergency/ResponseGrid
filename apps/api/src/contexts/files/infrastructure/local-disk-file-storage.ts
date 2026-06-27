import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import {
  FileStorage,
  SaveInput,
  SaveResult,
} from '../domain/ports/file-storage';

/** Maps common MIME types to file extensions. */
function extensionForContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
  };
  return map[contentType.toLowerCase()] ?? '.bin';
}

/**
 * LocalDiskFileStorage — saves uploaded files to apps/api/uploads/.
 *
 * Adapter that fulfills the FileStorage port for local/dev environments.
 * Swap for S3FileStorage in production — same interface, zero consumer changes.
 */
export class LocalDiskFileStorage implements FileStorage {
  constructor(private readonly uploadsDir: string) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  async save(input: SaveInput): Promise<SaveResult> {
    const ext = extensionForContentType(input.contentType);
    const key = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadsDir, key);
    await fs.promises.writeFile(filePath, input.buffer);
    return { key, url: `/files/${key}` };
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream | null> {
    // Sanitise key: no path separators allowed
    if (key.includes('/') || key.includes('\\') || key.includes('..')) {
      return null;
    }
    const filePath = path.join(this.uploadsDir, key);
    try {
      await fs.promises.access(filePath);
    } catch {
      return null;
    }
    return fs.createReadStream(filePath);
  }
}
