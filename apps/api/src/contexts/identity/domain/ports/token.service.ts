export const TOKEN_SERVICE = Symbol('TokenService');

export interface TokenPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
