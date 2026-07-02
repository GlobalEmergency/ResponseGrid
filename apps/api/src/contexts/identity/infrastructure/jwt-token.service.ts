import { JwtService } from '@nestjs/jwt';
import { TokenService, TokenPayload } from '../domain/ports/token.service';

/**
 * Issuer/audience bound into every access token and checked on verify. Binding
 * `iss`/`aud` means a token minted for this API cannot be replayed against a
 * different service that ever shares the same JWT secret (defence-in-depth).
 * Applied to sign via JwtModule signOptions (identity.module.ts) and to verify
 * here — keep both in sync.
 */
export const JWT_ISSUER = 'responsegrid';
export const JWT_AUDIENCE = 'responsegrid-api';

export class JwtTokenService implements TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign(payload);
  }

  verify(token: string): TokenPayload {
    // Pin the accepted algorithm. The current setup is symmetric (HS256), so
    // this is defence-in-depth against algorithm-confusion if an asymmetric key
    // is ever introduced; it also rejects `alg: none` explicitly. Also bind the
    // issuer/audience so a token is only accepted for this service.
    return this.jwtService.verify<TokenPayload>(token, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }
}
