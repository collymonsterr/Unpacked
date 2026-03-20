import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Allow images from any external domain (product images via Google Image Search)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
