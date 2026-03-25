import type { Metadata } from 'next'
import { Sora, Outfit } from 'next/font/google'
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
  title: 'The Brief — Type a question. Get a complete visual article.',
  description:
    'Researched from real sources. Written with a clear opinion. Ready in under two minutes.',
  metadataBase: new URL('https://thebrief.fyi'),
  openGraph: {
    title: 'The Brief — Type a question. Get a complete visual article.',
    description: 'Researched from real sources. Written with a clear opinion. Ready in under two minutes.',
    url: 'https://thebrief.fyi',
    siteName: 'The Brief',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'The Brief',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Brief — Type a question. Get a complete visual article.',
    description: 'Researched from real sources. Written with a clear opinion. Ready in under two minutes.',
    images: ['/og-default.png'],
    site: '@articleai',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${outfit.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
