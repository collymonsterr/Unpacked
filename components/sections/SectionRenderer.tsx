import type { ArticleSection, ArticleContent } from '@/types/article'
import ProductCard from './ProductCard'
import ComparisonTable from './ComparisonTable'
import WarningBox from './WarningBox'
import ContentSection from './ContentSection'
import PriceTierBreakdown from './PriceTierBreakdown'
import CommunityInsights from './CommunityInsights'
import Sources from './Sources'
import FurtherReading from './FurtherReading'
import HeadToHead from './HeadToHead'
import WhoThisIsFor from './WhoThisIsFor'
import BarChartSection from './BarChartSection'
import ComparisonMatrix from './ComparisonMatrix'
import PieChartSection from './PieChartSection'
import LineChartSection from './LineChartSection'
import StatCards from './StatCards'
import TreemapSection from './TreemapSection'
import TimelineSection from './TimelineSection'
import ImageSection from './ImageSection'
import InteractiveCalculator from './InteractiveCalculator'

interface Props {
  sections: ArticleSection[]
  animated?: boolean
  isAdmin?: boolean
  articleId?: string
  currentSlug?: string
  linkableArticles?: Array<{ title: string; slug: string }>
  onReplaceImage?: (sectionIndex: number, imageIndex: number) => Promise<void>
  onSetPrimaryImage?: (sectionIndex: number, imageIndex: number) => Promise<void>
  onArticleUpdated?: (article: ArticleContent) => void
}

// Recharts-based sections break when rendered inside opacity:0 containers
// because ResizeObserver may report zero dimensions for invisible elements.
// These types get a simpler fade (no initial opacity:0).
const RECHARTS_TYPES = new Set([
  'bar_chart',
  'line_chart',
  'pie_chart',
  'treemap',
  'interactive_calculator',
])

export default function SectionRenderer({
  sections,
  animated = false,
  isAdmin,
  articleId,
  currentSlug,
  linkableArticles,
  onReplaceImage,
  onSetPrimaryImage,
  onArticleUpdated,
}: Props) {
  return (
    <>
      {sections.map((section, i) => {
        const isRechartsSection = RECHARTS_TYPES.has(section.type)

        // For Recharts sections: use animation delay but start at full opacity
        // so ResponsiveContainer can measure the container correctly.
        // For all others: standard fade-in-up from opacity:0.
        const style = animated
          ? isRechartsSection
            ? { animationDelay: `${i * 60}ms` }
            : { animationDelay: `${i * 60}ms`, opacity: 0 }
          : undefined
        const className = animated
          ? isRechartsSection
            ? 'fade-in-up-chart'
            : 'fade-in-up'
          : ''

        const inner = (() => {
          switch (section.type) {
            case 'product_card':
              return (
                <ProductCard
                  section={section}
                  isAdmin={isAdmin}
                  sectionIndex={i}
                  articleId={articleId}
                  onReplaceImage={onReplaceImage ? (imgIdx) => onReplaceImage(i, imgIdx) : undefined}
                  onSetPrimaryImage={onSetPrimaryImage ? (imgIdx) => onSetPrimaryImage(i, imgIdx) : undefined}
                  onArticleUpdated={onArticleUpdated}
                />
              )
            case 'comparison_table':
              return <ComparisonTable section={section} />
            case 'warning_box':
              return <WarningBox section={section} />
            case 'content_section':
              return <ContentSection section={section} currentSlug={currentSlug} relatedArticles={linkableArticles} />
            case 'price_tier_breakdown':
              return <PriceTierBreakdown section={section} />
            case 'community_insights':
              return <CommunityInsights section={section} />
            case 'sources':
              return <Sources section={section} />
            case 'further_reading':
              return <FurtherReading section={section} />
            case 'head_to_head':
              return <HeadToHead section={section} />
            case 'who_this_is_for':
              return <WhoThisIsFor section={section} />
            case 'bar_chart':
              return <BarChartSection section={section} />
            case 'comparison_matrix':
              return <ComparisonMatrix section={section} />
            case 'pie_chart':
              return <PieChartSection section={section} />
            case 'line_chart':
              return <LineChartSection section={section} />
            case 'stat_cards':
              return <StatCards section={section} />
            case 'treemap':
              return <TreemapSection section={section} />
            case 'timeline':
              return <TimelineSection section={section} />
            case 'image_section':
              return (
                <ImageSection
                  section={section}
                  isAdmin={isAdmin}
                  sectionIndex={i}
                  onReplaceImage={onReplaceImage ? (imgIdx) => onReplaceImage(i, imgIdx) : undefined}
                />
              )
            case 'interactive_calculator':
              return <InteractiveCalculator section={section} />
            default:
              return null
          }
        })()

        if (!inner) return null

        return (
          <div key={i} id={`section-${i}`} className={className} style={style}>
            {inner}
          </div>
        )
      })}
    </>
  )
}
