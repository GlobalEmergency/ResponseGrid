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

  constructor(
    private readonly authenticateWithProvider: AuthenticateWithProvider,
  ) {
    const clientID = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;

    const options: StrategyOptions = {
      // Passport-OAuth2 requires a non-empty clientID; use a placeholder so the
      // module boots without credentials. Requests will fail at Facebook's end, not here.
      clientID: clientID || PLACEHOLDER,
      clientSecret: clientSecret || PLACEHOLDER,
      callbackURL: `${process.env.OAUTH_CALLBACK_BASE ?? 'http://localhost:3000'}/auth/facebook/callback`,
      // Request the `email` permission — passport-facebook does NOT ask for it by
      // default, so without this the Graph profile has no email and validate()
      // throws. Mirrors GoogleStrategy's scope.
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'displayName'],
      // Sign Graph API calls with appsecret_proof so a stolen user token cannot
      // be replayed without the app secret (Facebook-recommended hardening).
      enableProof: true,
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
      [profile.name?.givenName, profile.name?.familyName]
        .filter(Boolean)
        .join(' ') ||
      email;

    // SECURITY: passport-facebook does not expose a per-email verification
    // flag, so we cannot assert the provider verified ownership of this email.
    // We therefore treat Facebook emails as unverified: the identity can still
    // create a brand-new account or reuse its own prior link, but it can never
    // auto-unify into a pre-existing account by email match (takeover vector).
    return this.authenticateWithProvider.execute({
      provider: AuthProvider.Facebook,
      providerUserId: profile.id,
      email,
      name,
      emailVerified: false,
    });
  }
}
