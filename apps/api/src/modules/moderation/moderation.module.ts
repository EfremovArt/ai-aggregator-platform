import { Global, Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { KeywordModerationService } from './keyword-moderation.service';

@Global()
@Module({
  providers: [ModerationService, KeywordModerationService],
  exports: [ModerationService, KeywordModerationService],
})
export class ModerationModule {}
