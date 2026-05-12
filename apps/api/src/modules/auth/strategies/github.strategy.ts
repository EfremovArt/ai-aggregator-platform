import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as GitHubBase } from 'passport-github2';

@Injectable()
export class GitHubStrategy extends PassportStrategy(GitHubBase, 'github') {
  constructor(config: ConfigService) {
    super({
      // Use `||` (not `??`) so empty strings from .env fall back to the
      // placeholder. passport-oauth2 throws synchronously at construction
      // time if clientID/Secret is empty.
      clientID: config.get<string>('GITHUB_CLIENT_ID') || 'oauth-disabled',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || 'oauth-disabled',
      callbackURL:
        config.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:4000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails?: { value: string }[]; displayName?: string; photos?: { value: string }[] },
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    done(null, {
      provider: 'GITHUB',
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
