import MarketingHero from '@/components/homepage/MarketingHero'
import HowItWorksRow from '@/components/homepage/HowItWorksRow'
import TrustStrip from '@/components/TrustStrip'
import SearchForm from '@/components/SearchForm'
import ExampleChips from '@/components/ExampleChips'
import FeaturedSection from '@/components/homepage/FeaturedSection'
import ExploreByTopic from '@/components/homepage/ExploreByTopic'
import RecentArticlesGrid from '@/components/RecentArticlesGrid'
import type { ArticleRow } from '@/types/article'

interface Props {
  featuredPool: ArticleRow[]
  trendingIdList: string[]
  all: ArticleRow[]
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
export default function MarketingHomepage({ featuredPool, trendingIdList, all, exampleSlug }: Props) {
  return (
    <>
      {/* Marketing hero with rotating preview + 2 CTAs */}
      <MarketingHero exampleSlug={exampleSlug} />

      {/* 3-step explainer */}
      <HowItWorksRow />

      {/* Trust signals */}
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
      {featuredPool.length > 0 && (
        <>
          <FeaturedSection
            pool={featuredPool}
            fallbackArticles={all.filter(a => !a.is_featured && !trendingIdList.includes(a.id)).slice(0, 10)}
          />
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
