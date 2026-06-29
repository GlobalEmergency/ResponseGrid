import { ExecutionContext } from '@nestjs/common';
import { JwtOrApiKeyAuthGuard } from './jwt-or-api-key-auth.guard';
import type { JwtAuthGuard } from './jwt-auth.guard';
import type { ApiKeyAuthGuard } from './api-key-auth.guard';

function contextWithHeaders(
  headers: Record<string, string | undefined>,
): ExecutionContext {
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtOrApiKeyAuthGuard', () => {
  it('delegates to the API-key guard when X-API-Key is present', async () => {
    const jwtCanActivate = jest.fn();
    const apiKeyCanActivate = jest.fn().mockResolvedValue(true);
    const guard = new JwtOrApiKeyAuthGuard(
      { canActivate: jwtCanActivate } as unknown as JwtAuthGuard,
      { canActivate: apiKeyCanActivate } as unknown as ApiKeyAuthGuard,
    );

    const ctx = contextWithHeaders({ 'x-api-key': 'rh_live_abc' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(apiKeyCanActivate).toHaveBeenCalledWith(ctx);
    expect(jwtCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the JWT guard when X-API-Key is absent', async () => {
    const jwtCanActivate = jest.fn().mockResolvedValue(true);
    const apiKeyCanActivate = jest.fn();
    const guard = new JwtOrApiKeyAuthGuard(
      { canActivate: jwtCanActivate } as unknown as JwtAuthGuard,
      { canActivate: apiKeyCanActivate } as unknown as ApiKeyAuthGuard,
    );

    const ctx = contextWithHeaders({ authorization: 'Bearer t' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwtCanActivate).toHaveBeenCalledWith(ctx);
    expect(apiKeyCanActivate).not.toHaveBeenCalled();
  });
});
