import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback, type Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'missing',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'missing',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost:4000/auth/google/callback',
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
