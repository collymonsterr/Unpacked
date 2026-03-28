import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unpacked — How it works.',
  robots: { index: false, follow: false },
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
