import { Module } from '@nestjs/common';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';
import { ProviderFactory } from './providers/provider.factory';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { MistralProvider } from './providers/mistral.provider';
import { XaiProvider } from './providers/xai.provider';
import { QwenProvider } from './providers/qwen.provider';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { CostProtectionService } from './cost-protection.service';
import { TokenEstimatorService } from './token-estimator.service';
import { SemanticCacheService } from './semantic-cache.service';
import { UsageLedgerService } from './usage-ledger.service';
import { ModelRouterModule } from '../model-router/model-router.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ModerationModule } from '../moderation/moderation.module';
import { FreeTierModule } from '../free-tier/free-tier.module';

@Module({
  imports: [ModelRouterModule, ApiKeysModule, ModerationModule, FreeTierModule],
  controllers: [AiGatewayController],
  providers: [
    AiGatewayService,
    ProviderFactory,
    OpenAIProvider,
    AnthropicProvider,
    GoogleProvider,
    DeepSeekProvider,
    MistralProvider,
    XaiProvider,
    QwenProvider,
    ApiKeyAuthGuard,
    CostProtectionService,
    TokenEstimatorService,
    SemanticCacheService,
    UsageLedgerService,
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
