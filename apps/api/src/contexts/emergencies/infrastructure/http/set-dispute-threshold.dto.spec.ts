import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SetDisputeThresholdDto } from './dto';

// Mirror the global ValidationPipe from configure-http-app.ts so the test
// reflects real request handling (this endpoint's contract lives entirely in
// the DTO decorators — clearing must be an explicit null, an empty body is 400).
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const meta = {
  type: 'body' as const,
  metatype: SetDisputeThresholdDto,
  data: '',
};

const run = (payload: unknown) => pipe.transform(payload, meta);

describe('SetDisputeThresholdDto validation', () => {
  it('accepts a positive integer within range', async () => {
    await expect(run({ threshold: 5 })).resolves.toEqual({ threshold: 5 });
  });

  it('accepts an explicit null (clears the threshold, keeps the field)', async () => {
    await expect(run({ threshold: null })).resolves.toEqual({
      threshold: null,
    });
  });

  it('rejects an empty body — clearing must be an explicit null', async () => {
    await expect(run({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([0, -1, 1.5, 1001, 'x', true])('rejects %p', async (bad) => {
    await expect(run({ threshold: bad })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown properties', async () => {
    await expect(run({ threshold: 5, extra: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
