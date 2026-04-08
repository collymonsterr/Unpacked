import type { NextConfig } from 'next'

// Claude Code sets ANTHROPIC_API_KEY="" in the shell environment, which overrides .env.local.
// Only do this locally — Vercel has its own env var injection, and readFileSync
// in next.config.ts triggers a Turbopack NFT trace warning on every build.
if (!process.env.VERCEL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of envLocal.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) continue
      const key = line.substring(0, eqIdx)
      const val = line.substring(eqIdx + 1)
      if (!process.env[key] && val) {
        process.env[key] = val
      }
    }
  } catch {
    // .env.local doesn't exist — that's fine
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async headers() {
    // Baseline CSP — defense-in-depth for stored XSS in article content.
    // Notes:
    // - 'unsafe-inline' on script-src is required because Next.js inlines hydration data and JSON-LD.
    //   To tighten this to nonces would require a middleware-based nonce per request.
    // - Blocks: external scripts (attacker.com), <base> tag hijack, <form action=external>, <object>/<embed>.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.vercel-insights.com https://*.vercel-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https: wss:",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
