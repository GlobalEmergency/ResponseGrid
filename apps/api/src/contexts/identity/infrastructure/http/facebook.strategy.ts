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
      // Request `public_profile` + `email`. `public_profile` is always granted
      // and "supported", so it satisfies Facebook's "app needs at least one
      // supported permission" check; `email` is what we actually consume (the
      // Graph profile has no email without it, so validate() would throw).
      scope: ['public_profile', 'email'],
      profileFields: ['id', 'emails', 'name', 'displayName'],
      // Sign Graph API calls with appsecret_proof so a stolen user token cannot
      // be replayed without the app secret (Facebook-recommended hardening).
      enableProof: true,
      // Pin a current Graph API version: passport-facebook defaults to v3.2
      // (2018), long past Facebook's ~2-year support window, so /me is rejected.
      graphAPIVersion: 'v21.0',
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

    // Facebook's Graph API only returns an `email` the user has CONFIRMED on
    // their Facebook account (unconfirmed emails are never returned), so a
    // returned email is effectively provider-verified. We mark it verified to
    // allow auto-linking to an existing social-only account by email match.
    // Note: password-backed accounts are still protected — AuthenticateWithProvider
    // raises AccountLinkRequiresAuthError for those regardless of this flag.
    return this.authenticateWithProvider.execute({
      provider: AuthProvider.Facebook,
      providerUserId: profile.id,
      email,
      name,
      emailVerified: true,
    });
  }
}
