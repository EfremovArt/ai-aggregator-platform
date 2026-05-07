import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { AudioService } from './audio.service';
import { ImageGenerationService, type ImageProvider } from './image.service';
import { VideoService, type VideoProvider } from './video.service';
import { MediaBillingService } from './media-billing.service';

const TtsDto = z.object({
  text: z.string().trim().min(1).max(5000),
  voiceId: z.string().optional(),
  modelId: z.string().optional(),
  format: z.enum(['mp3', 'wav', 'pcm']).optional(),
});
type TtsDto = z.infer<typeof TtsDto>;

const SttDto = z.object({
  audioBase64: z.string().min(1),
  contentType: z.string().min(1),
  language: z.string().optional(),
  model: z.string().optional(),
});
type SttDto = z.infer<typeof SttDto>;

const ImageDto = z.object({
  prompt: z.string().trim().min(1).max(2000),
  provider: z.enum(['openai-dalle3', 'midjourney', 'stability-sd3']).optional(),
  size: z.enum(['512x512', '1024x1024', '1024x1792', '1792x1024']).optional(),
  n: z.number().int().min(1).max(4).optional(),
  negativePrompt: z.string().max(1000).optional(),
  seed: z.number().int().optional(),
});
type ImageDto = z.infer<typeof ImageDto>;

const VideoDto = z.object({
  prompt: z.string().trim().max(2000).optional(),
  provider: z.enum(['runway-gen3', 'kling']).optional(),
  imageUrl: z.string().url().optional(),
  durationSeconds: z.union([z.literal(5), z.literal(10)]).optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
});
type VideoDto = z.infer<typeof VideoDto>;

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly audio: AudioService,
    private readonly image: ImageGenerationService,
    private readonly video: VideoService,
    private readonly billing: MediaBillingService,
    private readonly audit: AuditService,
  ) {}

  @Post('tts')
  async tts(@Body(new ZodPipe(TtsDto)) dto: TtsDto, @CurrentUser() user: AuthenticatedUser) {
    const cost = this.audio.estimateTtsCostUsd(dto.text.length);
    await this.billing.assertCanSpend(user.id, cost);
    const out = await this.audio.tts(dto);
    await this.billing.chargeUser(user.id, 'tts', out.costUsd);
    await this.audit.log({
      userId: user.id,
      action: 'media.tts',
      metadata: { chars: out.characters, voiceId: out.voiceId, costUsd: out.costUsd },
    });
    return out;
  }

  @Post('stt')
  async stt(@Body(new ZodPipe(SttDto)) dto: SttDto, @CurrentUser() user: AuthenticatedUser) {
    // Pre-check $0.05 worth to avoid running through 25MB upload then failing
    await this.billing.assertCanSpend(user.id, 0.05);
    const out = await this.audio.stt(dto);
    await this.billing.chargeUser(user.id, 'stt', out.costUsd);
    await this.audit.log({
      userId: user.id,
      action: 'media.stt',
      metadata: { duration: out.durationSeconds, costUsd: out.costUsd },
    });
    return out;
  }

  @Post('image')
  async generateImage(
    @Body(new ZodPipe(ImageDto)) dto: ImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const provider: ImageProvider = dto.provider ?? 'openai-dalle3';
    const size = dto.size ?? '1024x1024';
    const n = dto.n ?? 1;
    const cost = this.image.estimateCost(provider, size, n);
    await this.billing.assertCanSpend(user.id, cost);
    const out = await this.image.generate(dto);
    await this.billing.chargeUser(user.id, 'image', out.costUsd, out.jobId);
    await this.audit.log({
      userId: user.id,
      action: 'media.image',
      metadata: { provider: out.provider, model: out.model, costUsd: out.costUsd },
    });
    return out;
  }

  @Post('video')
  async generateVideo(
    @Body(new ZodPipe(VideoDto)) dto: VideoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const provider: VideoProvider = dto.provider ?? 'runway-gen3';
    const duration = dto.durationSeconds ?? 5;
    const cost = this.video.estimateCost(provider, duration);
    await this.billing.assertCanSpend(user.id, cost);
    const out = await this.video.generate(dto);
    await this.billing.chargeUser(user.id, 'video', out.costUsd, out.jobId);
    await this.audit.log({
      userId: user.id,
      action: 'media.video',
      metadata: { provider: out.provider, jobId: out.jobId, costUsd: out.costUsd },
    });
    return out;
  }

  @Get('video/runway/:jobId')
  pollRunway(@Param('jobId') jobId: string) {
    return this.video.getRunwayJob(jobId);
  }
}
