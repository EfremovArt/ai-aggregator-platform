import { NextResponse, type NextRequest } from 'next/server';

/**
 * Routing rules:
 * - `/dashboard/*` and `/admin/*` require a session cookie. Anonymous visitors
 *   are redirected to `/login?next=<original>` so post-login the app can send
 *   them back to where they were trying to go (model card on the landing → chat).
 * - `/login`, `/register`, `/forgot-password` redirect authenticated users
 *   straight to `/dashboard` so they don't see the auth forms when already in.
 *
 * The cookie name matches `apps/api/src/modules/auth/auth.controller.ts`
 * (default `ai_session`, override via SESSION_COOKIE_NAME).
 */
const COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? 'ai_session';

const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has(COOKIE_NAME);

  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/register', '/forgot-password'],
};
