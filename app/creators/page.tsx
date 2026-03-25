import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import Link from 'next/link'
import CreatorsCTA from './CreatorsCTA'

export const metadata = {
  title: 'For Creators — The Brief',
  description:
    'Turn your expertise into beautiful, shareable articles — and earn from every recommendation.',
}

export default function CreatorsPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
            Home
          </Link>
          <UserMenu />
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-20 pb-16 max-w-4xl mx-auto">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-5"
          style={{ color: 'var(--accent)' }}
        >
          For Creators
        </p>
        <h1
          className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-5"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Turn your expertise into beautiful, shareable articles —{' '}
          <span style={{ color: 'var(--accent)' }}>and earn from every recommendation.</span>
        </h1>
        <p
          className="text-base md:text-lg max-w-2xl leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          You know your niche. The Brief gives you the tools to create stunning, visual,
          opinionated articles in minutes. Share them with your audience. Earn from affiliate
          clicks. Build your reputation.
        </p>
      </section>

      {/* How it works — 3 steps */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-20">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-10 text-center"
          style={{ color: 'var(--accent)' }}
        >
          How it works
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              1
            </div>
            <h3
              className="text-base font-bold mb-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Create
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Type your topic. AI researches it, writes it, and builds a complete visual article —
              product cards, comparison charts, data visualisations, editorial photos. Then make it
              yours: swap images, refine sections, adjust the tone.
            </p>
          </div>

          {/* Step 2 */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              2
            </div>
            <h3
              className="text-base font-bold mb-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Share
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Every article gets a unique URL. Share it on LinkedIn, Twitter, Reddit, WhatsApp, in
              newsletters, on your blog. The link preview shows a rich card with the hero image and
              your verdict — designed to get clicks.
            </p>
          </div>

          {/* Step 3 */}
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-sm font-bold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              3
            </div>
            <h3
              className="text-base font-bold mb-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Earn
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Every product recommendation in your article contains affiliate links. When your
              readers click through and buy, you earn a share of the commission. The more you
              share, the more you earn.
            </p>
          </div>
        </div>
      </section>

      {/* Why creators love The Brief — 4 feature cards */}
      <section
        className="py-16"
        style={{ backgroundColor: 'var(--card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-10 text-center"
            style={{ color: 'var(--accent)' }}
          >
            Why creators love The Brief
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Looks like a magazine, not a chatbot"
              description="Product cards with real images, comparison tables, interactive charts, editorial design. Your article looks like it belongs in a premium publication."
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              }
            />
            <FeatureCard
              title="Opinionated by default"
              description={`No wishy-washy "it depends" answers. Every article picks a winner and says why. Your readers get a clear recommendation, not a fence-sitting overview.`}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              }
            />
            <FeatureCard
              title="Your name on it"
              description="Every article shows your name and profile. Build your reputation as the go-to expert in your niche. Your creator profile showcases all your work."
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />
            <FeatureCard
              title="Earn while you sleep"
              description="Once published, your articles keep earning. Every affiliate click generates revenue, whether the reader found it today or six months from now via Google."
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2
          className="text-2xl md:text-3xl font-extrabold mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Ready to start?
        </h2>
        <p
          className="text-sm mb-8 max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          Create your first article in under two minutes. No credit card, no setup, no catch.
        </p>
        <CreatorsCTA />
      </section>

      {/* Footer */}
      <footer
        className="py-8 text-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <Logo size="sm" />
      </footer>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--accent-light)' }}
      >
        {icon}
      </div>
      <h3
        className="text-sm font-bold mb-1.5"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </div>
  )
}
