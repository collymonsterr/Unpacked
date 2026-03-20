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
  title: 'ArticleAI — Ask anything. Get the article, not the answer.',
  description:
    'Type a query and get a fully structured, opinionated article written like a senior product journalist.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${outfit.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
