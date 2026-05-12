import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback, type Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      // Use `||` (not `??`) so empty strings from .env fall back to the
      // placeholder. passport-oauth2 throws synchronously at construction
      // time if clientID/Secret is empty, which would crash Nest startup
      // even when OAuth is intentionally disabled in dev.
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'oauth-disabled',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'oauth-disabled',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:4000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    done(null, {
      provider: 'GOOGLE',
      id: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
