import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, Profile } from 'passport-google-oauth20';
import { AuthenticateWithProvider } from '../../application/authenticate-with-provider';
import { AuthProvider } from '../../domain/auth-provider';

const PLACEHOLDER = '__not_configured__';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly configured: boolean;

  constructor(
    private readonly authenticateWithProvider: AuthenticateWithProvider,
  ) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const options: StrategyOptions = {
      // Passport-OAuth2 requires a non-empty clientID; use a placeholder so the
      // module boots without credentials. Requests will fail at Google's end, not here.
      clientID: clientID || PLACEHOLDER,
      clientSecret: clientSecret || PLACEHOLDER,
      callbackURL: `${process.env.OAUTH_CALLBACK_BASE ?? 'http://localhost:3000'}/auth/google/callback`,
      scope: ['email', 'profile'],
    };

    super(options);

    this.configured = Boolean(clientID && clientSecret);
    if (!this.configured) {
      this.logger.warn(
        'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth is disabled',
      );
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ accessToken: string }> {
    const emailEntry = profile.emails?.[0];
    const email = emailEntry?.value;
    if (!email) {
      throw new Error('Google profile did not return an email address');
    }

    // Google's OIDC userinfo exposes `email_verified`; passport surfaces it as
    // `emails[].verified` (a boolean or the string 'true'). Only a truthy,
    // explicit verification counts — anything else is treated as unverified.
    const verifiedFlag = emailEntry?.verified as boolean | string | undefined;
    const emailVerified = verifiedFlag === true || verifiedFlag === 'true';

    const name =
      profile.displayName ||
      [profile.name?.givenName, profile.name?.familyName]
        .filter(Boolean)
        .join(' ') ||
      email;

    return this.authenticateWithProvider.execute({
      provider: AuthProvider.Google,
      providerUserId: profile.id,
      email,
      name,
      emailVerified,
    });
  }
}
