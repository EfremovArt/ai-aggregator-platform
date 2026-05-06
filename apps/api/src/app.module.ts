import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { configValidationSchema } from './config/env.validation';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AntiAbuseModule } from './modules/anti-abuse/anti-abuse.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { ModelsModule } from './modules/models/models.module';
import { ModelRouterModule } from './modules/model-router/model-router.module';
import { BlogModule } from './modules/blog/blog.module';
import { AssistantsModule } from './modules/assistants/assistants.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { FreeTierModule } from './modules/free-tier/free-tier.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: configValidationSchema,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60_000, limit: 120 },
      { name: 'long', ttl: 3_600_000, limit: 5000 },
    ]),
    PrismaModule,
    RedisModule,
    AuditModule,
    AntiAbuseModule,
    AuthModule,
    UsersModule,
    ApiKeysModule,
    ModelsModule,
    ModelRouterModule,
    AiGatewayModule,
    ModerationModule,
    BillingModule,
    AdminModule,
    BlogModule,
    AssistantsModule,
    CouponsModule,
    ReferralsModule,
    FreeTierModule,
    MediaModule,
    HealthModule,
  ],
})
export class AppModule {}
