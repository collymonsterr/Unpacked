import type { Metadata } from 'next'
import { Sora, Outfit } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Unpacked — Type a question. Get a complete visual article.',
  description:
    'Researched from real sources. Written with a clear opinion. Ready in under two minutes.',
  metadataBase: new URL('https://unpacked.fyi'),
  openGraph: {
    title: 'Unpacked — Type a question. Get a complete visual article.',
    description: 'Researched from real sources. Written with a clear opinion. Ready in under two minutes.',
    url: 'https://unpacked.fyi',
    siteName: 'Unpacked',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Unpacked',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unpacked — Type a question. Get a complete visual article.',
    description: 'Researched from real sources. Written with a clear opinion. Ready in under two minutes.',
    images: ['/og-default.png'],
    site: '@unpacked_fyi',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192' },
      { url: '/android-chrome-512x512.png', sizes: '512x512' },
    ],
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${outfit.variable}`}>
      <body className="antialiased">
        <PostHogProvider>{children}</PostHogProvider>
        <GoogleAnalytics gaId="G-FQJWVZ1TNG" />
      </body>
    </html>
  )
}
