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
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
