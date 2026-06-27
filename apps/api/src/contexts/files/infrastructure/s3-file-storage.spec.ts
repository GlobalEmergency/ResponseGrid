import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { S3FileStorage } from './s3-file-storage';

/** Build a minimal mock S3Client whose `send` is a jest.fn(). */
function makeClient(sendImpl: jest.Mock): S3Client {
  const client = new S3Client({ region: 'us-east-1' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (client as any).send = sendImpl;
  return client;
}

/** Typed helper to extract the first argument of the first `send` call. */
function firstCall<T>(send: jest.Mock): T {
  // The mock records calls in an untyped array; cast explicitly.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return send.mock.calls[0][0] as T;
}

describe('S3FileStorage', () => {
  const BUCKET = 'test-bucket';
  const REGION = 'eu-west-1';

  describe('save()', () => {
    it('calls PutObjectCommand with correct Bucket, Key, Body and ContentType', async () => {
      const send = jest.fn().mockResolvedValue({});
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      const buffer = Buffer.from('fake-image-data');
      await storage.save({
        buffer,
        contentType: 'image/png',
        originalName: 'photo.png',
      });

      expect(send).toHaveBeenCalledTimes(1);
      const command = firstCall<PutObjectCommand>(send);
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe(BUCKET);
      expect(command.input.Body).toBe(buffer);
      expect(command.input.ContentType).toBe('image/png');
      // Key must be a non-empty string ending in .png
      expect(typeof command.input.Key).toBe('string');
      expect(command.input.Key).toMatch(/\.png$/);
    });

    it('returns url as /files/<key>', async () => {
      const send = jest.fn().mockResolvedValue({});
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      const result = await storage.save({
        buffer: Buffer.from('data'),
        contentType: 'image/jpeg',
      });

      expect(result.url).toBe(`/files/${result.key}`);
      expect(result.key).toMatch(/\.jpg$/);
    });

    it('uses .bin extension for unknown content-type', async () => {
      const send = jest.fn().mockResolvedValue({});
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      const result = await storage.save({
        buffer: Buffer.from('data'),
        contentType: 'application/octet-stream',
      });

      expect(result.key).toMatch(/\.bin$/);
    });
  });

  describe('getStream()', () => {
    it('returns a readable stream when GetObject succeeds', async () => {
      const fakeStream = new Readable({ read() {} });
      const send = jest.fn().mockResolvedValue({ Body: fakeStream });
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      const stream = await storage.getStream('abc123.png');

      expect(send).toHaveBeenCalledTimes(1);
      const command = firstCall<GetObjectCommand>(send);
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Bucket).toBe(BUCKET);
      expect(command.input.Key).toBe('abc123.png');
      expect(stream).toBe(fakeStream);
    });

    it('returns null when S3 throws NoSuchKey', async () => {
      const send = jest
        .fn()
        .mockRejectedValue(
          new NoSuchKey({ message: 'Not found', $metadata: {} }),
        );
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      const stream = await storage.getStream('missing.png');

      expect(stream).toBeNull();
    });

    it('returns null when S3 responds with a 404 httpStatusCode', async () => {
      const err = Object.assign(new Error('Not found'), {
        $metadata: { httpStatusCode: 404 },
      });
      const send = jest.fn().mockRejectedValue(err);
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      const stream = await storage.getStream('missing.png');

      expect(stream).toBeNull();
    });

    it('re-throws unexpected S3 errors', async () => {
      const networkError = new Error('Network failure');
      const send = jest.fn().mockRejectedValue(networkError);
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      await expect(storage.getStream('some.png')).rejects.toThrow(
        'Network failure',
      );
    });

    it('returns null for keys containing path separators (sanitisation)', async () => {
      const send = jest.fn();
      const storage = new S3FileStorage({
        bucket: BUCKET,
        region: REGION,
        client: makeClient(send),
      });

      expect(await storage.getStream('../etc/passwd')).toBeNull();
      expect(await storage.getStream('foo/bar.png')).toBeNull();
      expect(await storage.getStream('foo\\bar.png')).toBeNull();
      // send must never have been called
      expect(send).not.toHaveBeenCalled();
    });
  });
});
