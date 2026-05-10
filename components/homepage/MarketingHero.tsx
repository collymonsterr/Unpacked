'use client'

import Link from 'next/link'
import ArticlePreviewCard from '@/components/about/ArticlePreviewCard'

interface Props {
  /** Slug of a featured article, used as the destination for "See an example" CTA */
  exampleSlug?: string
}

/**
 * MarketingHero — landing-page-style hero for anonymous visitors.
 *
 * Two-column layout: explanatory copy + two CTAs on the left, rotating
 * ArticlePreviewCard on the right. Stacks on mobile.
 *
 * "Try it now" scrolls to the in-flow search section (#search) and focuses
 * the input. "See an example" links to a real featured article.
 */
export default function MarketingHero({ exampleSlug }: Props) {
  function scrollToSearch(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    const target = document.getElementById('search')
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Focus the search input shortly after scroll begins
    setTimeout(() => {
      const input = target.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null
      input?.focus()
    }, 600)
  }

  const exampleHref = exampleSlug ? `/article/${exampleSlug}` : '/recent'

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce) { .anim-fade { animation: none !important; opacity: 1 !important; } }
      `}</style>
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 56px' }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] items-start" style={{ gap: '64px' }}>
          {/* Left column — copy + CTAs */}
          <div>
            {/* Eyebrow */}
            <p
              className="anim-fade"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: '#BA7517',
                textTransform: 'uppercase',
                marginBottom: '18px',
                animation: 'fadeUp 0.5s ease-out both',
              }}
            >
              Researched · Fact-checked · Yours
            </p>

            {/* H1 */}
            <h1
              className="anim-fade"
              style={{
                fontFamily: 'var(--font-sora)',
                fontSize: 'clamp(32px, 4.5vw, 48px)',
                fontWeight: 800,
                letterSpacing: '-1.2px',
                lineHeight: 1.05,
                marginBottom: '20px',
                color: '#1A1714',
                animation: 'fadeUp 0.5s ease-out 0.05s both',
              }}
            >
              A fully researched article<br />
              on <span style={{ color: '#BA7517' }}>anything</span> —<br />
              <span style={{ color: '#B0A89E' }}>in three minutes.</span>
            </h1>

            {/* Sub */}
            <p
              className="anim-fade"
              style={{
                fontSize: '17px',
                color: '#5A5249',
                lineHeight: 1.55,
                marginBottom: '32px',
                maxWidth: '520px',
                animation: 'fadeUp 0.5s ease-out 0.15s both',
              }}
            >
              Beautifully structured with images, charts, and real opinions from real people.
              Not a chatbot reply — a complete visual article you can share.
            </p>

            {/* CTAs */}
            <div
              className="anim-fade flex flex-wrap gap-3 items-center mb-8"
              style={{ animation: 'fadeUp 0.5s ease-out 0.25s both' }}
            >
              <button
                onClick={scrollToSearch}
                aria-label="Scroll to search and ask a question"
                style={{
                  backgroundColor: '#BA7517',
                  color: '#fff',
                  fontFamily: 'var(--font-sora)',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '14px 26px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(186,117,23,0.25)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(186,117,23,0.32)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(186,117,23,0.25)'
                }}
              >
                Try it now →
              </button>
              <Link
                href={exampleHref}
                style={{
                  color: '#1A1714',
                  fontFamily: 'var(--font-sora)',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '14px 22px',
                  borderRadius: '10px',
                  border: '1.5px solid #E8E2D9',
                  background: '#fff',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1A1714'
                  e.currentTarget.style.background = '#FAFAF8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E8E2D9'
                  e.currentTarget.style.background = '#fff'
                }}
              >
                See an example
              </Link>
            </div>

            {/* Reassurance line */}
            <p
              className="anim-fade"
              style={{
                fontSize: '13px',
                color: '#9E948A',
                animation: 'fadeUp 0.5s ease-out 0.35s both',
              }}
            >
              Free to try · No signup needed for your first article
            </p>
          </div>

          {/* Right column — rotating preview card */}
          <div
            className="anim-fade"
            style={{ animation: 'fadeUp 0.5s ease-out 0.3s both' }}
          >
            <ArticlePreviewCard />
          </div>
        </div>
      </section>
    </>
  )
}
