/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 't.me' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    // `Strict-Transport-Security` and CSP's `upgrade-insecure-requests` tell
    // browsers to force every subsequent request to this host onto HTTPS.
    // That's only safe when the deployment actually speaks HTTPS — emitting
    // these on a plain-http deploy (e.g. `docker compose up` against
    // http://localhost) bricks the site on the user's second visit: Chrome
    // caches the HSTS pin and then auto-upgrades http://localhost/* to
    // https://localhost/* which times out because nothing listens on 443.
    //
    // `headers()` is evaluated by Next at build time, so we look at
    // NEXT_PUBLIC_APP_URL — the only APP-URL variant that gets baked into
    // the build (via docker build-args or .env at build time). For local
    // dev / docker-compose the build doesn't pass any URL, so this stays
    // empty and HSTS is suppressed; production builds set
    // NEXT_PUBLIC_APP_URL=https://… and HSTS turns on automatically.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const isHttps = appUrl.startsWith('https://');
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      // Next.js dev mode uses eval() for HMR / Fast Refresh; production uses static chunks
      ...(isDev ? ["'unsafe-eval'"] : []),
      'https://challenges.cloudflare.com',
      'https://telegram.org',
      'https://*.telegram.org',
    ].join(' ');
    const cspDirectives = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      // Allow same-origin + any https/wss endpoint. In dev/docker-compose the
      // api is exposed on http://localhost:4000 (a separate origin from the
      // web on :3000 / nginx on :80), so we also whitelist localhost over http
      // for any port. Keep the production deploy on HTTPS behind nginx and
      // these extra entries are simply no-ops.
      "connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:*",
      "frame-src https://challenges.cloudflare.com https://oauth.telegram.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    if (isHttps) {
      cspDirectives.push('upgrade-insecure-requests');
    }
    const csp = cspDirectives.join('; ');
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Content-Security-Policy', value: csp },
    ];
    if (isHttps) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
