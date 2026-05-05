import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { chatCompletionSchema } from '@ai-platform/shared';

import { ZodPipe } from '../../common/pipes/zod.pipe';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { AiGatewayService } from './ai-gateway.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { getClientIp, getCountry, getFingerprint, getUserAgent } from '../../common/utils/ip';
import { RateLimit } from '../anti-abuse/guards/rate-limit.guard';

@Controller('v1')
export class AiGatewayController {
  constructor(private readonly gateway: AiGatewayService) {}

  @Public() // Auth handled by ApiKeyAuthGuard
  @UseGuards(ApiKeyAuthGuard)
  @RateLimit({ windowSec: 60, limit: 120, by: 'apiKey' })
  @Post('chat/completions')
  async chat(
    @Body(new ZodPipe(chatCompletionSchema)) body: never,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request & { apiKey?: { id: string } },
    @Res() res: Response,
  ) {
    const ctx = {
      userId: user.id,
      apiKeyId: req.apiKey?.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      fingerprint: getFingerprint(req),
      country: getCountry(req),
    };
    if ((body as { stream?: boolean }).stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering for SSE
      res.flushHeaders();
      try {
        for await (const ev of this.gateway.chatStream(body, ctx)) {
          res.write(`event: ${ev.event}\n`);
          res.write(`data: ${ev.data}\n\n`);
        }
      } finally {
        res.end();
      }
      return;
    }
    const result = await this.gateway.chat(body, ctx);
    res.json(result);
  }
}
