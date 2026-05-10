import HomepageHero from '@/components/HomepageHero'
import FeaturedSection from '@/components/homepage/FeaturedSection'
import TrendingSection from '@/components/homepage/TrendingSection'
import PopularSection from '@/components/homepage/PopularSection'
import RecentArticlesGrid from '@/components/RecentArticlesGrid'
import ExploreByTopic from '@/components/homepage/ExploreByTopic'
import TrustStrip from '@/components/TrustStrip'
import type { ArticleRow } from '@/types/article'

interface Props {
  featuredPool: ArticleRow[]
  trendingPool: ArticleRow[]
  trendingIdList: string[]
  popular: ArticleRow[]
  all: ArticleRow[]
}

/**
 * SearchHomepage — search-first homepage for signed-in / returning users.
 *
 * This is the original homepage layout, extracted unchanged. Power users
 * who already know the product land directly on the search hero rather
 * than scrolling past marketing content.
 */
export default function SearchHomepage({ featuredPool, trendingPool, trendingIdList, popular, all }: Props) {
  return (
    <>
      {/* Hero + feature cards (auth-conditional internally) */}
      <HomepageHero existingQueries={all.map(a => a.query)} />

      {/* Trust strip */}
      <div className="mb-10">
        <TrustStrip />
      </div>

      {/* Featured */}
      {featuredPool.length > 0 && (
        <>
          <FeaturedSection
            pool={featuredPool}
            fallbackArticles={all.filter(a => !a.is_featured && !trendingIdList.includes(a.id)).slice(0, 10)}
          />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* Trending Today */}
      {trendingPool.length > 0 && (
        <>
          <TrendingSection pool={trendingPool} />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* Most Popular */}
      {popular.length > 0 && (
        <>
          <PopularSection articles={popular} />
          <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />
        </>
      )}

      {/* Explore by Topic */}
      <ExploreByTopic />
      <div className="max-w-6xl mx-auto px-4 md:px-6 my-14" style={{ borderTop: '1px solid #e2e0d8' }} />

      {/* All Articles */}
      <RecentArticlesGrid articles={all} />
    </>
  )
}
