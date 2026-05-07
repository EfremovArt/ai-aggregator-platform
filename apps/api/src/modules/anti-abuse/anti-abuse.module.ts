import { Global, Module } from '@nestjs/common';
import { AntiAbuseService } from './anti-abuse.service';
import { TurnstileService } from './turnstile.service';
import { IpReputationService } from './ip-reputation.service';
import { DisposableEmailService } from './disposable-email.service';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Global()
@Module({
  providers: [
    AntiAbuseService,
    TurnstileService,
    IpReputationService,
    DisposableEmailService,
    RateLimitService,
    RateLimitGuard,
  ],
  exports: [
    AntiAbuseService,
    TurnstileService,
    IpReputationService,
    DisposableEmailService,
    RateLimitService,
    RateLimitGuard,
  ],
})
export class AntiAbuseModule {}
