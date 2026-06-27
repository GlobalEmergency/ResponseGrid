import * as crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
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

export interface S3FileStorageOptions {
  bucket: string;
  region: string;
  /** Provide a pre-configured client (useful for tests). Defaults to a new S3Client using the SDK default credential chain. */
  client?: S3Client;
}

/**
 * S3FileStorage — stores uploaded files in an AWS S3 bucket.
 *
 * Credentials are resolved by the AWS SDK default credential chain
 * (EC2 instance role, ECS task role, environment variables, shared credentials
 * file, etc.). No access keys are accepted in the constructor.
 *
 * Files are served via the API's GET /files/:key endpoint (not via presigned
 * URLs) so all existing security headers (X-Content-Type-Options, etc.) are
 * preserved.
 */
export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3FileStorageOptions) {
    this.bucket = options.bucket;
    this.client = options.client ?? new S3Client({ region: options.region });
  }

  async save(input: SaveInput): Promise<SaveResult> {
    const ext = extensionForContentType(input.contentType);
    const key = `${crypto.randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );

    return { key, url: `/files/${key}` };
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream | null> {
    // Sanitise key: no path separators allowed (mirrors LocalDiskFileStorage)
    if (key.includes('/') || key.includes('\\') || key.includes('..')) {
      return null;
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      // S3 Body is a SdkStreamMixin & Readable
      return response.Body as Readable;
    } catch (err: unknown) {
      // NoSuchKey is thrown when the object does not exist
      if (err instanceof NoSuchKey) {
        return null;
      }
      // S3 may also return a generic error with a $metadata.httpStatusCode of 404
      if (
        typeof err === 'object' &&
        err !== null &&
        '$metadata' in err &&
        (err as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        return null;
      }
      throw err;
    }
  }
}
