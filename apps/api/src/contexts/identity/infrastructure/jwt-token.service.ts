import { JwtService } from '@nestjs/jwt';
import { TokenService, TokenPayload } from '../domain/ports/token.service';

export class JwtTokenService implements TokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign(payload);
  }

  verify(token: string): TokenPayload {
    // Pin the accepted algorithm. The current setup is symmetric (HS256), so
    // this is defence-in-depth against algorithm-confusion if an asymmetric key
    // is ever introduced; it also rejects `alg: none` explicitly.
    return this.jwtService.verify<TokenPayload>(token, {
      algorithms: ['HS256'],
    });
  }
}
