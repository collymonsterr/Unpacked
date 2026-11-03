import MarketingHero from '@/components/homepage/MarketingHero'
import HowItWorksRow from '@/components/homepage/HowItWorksRow'
import FeaturesGrid from '@/components/homepage/FeaturesGrid'
import EditorialControlRow from '@/components/homepage/EditorialControlRow'
import QuoteBreaker from '@/components/homepage/QuoteBreaker'
import TrustStrip from '@/components/TrustStrip'
import SearchForm from '@/components/SearchForm'
import ExampleChips from '@/components/ExampleChips'
import FeaturedSection from '@/components/homepage/FeaturedSection'
import ExploreByTopic from '@/components/homepage/ExploreByTopic'
import RecentArticlesGrid from '@/components/RecentArticlesGrid'
import type { ArticleCardData } from '@/lib/article-card'
import type { FeaturedSelection } from '@/lib/featured-rotation'

interface Props {
  featured: FeaturedSelection
  all: ArticleCardData[]
  exampleSlug?: string
}

/**
 * MarketingHomepage — landing-page flow for anonymous visitors.
 *
 * Flow: marketing hero → 3-step explainer → trust strip → in-flow search →
 * featured articles → categories → recent. The intent is that a cold
 * visitor can read down the page, understand what Unpacked is, and THEN
 * choose to ask a question or browse categories — without being asked to
 * engage immediately.
 *
 * Trending and Popular sections are intentionally omitted from the marketing
 * version — they're activity signals primarily useful to repeat visitors.
 */
export default function MarketingHomepage({ featured, all, exampleSlug }: Props) {
  return (
    <>
      {/* Marketing hero with rotating preview + 2 CTAs */}
      <MarketingHero exampleSlug={exampleSlug} />

      {/* 3-step explainer (process) */}
      <HowItWorksRow />

      {/* Breaker 1 — opinion quote linking to /about (the philosophy) */}
      <QuoteBreaker
        quote="We&rsquo;re not building an AI tool. We&rsquo;re building the publishing platform AI made possible."
        href="/about"
        ctaLabel="Read the full story"
      />

      {/* Output quality features (6-card grid) */}
      <FeaturesGrid />

      {/* Editorial control / publishing pitch (3-card row, dark background) */}
      <EditorialControlRow />

      {/* Breaker 2 — opinion quote linking to /how-it-works (the pipeline) */}
      <QuoteBreaker
        quote="Eight stages. Five AI models. Three independent fact-checks. One article you can put your name on."
        href="/how-it-works"
        ctaLabel="See how the pipeline works"
      />

      {/* Trust signals — thin transition strip reinforcing the themes above */}
      <div className="my-10">
        <TrustStrip />
      </div>

      {/* In-flow search section — the "Try it now" CTA destination */}
      <section
        id="search"
        className="max-w-3xl mx-auto px-4 md:px-6 py-16 text-center"
        style={{ scrollMarginTop: '24px' }}
      >
        <h2
          className="text-2xl md:text-3xl font-bold mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}
        >
          Ask any question.
        </h2>
        <p
          className="text-base mb-8"
          style={{ color: '#6B6B6B' }}
        >
          Researched, written, and ready in under three minutes.
        </p>
        <SearchForm autoFocus={false} />
        <ExampleChips existingQueries={all.map(a => a.query)} />
      </section>

      {/* Featured articles — proof the product works */}
      {featured.hero && (
        <>
          <FeaturedSection hero={featured.hero} small={featured.small} />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* Browse by category */}
      <ExploreByTopic />
      <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />

      {/* Recent articles */}
      <RecentArticlesGrid articles={all} />
    </>
  )
}
