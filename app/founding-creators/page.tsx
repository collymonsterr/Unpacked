import type { Metadata } from 'next'
import FoundingCreatorsClient from './FoundingCreatorsClient'

export const metadata: Metadata = {
  title: 'Founding Creators — Unpacked',
  description: 'Join the first 100 creators shaping Unpacked from day one. Earn bonus credits, a permanent badge, and early access to new features.',
}

export default function FoundingCreatorsPage() {
  return <FoundingCreatorsClient />
}
