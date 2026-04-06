import type { Metadata } from 'next'
import Navbar from '@/components/ui/Navbar'
import Footer from '@/components/ui/Footer'
import PricingCards from '@/components/PricingCards'

export const metadata: Metadata = {
  title: 'Pricing — Unpacked',
  description: 'Choose the plan that fits your research needs. Every plan gets full-quality, triple-verified articles.',
}

export default function PricingPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar showSearch={false} />

      <section className="max-w-5xl mx-auto px-4 md:px-6 pt-16 pb-20">
        {/* Header */}
        <div className="text-center mb-14">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Plans that grow with you
          </h1>
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Every article is researched from real sources, written with a clear opinion, and independently verified. No compromises on any plan.
          </p>
        </div>

        <PricingCards />

        {/* Bottom note */}
        <div className="text-center mt-16">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            All plans include triple-verified fact-checking, all 10 article types, and full image and chart support.
            <br />
            Cancel anytime. No long-term commitment.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
