import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import passportGithub2 = require('passport-github2');

const GitHubBase = passportGithub2.Strategy;

@Injectable()
export class GitHubStrategy extends PassportStrategy(GitHubBase, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') ?? 'missing',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') ?? 'missing',
      callbackURL:
        config.get<string>('GITHUB_CALLBACK_URL') ?? 'http://localhost:4000/auth/github/callback',
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
