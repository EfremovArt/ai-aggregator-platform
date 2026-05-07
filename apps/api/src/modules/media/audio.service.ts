import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type TtsRequest = {
  text: string;
  voiceId?: string;
  modelId?: string;
  format?: 'mp3' | 'wav' | 'pcm';
};

export type TtsResponse = {
  provider: 'elevenlabs';
  voiceId: string;
  modelId: string;
  audioBase64: string;
  contentType: string;
  characters: number;
  costUsd: number;
};

export type SttRequest = {
  audioBase64: string;
  contentType: string;
  language?: string;
  model?: string;
};

export type SttResponse = {
  provider: 'openai-whisper';
  model: string;
  text: string;
  durationSeconds?: number;
  costUsd: number;
};

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const OPENAI_BASE = 'https://api.openai.com/v1';

const TTS_USD_PER_1K_CHARS = 0.18; // ~ ElevenLabs 'multilingual v2' pricing
const STT_USD_PER_MINUTE = 0.006; // OpenAI Whisper

@Injectable()
export class AudioService {
  private readonly logger = new Logger('AudioService');

  isTtsConfigured(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
  }
  isSttConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  estimateTtsCostUsd(textLength: number): number {
    return (textLength / 1000) * TTS_USD_PER_1K_CHARS;
  }
  estimateSttCostUsd(seconds: number): number {
    return (seconds / 60) * STT_USD_PER_MINUTE;
  }

  /**
   * ElevenLabs Text-to-Speech.
   * Docs: https://elevenlabs.io/docs/api-reference/text-to-speech
   */
  async tts(req: TtsRequest): Promise<TtsResponse> {
    if (!this.isTtsConfigured()) {
      throw new ServiceUnavailableException(
        'ELEVENLABS_API_KEY не задан. Задайте переменную окружения для активации TTS.',
      );
    }
    const text = req.text?.trim();
    if (!text) throw new BadRequestException('text is required');
    if (text.length > 5000) throw new BadRequestException('text слишком длинный (≤5000 символов)');

    const voiceId = req.voiceId ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
    const modelId = req.modelId ?? 'eleven_multilingual_v2';
    const format = req.format ?? 'mp3';

    const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'content-type': 'application/json',
        accept: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        output_format: format === 'wav' ? 'pcm_44100' : 'mp3_44100_128',
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`ElevenLabs TTS error ${res.status}: ${body.slice(0, 200)}`);
      throw new ServiceUnavailableException(`ElevenLabs TTS failed: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      provider: 'elevenlabs',
      voiceId,
      modelId,
      audioBase64: buf.toString('base64'),
      contentType: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      characters: text.length,
      costUsd: this.estimateTtsCostUsd(text.length),
    };
  }

  /**
   * OpenAI Whisper Speech-to-Text.
   * Docs: https://platform.openai.com/docs/api-reference/audio/createTranscription
   */
  async stt(req: SttRequest): Promise<SttResponse> {
    if (!this.isSttConfigured()) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY не задан. Задайте переменную окружения для активации STT.',
      );
    }
    if (!req.audioBase64) throw new BadRequestException('audioBase64 is required');
    const buf = Buffer.from(req.audioBase64, 'base64');
    if (buf.byteLength === 0) throw new BadRequestException('audio is empty');
    if (buf.byteLength > 25 * 1024 * 1024) {
      throw new BadRequestException('audio слишком большой (>25 МБ)');
    }
    const filename = req.contentType?.includes('wav') ? 'audio.wav' : 'audio.mp3';
    const blob = new Blob([buf], { type: req.contentType || 'audio/mpeg' });
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('model', req.model ?? 'whisper-1');
    if (req.language) form.append('language', req.language);

    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Whisper STT error ${res.status}: ${body.slice(0, 200)}`);
      throw new ServiceUnavailableException(`Whisper STT failed: ${res.status}`);
    }
    const json = (await res.json()) as { text?: string; duration?: number };
    const text = json.text ?? '';
    const duration = json.duration;
    return {
      provider: 'openai-whisper',
      model: req.model ?? 'whisper-1',
      text,
      durationSeconds: duration,
      costUsd: this.estimateSttCostUsd(duration ?? Math.max(1, buf.byteLength / 16000)),
    };
  }
}
