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
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      // Next.js dev mode uses eval() for HMR / Fast Refresh; production uses static chunks
      ...(isDev ? ["'unsafe-eval'"] : []),
      'https://challenges.cloudflare.com',
      'https://telegram.org',
      'https://*.telegram.org',
    ].join(' ');
    const csp = [
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
      'upgrade-insecure-requests',
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: csp },
        ],
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
