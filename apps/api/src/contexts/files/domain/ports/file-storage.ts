/**
 * Port: FileStorage
 *
 * Abstracts binary file persistence. The primary implementation is
 * LocalDiskFileStorage (apps/api/uploads/). In production swap it for an
 * S3FileStorage adapter that writes to an S3-compatible bucket — the interface
 * and all consumers remain unchanged.
 */
export const FILE_STORAGE = Symbol('FileStorage');

export interface SaveInput {
  buffer: Buffer;
  contentType: string;
  originalName?: string;
}

export interface SaveResult {
  /** Opaque storage key (e.g. uuid + extension). */
  key: string;
  /** Publicly accessible URL to retrieve the file. */
  url: string;
}

export interface FileStorage {
  save(input: SaveInput): Promise<SaveResult>;
  /** Returns a readable stream for the given key, or null when not found. */
  getStream(key: string): Promise<NodeJS.ReadableStream | null>;
}
