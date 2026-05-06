import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type VideoProvider = 'runway-gen3' | 'kling';

export type VideoGenerateRequest = {
  prompt?: string;
  provider?: VideoProvider;
  imageUrl?: string; // for image-to-video
  durationSeconds?: 5 | 10;
  aspectRatio?: '16:9' | '9:16' | '1:1';
};

export type VideoResult = {
  provider: VideoProvider;
  model: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  costUsd: number;
};

const RUNWAY_BASE = process.env.RUNWAY_API_BASE_URL ?? 'https://api.dev.runwayml.com/v1';

const PRICE_RUNWAY_PER_5S = 0.5; // approx
const PRICE_KLING_PER_5S = 0.35;

@Injectable()
export class VideoService {
  private readonly logger = new Logger('VideoService');

  isProviderConfigured(p: VideoProvider): boolean {
    if (p === 'runway-gen3') return !!process.env.RUNWAY_API_KEY;
    if (p === 'kling') return !!(process.env.KLING_API_KEY && process.env.KLING_API_BASE_URL);
    return false;
  }

  estimateCost(provider: VideoProvider, durationSeconds: number): number {
    const segments = Math.ceil(durationSeconds / 5);
    if (provider === 'runway-gen3') return segments * PRICE_RUNWAY_PER_5S;
    if (provider === 'kling') return segments * PRICE_KLING_PER_5S;
    return 0;
  }

  async generate(req: VideoGenerateRequest): Promise<VideoResult> {
    const provider = req.provider ?? 'runway-gen3';
    if (!this.isProviderConfigured(provider)) {
      throw new ServiceUnavailableException(`Video provider ${provider} не настроен — задайте API-ключ в env`);
    }
    if (!req.prompt?.trim() && !req.imageUrl) {
      throw new BadRequestException('Either prompt or imageUrl is required');
    }
    const duration = req.durationSeconds ?? 5;

    if (provider === 'runway-gen3') return this.generateRunway(req, duration);
    if (provider === 'kling') return this.generateKling(req, duration);
    throw new BadRequestException(`Unknown provider ${provider}`);
  }

  /**
   * Runway Gen-3 image-to-video.
   * Docs: https://docs.dev.runwayml.com/api/
   */
  private async generateRunway(req: VideoGenerateRequest, duration: number): Promise<VideoResult> {
    const endpoint = req.imageUrl ? '/image_to_video' : '/text_to_video';
    const body: Record<string, unknown> = {
      promptText: req.prompt,
      model: 'gen3a_turbo',
      duration,
      ratio: this.runwayRatio(req.aspectRatio ?? '16:9'),
    };
    if (req.imageUrl) body.promptImage = req.imageUrl;

    const res = await fetch(`${RUNWAY_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        'content-type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Runway error ${res.status}: ${text.slice(0, 200)}`);
      throw new ServiceUnavailableException(`Runway failed: ${res.status}`);
    }
    const json = (await res.json()) as { id: string };
    return {
      provider: 'runway-gen3',
      model: 'gen3a_turbo',
      jobId: json.id,
      status: 'queued',
      costUsd: this.estimateCost('runway-gen3', duration),
    };
  }

  /**
   * Kling — официальный API доступен через Kuaishou. Здесь — стаб с интерфейсом.
   * Configure:
   *   KLING_API_BASE_URL — e.g. https://api.klingai.com
   *   KLING_API_KEY      — ваш ключ
   */
  private async generateKling(req: VideoGenerateRequest, duration: number): Promise<VideoResult> {
    const base = process.env.KLING_API_BASE_URL!;
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/videos/text2video`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.KLING_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: req.prompt,
        image_url: req.imageUrl,
        duration,
        aspect_ratio: req.aspectRatio ?? '16:9',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Kling error ${res.status}: ${text.slice(0, 200)}`);
      throw new ServiceUnavailableException(`Kling failed: ${res.status}`);
    }
    const json = (await res.json()) as { task_id?: string; data?: { task_id?: string } };
    const jobId = json.task_id ?? json.data?.task_id ?? 'unknown';
    return {
      provider: 'kling',
      model: 'kling-v1',
      jobId,
      status: 'queued',
      costUsd: this.estimateCost('kling', duration),
    };
  }

  /**
   * Poll Runway job status. Use this from a cron/queue worker.
   */
  async getRunwayJob(jobId: string): Promise<VideoResult> {
    if (!process.env.RUNWAY_API_KEY) throw new ServiceUnavailableException('RUNWAY_API_KEY not set');
    const res = await fetch(`${RUNWAY_BASE}/tasks/${jobId}`, {
      headers: {
        authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    });
    if (!res.ok) throw new ServiceUnavailableException(`Runway poll failed: ${res.status}`);
    const json = (await res.json()) as {
      id: string;
      status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
      output?: string[];
    };
    const map: Record<string, VideoResult['status']> = {
      PENDING: 'queued',
      RUNNING: 'processing',
      SUCCEEDED: 'completed',
      FAILED: 'failed',
    };
    return {
      provider: 'runway-gen3',
      model: 'gen3a_turbo',
      jobId: json.id,
      status: map[json.status] ?? 'queued',
      videoUrl: json.output?.[0],
      costUsd: 0,
    };
  }

  private runwayRatio(ratio: string): string {
    if (ratio === '9:16') return '768:1280';
    if (ratio === '1:1') return '1024:1024';
    return '1280:768';
  }
}
