import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, Profile } from 'passport-facebook';
import { AuthenticateWithProvider } from '../../application/authenticate-with-provider';
import { AuthProvider } from '../../domain/auth-provider';

const PLACEHOLDER = '__not_configured__';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);
  private readonly configured: boolean;

  constructor(private readonly authenticateWithProvider: AuthenticateWithProvider) {
    const clientID = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;

    const options: StrategyOptions = {
      // Passport-OAuth2 requires a non-empty clientID; use a placeholder so the
      // module boots without credentials. Requests will fail at Facebook's end, not here.
      clientID: clientID || PLACEHOLDER,
      clientSecret: clientSecret || PLACEHOLDER,
      callbackURL:
        `${process.env.OAUTH_CALLBACK_BASE ?? 'http://localhost:3000'}/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'displayName'],
    };

    super(options);

    this.configured = Boolean(clientID && clientSecret);
    if (!this.configured) {
      this.logger.warn(
        'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not set — Facebook OAuth is disabled',
      );
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ accessToken: string }> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Facebook profile did not return an email address');
    }

    const name =
      profile.displayName ||
      [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') ||
      email;

    return this.authenticateWithProvider.execute({
      provider: AuthProvider.Facebook,
      providerUserId: profile.id,
      email,
      name,
    });
  }
}
