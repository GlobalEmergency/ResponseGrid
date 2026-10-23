import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SetAutoHideOnDisputeDto } from './dto';

// Mirror the global ValidationPipe from configure-http-app.ts (see the
// analogous set-dispute-threshold.dto.spec.ts for the same pattern).
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const meta = {
  type: 'body' as const,
  metatype: SetAutoHideOnDisputeDto,
  data: '',
};

const run = (payload: unknown) => pipe.transform(payload, meta);

describe('SetAutoHideOnDisputeDto validation (#171)', () => {
  it('accepts enabled: true', async () => {
    await expect(run({ enabled: true })).resolves.toEqual({ enabled: true });
  });

  it('accepts enabled: false', async () => {
    await expect(run({ enabled: false })).resolves.toEqual({ enabled: false });
  });

  it('rejects a missing body — the field is required', async () => {
    await expect(run({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([1, 0, 'true', null, undefined])('rejects %p', async (bad) => {
    await expect(run({ enabled: bad })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown properties', async () => {
    await expect(run({ enabled: true, extra: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
