import { useState, useCallback } from 'react'
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
import LiveDataCard from './LiveDataCard'
import BigStatement from './BigStatement'
import RankedItemSection from './RankedItemSection'
import MythRealitySection from './MythRealitySection'
import TwitterSentimentSection from './TwitterSentimentSection'
import RedditSentimentSection from './RedditSentimentSection'
import InteractiveComponentSection from '../interactive/InteractiveComponentSection'
import SectionToolbar from './SectionToolbar'
import type { TwitterFinding, TwitterSentimentSplit, RedditThread, RedditSentimentSplit, InteractiveComponentData } from '@/types/article'

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
  twitterFindings?: TwitterFinding[]
  twitterSummary?: string | null
  twitterSentimentSplit?: TwitterSentimentSplit
  twitterContextTrigger?: string
  twitterPostsAnalysed?: number
  isOwner?: boolean
  onTwitterUpdated?: (next: { findings: TwitterFinding[]; summary: string | null }) => void
  redditThreads?: RedditThread[]
  redditSentimentSplit?: RedditSentimentSplit | null
  redditContextTrigger?: string | null
  redditThreadsAnalysed?: number
  onRedditUpdated?: (next: RedditThread[]) => void
  interactiveComponent?: InteractiveComponentData | null
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

/**
 * Check if a live_data_card section is specifically a Polymarket card.
 */
function isPolymarketCard(section: ArticleSection): boolean {
  return section.type === 'live_data_card' && (section as { data_source?: string }).data_source === 'polymarket'
}

/**
 * Check if a live_data_card is a chart-type card (Yahoo Finance or Google Trends).
 * These are grouped side-by-side in a 2-column grid when consecutive.
 */
function isChartDataCard(section: ArticleSection): boolean {
  if (section.type !== 'live_data_card') return false
  const ds = (section as { data_source?: string }).data_source
  return ds === 'yahoo_finance' || ds === 'google_trends'
}

// Section types that should NOT get the edit/remove toolbar
const NO_TOOLBAR_TYPES = new Set(['sources', 'further_reading'])

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
  twitterFindings,
  twitterSummary,
  twitterSentimentSplit,
  twitterContextTrigger,
  twitterPostsAnalysed,
  isOwner,
  onTwitterUpdated,
  redditThreads,
  redditSentimentSplit,
  redditContextTrigger,
  redditThreadsAnalysed,
  onRedditUpdated,
  interactiveComponent,
}: Props) {
  const [removingSection, setRemovingSection] = useState<number | null>(null)
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [replacingSection, setReplacingSection] = useState<number | null>(null)
  const [updatedSection, setUpdatedSection] = useState<number | null>(null)
  const [updatedFading, setUpdatedFading] = useState(false)

  const handleRemoveSection = useCallback(async (sectionIndex: number) => {
    if (!articleId) return
    setRemovingSection(sectionIndex)
    setReplacingSection(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/section-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', sectionIndex }),
      })
      if (!res.ok) throw new Error('Failed to remove section')
      const data = await res.json()
      onArticleUpdated?.(data.article)
    } catch (err) {
      console.error('[section-remove]', err)
    } finally {
      setRemovingSection(null)
    }
  }, [articleId, onArticleUpdated])

  const handleEditSection = useCallback(async (sectionIndex: number, instruction: string) => {
    if (!articleId) return
    const wasReplacing = replacingSection === sectionIndex
    setEditingSection(sectionIndex)
    try {
      const res = await fetch(`/api/articles/${articleId}/section-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', sectionIndex, instruction }),
      })
      if (!res.ok) throw new Error('Failed to edit section')
      const data = await res.json()
      onArticleUpdated?.(data.article)

      // Show Updated indicator if this was a replacement action
      if (wasReplacing) {
        setReplacingSection(null)
        setUpdatedSection(sectionIndex)
        setUpdatedFading(false)
        // Start fade after 7 seconds, complete by 10
        setTimeout(() => setUpdatedFading(true), 7000)
        setTimeout(() => setUpdatedSection(null), 10000)
      }
    } catch (err) {
      console.error('[section-edit]', err)
      // Restore section on error if replacing
      if (wasReplacing) {
        setReplacingSection(null)
      }
      throw err // re-throw so SectionToolbar can show error
    } finally {
      setEditingSection(null)
    }
  }, [articleId, onArticleUpdated, replacingSection])

  const handleStartReplace = useCallback((sectionIndex: number) => {
    // Only one section can be in replacement mode at a time
    setReplacingSection(sectionIndex)
  }, [])

  const handleCancelReplace = useCallback(() => {
    setReplacingSection(null)
  }, [])

  // Pre-process: group consecutive Polymarket cards for grid layout
  const elements: React.ReactNode[] = []
  let i = 0
  let twitterInjected = false
  let redditInjected = false
  let interactiveInjected = false
  const hasTwitterData = twitterFindings && twitterFindings.length >= 2
  const hasRedditData = redditThreads && redditThreads.length >= 1
  const hasInteractive = !!interactiveComponent

  while (i < sections.length) {
    const section = sections[i]

    // Check for a run of consecutive Polymarket cards (2-3 → grid)
    if (isPolymarketCard(section)) {
      const groupStart = i
      const group: { section: ArticleSection; index: number }[] = []
      while (i < sections.length && isPolymarketCard(sections[i]) && group.length < 3) {
        group.push({ section: sections[i], index: i })
        i++
      }

      if (group.length >= 2) {
        // Render as a grid row
        const gridStyle = animated
          ? { animationDelay: `${groupStart * 60}ms`, opacity: 0 }
          : undefined
        const gridClass = animated ? 'fade-in-up' : ''

        elements.push(
          <div
            key={`polymarket-grid-${groupStart}`}
            id={`section-${groupStart}`}
            className={`grid gap-3 mb-6 items-stretch ${gridClass} ${group.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
            style={gridStyle}
          >
            {group.map(({ section: s, index: idx }) => (
              <div key={idx} id={`section-${idx}`} className="flex">
                <LiveDataCard section={s as { type: 'live_data_card'; data_source: 'polymarket' | 'yahoo_finance' | 'google_trends'; content: Record<string, unknown> }} />
              </div>
            ))}
          </div>
        )
        continue
      }
      // Single Polymarket card — fall through to normal rendering
      i = groupStart
    }

    // Check for a run of consecutive chart-type live data cards (yahoo_finance, google_trends → side by side)
    if (isChartDataCard(section)) {
      const groupStart = i
      const group: { section: ArticleSection; index: number }[] = []
      while (i < sections.length && isChartDataCard(sections[i]) && group.length < 3) {
        group.push({ section: sections[i], index: i })
        i++
      }

      if (group.length >= 2) {
        const gridStyle = animated
          ? { animationDelay: `${groupStart * 60}ms`, opacity: 0 }
          : undefined
        const gridClass = animated ? 'fade-in-up' : ''

        elements.push(
          <div
            key={`chart-grid-${groupStart}`}
            id={`section-${groupStart}`}
            className={`grid gap-4 mb-8 items-stretch ${gridClass} ${group.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
            style={gridStyle}
          >
            {group.map(({ section: s, index: idx }) => (
              <div key={idx} id={`section-${idx}`} className="flex">
                <LiveDataCard section={s as { type: 'live_data_card'; data_source: 'polymarket' | 'yahoo_finance' | 'google_trends'; content: Record<string, unknown> }} />
              </div>
            ))}
          </div>
        )
        continue
      }
      // Single chart card — fall through to normal rendering
      i = groupStart
    }

    // Normal section rendering
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
        case 'content_section': {
          // In visual_list articles, content_section follows image_section with the same heading.
          // Suppress the duplicate heading on the content_section.
          const prevSection = i > 0 ? sections[i - 1] : null
          const prevHeading = prevSection && 'heading' in prevSection ? (prevSection as { heading?: string }).heading : null
          const thisHeading = 'heading' in section ? (section as { heading?: string }).heading : null
          const suppressHeading = !!(
            prevSection &&
            prevSection.type === 'image_section' &&
            prevHeading &&
            thisHeading &&
            prevHeading.toLowerCase().trim() === thisHeading.toLowerCase().trim()
          )
          return <ContentSection section={section} currentSlug={currentSlug} relatedArticles={linkableArticles} hideHeading={suppressHeading} />
        }
        case 'price_tier_breakdown':
          return <PriceTierBreakdown section={section} />
        case 'community_insights':
          return <CommunityInsights section={section} isOwner={isAdmin} articleId={articleId} onArticleUpdated={onArticleUpdated} />
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
              articleId={articleId}
              onReplaceImage={onReplaceImage ? (imgIdx) => onReplaceImage(i, imgIdx) : undefined}
              onArticleUpdated={onArticleUpdated}
            />
          )
        case 'interactive_calculator':
          return <InteractiveCalculator section={section} />
        case 'live_data_card':
          return <LiveDataCard section={section} />
        case 'big_statement':
          return <BigStatement statement={(section as { content: { statement: string } }).content.statement} />
        case 'ranked_item':
          return <RankedItemSection section={section as any} />
        case 'myth_reality':
          return <MythRealitySection section={section as any} />
        default:
          return null
      }
    })()

    if (inner) {
      // Add extra bottom margin after live data cards so they don't crowd the next heading
      const extraClass = section.type === 'live_data_card' ? ' mb-8' : ''
      const sectionIdx = i // capture for closure
      const showToolbar = isAdmin && articleId && !NO_TOOLBAR_TYPES.has(section.type)
      const isBeingRemoved = removingSection === sectionIdx
      const isBeingEdited = editingSection === sectionIdx
      const isBeingReplaced = replacingSection === sectionIdx
      const isUpdated = updatedSection === sectionIdx

      elements.push(
        <div
          key={i}
          id={`section-${i}`}
          className={`${className}${extraClass} ${showToolbar ? 'group/section relative' : ''}`}
          style={{
            ...style,
            ...(isBeingRemoved ? { opacity: 0, transition: 'opacity 0.3s ease' } : {}),
            ...(isUpdated ? { borderLeft: `3px solid ${updatedFading ? 'transparent' : '#22C55E'}`, paddingLeft: '12px', transition: 'border-color 3s ease, padding-left 3s ease' } : {}),
          }}
        >
          {/* Updated indicator after successful replacement */}
          {isUpdated && (
            <div
              className="flex items-center gap-1 mb-1.5"
              style={{
                opacity: updatedFading ? 0 : 1,
                transition: 'opacity 3s ease',
              }}
              data-no-print
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="16 10 11 16 8 13" />
              </svg>
              <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 500 }}>Updated</span>
            </div>
          )}

          {showToolbar && (
            <SectionToolbar
              sectionIndex={sectionIdx}
              articleId={articleId!}
              onRemove={handleRemoveSection}
              onEdit={handleEditSection}
              isEditing={isBeingEdited}
              isReplacing={isBeingReplaced}
              onStartReplace={handleStartReplace}
              onCancelReplace={handleCancelReplace}
            />
          )}

          {/* Section content — dimmed when being replaced */}
          <div
            style={isBeingReplaced ? {
              opacity: 0.15,
              filter: 'blur(1px)',
              pointerEvents: 'none' as const,
              transition: 'opacity 0.3s ease, filter 0.3s ease',
            } : {
              transition: 'opacity 0.3s ease, filter 0.3s ease',
            }}
          >
            {inner}
          </div>
        </div>
      )

      // Inject Reddit sentiment immediately after community_insights
      if (section.type === 'community_insights' && hasRedditData && !redditInjected) {
        redditInjected = true
        elements.push(
          <div key="reddit-sentiment" className={animated ? 'fade-in-up' : ''} style={style}>
            <RedditSentimentSection
              threads={redditThreads!}
              sentimentSplit={redditSentimentSplit}
              contextTrigger={redditContextTrigger}
              threadsAnalysed={redditThreadsAnalysed}
              articleId={articleId}
              isOwner={isOwner}
              onThreadsUpdated={onRedditUpdated}
            />
          </div>
        )
      }

      // Inject interactive component after community_insights + Reddit (before Twitter)
      if (section.type === 'community_insights' && hasInteractive && !interactiveInjected) {
        interactiveInjected = true
        elements.push(
          <div key="interactive-component" className={animated ? 'fade-in-up' : ''} style={style}>
            <InteractiveComponentSection data={interactiveComponent!} />
          </div>
        )
      }

      // Inject Twitter/X sentiment after community_insights + Reddit + interactive
      if (section.type === 'community_insights' && hasTwitterData) {
        twitterInjected = true
        elements.push(
          <div key="twitter-sentiment" className={animated ? 'fade-in-up' : ''} style={style}>
            <TwitterSentimentSection
              findings={twitterFindings!}
              summary={twitterSummary ?? null}
              sentimentSplit={twitterSentimentSplit}
              contextTrigger={twitterContextTrigger}
              postsAnalysed={twitterPostsAnalysed}
              articleId={articleId}
              isOwner={isOwner}
              onTwitterUpdated={onTwitterUpdated}
            />
          </div>
        )
      }

      // Fallback: if no community_insights, inject Reddit before sources/further_reading
      if (!redditInjected && hasRedditData && (section.type === 'sources' || section.type === 'further_reading')) {
        redditInjected = true
        elements.splice(elements.length - 1, 0,
          <div key="reddit-sentiment" className={animated ? 'fade-in-up' : ''}>
            <RedditSentimentSection
              threads={redditThreads!}
              sentimentSplit={redditSentimentSplit}
              contextTrigger={redditContextTrigger}
              threadsAnalysed={redditThreadsAnalysed}
              articleId={articleId}
              isOwner={isOwner}
              onThreadsUpdated={onRedditUpdated}
            />
          </div>
        )
      }

      // Fallback: if no community_insights, inject interactive before sources/further_reading
      if (!interactiveInjected && hasInteractive && (section.type === 'sources' || section.type === 'further_reading')) {
        interactiveInjected = true
        elements.splice(elements.length - 1, 0,
          <div key="interactive-component" className={animated ? 'fade-in-up' : ''}>
            <InteractiveComponentSection data={interactiveComponent!} />
          </div>
        )
      }

      // Fallback: if no community_insights, inject Twitter before sources/further_reading
      if (!twitterInjected && hasTwitterData && (section.type === 'sources' || section.type === 'further_reading')) {
        twitterInjected = true
        elements.splice(elements.length - 1, 0,
          <div key="twitter-sentiment" className={animated ? 'fade-in-up' : ''}>
            <TwitterSentimentSection
              findings={twitterFindings!}
              summary={twitterSummary ?? null}
              sentimentSplit={twitterSentimentSplit}
              contextTrigger={twitterContextTrigger}
              postsAnalysed={twitterPostsAnalysed}
              articleId={articleId}
              isOwner={isOwner}
              onTwitterUpdated={onTwitterUpdated}
            />
          </div>
        )
      }
    }

    i++
  }

  // Final fallback: no community_insights or sources — append Reddit at end
  if (!redditInjected && hasRedditData) {
    elements.push(
      <div key="reddit-sentiment" className={animated ? 'fade-in-up' : ''}>
        <RedditSentimentSection
          threads={redditThreads!}
          sentimentSplit={redditSentimentSplit}
          contextTrigger={redditContextTrigger}
          threadsAnalysed={redditThreadsAnalysed}
          articleId={articleId}
          isOwner={isOwner}
          onThreadsUpdated={onRedditUpdated}
        />
      </div>
    )
  }

  // Final fallback: no community_insights or sources — append interactive at end
  if (!interactiveInjected && hasInteractive) {
    elements.push(
      <div key="interactive-component" className={animated ? 'fade-in-up' : ''}>
        <InteractiveComponentSection data={interactiveComponent!} />
      </div>
    )
  }

  // Final fallback: no community_insights or sources — append Twitter at end
  if (!twitterInjected && hasTwitterData) {
    elements.push(
      <div key="twitter-sentiment" className={animated ? 'fade-in-up' : ''}>
        <TwitterSentimentSection
          findings={twitterFindings!}
          summary={twitterSummary ?? null}
          sentimentSplit={twitterSentimentSplit}
          contextTrigger={twitterContextTrigger}
          postsAnalysed={twitterPostsAnalysed}
          articleId={articleId}
          isOwner={isOwner}
          onTwitterUpdated={onTwitterUpdated}
        />
      </div>
    )
  }

  return <>{elements}</>
}
