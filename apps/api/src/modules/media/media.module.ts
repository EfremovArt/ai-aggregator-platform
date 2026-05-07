import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { AuditModule } from '../audit/audit.module';
import { MediaController } from './media.controller';
import { AudioService } from './audio.service';
import { ImageGenerationService } from './image.service';
import { VideoService } from './video.service';
import { MediaBillingService } from './media-billing.service';

@Module({
  imports: [PrismaModule, BillingModule, AuditModule],
  controllers: [MediaController],
  providers: [AudioService, ImageGenerationService, VideoService, MediaBillingService],
  exports: [AudioService, ImageGenerationService, VideoService],
})
export class MediaModule {}
