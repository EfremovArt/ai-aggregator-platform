import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

import {
  registerSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@ai-platform/shared';

import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { getClientIp, getCountry, getFingerprint, getUserAgent } from '../../common/utils/ip';
import { TelegramAuthService, type TelegramLoginPayload } from './services/telegram-auth.service';
import { EmailVerificationService } from './services/email-verification.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly telegram: TelegramAuthService,
    private readonly verification: EmailVerificationService,
  ) {}

  private contextFromReq(req: Request) {
    return {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      fingerprint: getFingerprint(req),
      country: getCountry(req),
    };
  }

  private setSessionCookie(res: Response, token: string, ttlSeconds: number) {
    const name = process.env.SESSION_COOKIE_NAME ?? 'ai_session';
    res.cookie(name, token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN ?? undefined,
      maxAge: ttlSeconds * 1000,
      path: '/',
    });
  }

  private setRefreshCookie(res: Response, token: string, ttlSeconds: number) {
    res.cookie('ai_refresh', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN ?? undefined,
      maxAge: ttlSeconds * 1000,
      path: '/api/auth',
    });
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodPipe(registerSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(body as never, this.contextFromReq(req));
    this.setSessionCookie(res, result.accessToken, result.accessTokenExpiresIn);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresIn);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodPipe(loginSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body as never, this.contextFromReq(req));
    this.setSessionCookie(res, result.accessToken, result.accessTokenExpiresIn);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresIn);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh =
      (req as unknown as { cookies?: Record<string, string> }).cookies?.ai_refresh ??
      (req.body as { refreshToken?: string })?.refreshToken;
    if (!refresh) {
      return { ok: false };
    }
    const result = await this.auth.refresh(refresh, this.contextFromReq(req));
    this.setSessionCookie(res, result.accessToken, result.accessTokenExpiresIn);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresIn);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh = (req as unknown as { cookies?: Record<string, string> }).cookies?.ai_refresh;
    await this.auth.logout(user.id, refresh);
    res.clearCookie(process.env.SESSION_COOKIE_NAME ?? 'ai_session', { path: '/' });
    res.clearCookie('ai_refresh', { path: '/api/auth' });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body(new ZodPipe(verifyEmailSchema)) body: { token: string }) {
    await this.verification.confirm(body.token);
    return { ok: true };
  }

  @Public()
  @Post('password/forgot')
  async forgotPassword(@Body(new ZodPipe(requestPasswordResetSchema)) _body: unknown) {
    // Always return ok to avoid email enumeration. Implementation: enqueue email.
    return { ok: true };
  }

  @Public()
  @Post('password/reset')
  async resetPassword(@Body(new ZodPipe(resetPasswordSchema)) _body: unknown) {
    return { ok: true };
  }

  // ---- OAuth: Google -----------------------------------------------------
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    /* passport handles redirect */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const profile = (req as unknown as { user: { id: string; email?: string; name?: string; avatarUrl?: string } }).user;
    const result = await this.auth.oauthUpsert('GOOGLE', profile, this.contextFromReq(req));
    this.setSessionCookie(res, result.accessToken, result.accessTokenExpiresIn);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresIn);
    res.redirect(`${process.env.APP_URL ?? 'http://localhost:3000'}/dashboard`);
  }

  // ---- OAuth: GitHub -----------------------------------------------------
  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  github() {
    /* passport handles redirect */
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const profile = (req as unknown as { user: { id: string; email?: string; name?: string; avatarUrl?: string } }).user;
    const result = await this.auth.oauthUpsert('GITHUB', profile, this.contextFromReq(req));
    this.setSessionCookie(res, result.accessToken, result.accessTokenExpiresIn);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresIn);
    res.redirect(`${process.env.APP_URL ?? 'http://localhost:3000'}/dashboard`);
  }

  // ---- Telegram Login Widget --------------------------------------------
  @Public()
  @Post('telegram')
  async telegramLogin(
    @Body() payload: TelegramLoginPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = this.telegram.verify(payload);
    const result = await this.auth.oauthUpsert('TELEGRAM', profile, this.contextFromReq(req));
    this.setSessionCookie(res, result.accessToken, result.accessTokenExpiresIn);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresIn);
    return result;
  }
}
