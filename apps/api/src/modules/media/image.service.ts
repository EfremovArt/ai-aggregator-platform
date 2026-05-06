import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type ImageProvider = 'openai-dalle3' | 'midjourney' | 'stability-sd3';

export type ImageGenerateRequest = {
  prompt: string;
  provider?: ImageProvider;
  size?: '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  n?: number;
  negativePrompt?: string;
  seed?: number;
};

export type ImageResult = {
  provider: ImageProvider;
  model: string;
  images: { url?: string; b64?: string }[];
  costUsd: number;
  jobId?: string; // for async (Midjourney)
  status?: 'completed' | 'pending';
};

const OPENAI_BASE = 'https://api.openai.com/v1';
const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image/generate';

const PRICE_DALLE3_USD_PER_IMAGE: Record<string, number> = {
  '1024x1024': 0.04,
  '1024x1792': 0.08,
  '1792x1024': 0.08,
  '512x512': 0.02,
};
const PRICE_MIDJOURNEY_USD_PER_IMAGE = 0.08;
const PRICE_SD3_USD_PER_IMAGE = 0.035;

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger('ImageGenerationService');

  isProviderConfigured(p: ImageProvider): boolean {
    if (p === 'openai-dalle3') return !!process.env.OPENAI_API_KEY;
    if (p === 'midjourney')
      return !!(process.env.MIDJOURNEY_API_KEY && process.env.MIDJOURNEY_API_BASE_URL);
    if (p === 'stability-sd3') return !!process.env.STABILITY_API_KEY;
    return false;
  }

  estimateCost(provider: ImageProvider, size: string, n: number): number {
    if (provider === 'openai-dalle3') {
      const per = PRICE_DALLE3_USD_PER_IMAGE[size] ?? PRICE_DALLE3_USD_PER_IMAGE['1024x1024'] ?? 0.04;
      return per * n;
    }
    if (provider === 'midjourney') return PRICE_MIDJOURNEY_USD_PER_IMAGE * n;
    if (provider === 'stability-sd3') return PRICE_SD3_USD_PER_IMAGE * n;
    return 0;
  }

  async generate(req: ImageGenerateRequest): Promise<ImageResult> {
    const provider = req.provider ?? 'openai-dalle3';
    if (!this.isProviderConfigured(provider)) {
      throw new ServiceUnavailableException(`Image provider ${provider} не настроен — задайте API-ключ в env`);
    }
    if (!req.prompt?.trim()) throw new BadRequestException('prompt is required');
    const n = Math.max(1, Math.min(4, req.n ?? 1));
    const size = req.size ?? '1024x1024';

    if (provider === 'openai-dalle3') return this.generateDalle3(req, size, n);
    if (provider === 'midjourney') return this.generateMidjourney(req, n);
    if (provider === 'stability-sd3') return this.generateStability(req, size, n);
    throw new BadRequestException(`Unknown provider ${provider}`);
  }

  private async generateDalle3(
    req: ImageGenerateRequest,
    size: string,
    n: number,
  ): Promise<ImageResult> {
    const res = await fetch(`${OPENAI_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: req.prompt,
        size,
        n,
        quality: 'standard',
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`DALL-E 3 error ${res.status}: ${body.slice(0, 200)}`);
      throw new ServiceUnavailableException(`DALL-E failed: ${res.status}`);
    }
    const json = (await res.json()) as { data: { url?: string; b64_json?: string }[] };
    return {
      provider: 'openai-dalle3',
      model: 'dall-e-3',
      images: json.data.map((d) => ({ url: d.url, b64: d.b64_json })),
      costUsd: this.estimateCost('openai-dalle3', size, n),
      status: 'completed',
    };
  }

  /**
   * Midjourney has no official API — wrap a 3rd-party provider that exposes
   * an HTTP endpoint (e.g., GoAPI, ImagineAPI, Useapi.net).
   * Configure:
   *   MIDJOURNEY_API_BASE_URL — e.g. https://api.goapi.ai/mj/v2
   *   MIDJOURNEY_API_KEY     — your provider key
   */
  private async generateMidjourney(req: ImageGenerateRequest, n: number): Promise<ImageResult> {
    const base = process.env.MIDJOURNEY_API_BASE_URL!;
    const res = await fetch(`${base.replace(/\/$/, '')}/imagine`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.MIDJOURNEY_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: req.prompt,
        process_mode: 'fast',
        webhook_endpoint: process.env.MIDJOURNEY_WEBHOOK_URL,
        webhook_secret: process.env.MIDJOURNEY_WEBHOOK_SECRET,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Midjourney error ${res.status}: ${body.slice(0, 200)}`);
      throw new ServiceUnavailableException(`Midjourney failed: ${res.status}`);
    }
    const json = (await res.json()) as { task_id?: string; data?: { task_id?: string } };
    const jobId = json.task_id ?? json.data?.task_id;
    return {
      provider: 'midjourney',
      model: 'midjourney/v6',
      images: [],
      costUsd: this.estimateCost('midjourney', '1024x1024', n),
      jobId,
      status: 'pending',
    };
  }

  /**
   * Stability AI — Stable Diffusion 3.
   * Docs: https://platform.stability.ai/docs/api-reference#tag/Generate
   */
  private async generateStability(
    req: ImageGenerateRequest,
    size: string,
    n: number,
  ): Promise<ImageResult> {
    const form = new FormData();
    form.append('prompt', req.prompt);
    if (req.negativePrompt) form.append('negative_prompt', req.negativePrompt);
    if (req.seed != null) form.append('seed', String(req.seed));
    form.append('output_format', 'png');
    form.append('aspect_ratio', this.aspectRatioFromSize(size));

    const res = await fetch(`${STABILITY_BASE}/sd3`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        accept: 'application/json',
      },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Stability error ${res.status}: ${body.slice(0, 200)}`);
      throw new ServiceUnavailableException(`Stability failed: ${res.status}`);
    }
    const json = (await res.json()) as { image?: string };
    return {
      provider: 'stability-sd3',
      model: 'sd3',
      images: json.image ? [{ b64: json.image }] : [],
      costUsd: this.estimateCost('stability-sd3', size, n),
      status: 'completed',
    };
  }

  private aspectRatioFromSize(size: string): string {
    const [w, h] = size.split('x').map((v) => parseInt(v, 10));
    if (!w || !h) return '1:1';
    if (w === h) return '1:1';
    if (w > h) return '16:9';
    return '9:16';
  }
}
