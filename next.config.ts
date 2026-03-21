import type { NextConfig } from 'next'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Claude Code sets ANTHROPIC_API_KEY="" in the shell environment, which overrides .env.local.
// Load .env.local values for any keys that are empty in the shell env.
try {
  const envLocal = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
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
  // .env.local doesn't exist (e.g. in CI) — that's fine
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
