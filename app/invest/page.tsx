import type { Metadata } from 'next'
import InvestDeck from './InvestDeck'

export const metadata: Metadata = {
  title: 'Unpacked — Investor Deck',
  description: 'Powered by Gemini. Real articles, built in minutes.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Unpacked — Investor Deck',
    description: 'Powered by Gemini. Real articles, built in minutes.',
    url: 'https://unpacked.fyi/invest',
    siteName: 'Unpacked',
    type: 'website',
  },
}

export default function InvestPage() {
  return <InvestDeck />
}
