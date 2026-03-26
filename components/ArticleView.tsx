'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ArticleRow, ArticleContent, ProductCard } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'
import ArticleSidebarNav from './ui/ArticleSidebarNav'
import QuickVerdict from './sections/QuickVerdict'
import ExecutiveSummary from './sections/ExecutiveSummary'
import SectionRenderer from './sections/SectionRenderer'
import { RefinementChips, RelatedChips } from './ui/SuggestionChips'
import RefinementInput from './ui/RefinementInput'
import ShareButton from './ui/ShareButton'
import BookmarkButton from './ui/BookmarkButton'
import RelatedArticles from './RelatedArticles'
import ArticleFeedback from './ui/ArticleFeedback'
import FactCheckBar, { FactCheckBadge } from './ui/FactCheckBar'
import FirstDraftBanner from './FirstDraftBanner'
import MenuItem from './article/MenuItem'
import DebugPanel from './article/DebugPanel'
import HeroImage from './article/HeroImage'
import AdminMenu from './article/AdminMenu'
import { buildNavItems } from '@/lib/section-ids'
import { getReadingTime } from '@/lib/reading-time'
import { useUser } from '@/hooks/useUser'

interface Props {
  articleRow: ArticleRow
  isOwner: boolean
  isAdmin?: boolean
  isNew?: boolean
  factCheckStatus?: 'none' | 'checking' | 'verified'
}

export default function ArticleView({ articleRow, isOwner, isAdmin = false, isNew, factCheckStatus = 'none' }: Props) {
  const router = useRouter()
  const { user } = useUser()
  const [article, setArticle] = useState(articleRow.article!)
  const [chips, setChips] = useState(articleRow.suggestion_chips)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false)
  const [isRegeneratingArticle, setIsRegeneratingArticle] = useState(false)
  const [toolbarBusy, setToolbarBusy] = useState<string | null>(null)
  const [exportState] = useState<'idle' | 'generating' | 'done'>('idle')
  const [refineValue, setRefineValue] = useState('')
  const refineContainerRef = useRef<HTMLDivElement>(null)
  const hasMissingImages = useMemo(() => {
    const productCards = article.sections.filter(
      (s): s is ProductCard => s.type === 'product_card'
    )
    return productCards.length > 0 && productCards.some((c) => !c.image_urls?.length && !c.image_url)
  }, [article.sections])

  async function handleRegenerateImages() {
    setIsRegeneratingImages(true)
    setToolbarBusy('images')
    try {
      const res = await fetch(`/api/articles/${articleRow.id}/regenerate-images`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setArticle(data.article)
    } catch {
      // silently fail
    } finally {
      setIsRegeneratingImages(false)
      setToolbarBusy(null)
    }
  }

  async function handleRegenerateArticle() {
    setIsRegeneratingArticle(true)
    setToolbarBusy('article')
    try {
      const res = await fetch(`/api/articles/${articleRow.id}/generate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to start regeneration')

      // Poll for completion — the endpoint now runs generation in the background
      const poll = async (): Promise<void> => {
        const articleRes = await fetch(`/api/articles/${articleRow.id}`)
        if (!articleRes.ok) throw new Error('Failed to fetch')
        const data = await articleRes.json()

        if (data.status === 'complete' && data.article) {
          setArticle(data.article)
          setChips(data.suggestion_chips)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        if (data.status === 'error') {
          throw new Error('Regeneration failed')
        }
        // Still generating — wait and poll again
        await new Promise((r) => setTimeout(r, 3000))
        return poll()
      }

      // Wait a moment for generation to start, then begin polling
      await new Promise((r) => setTimeout(r, 2000))
      await poll()
    } catch {
      alert('Article regeneration failed. Please try again.')
    } finally {
      setIsRegeneratingArticle(false)
      setToolbarBusy(null)
    }
  }

  async function handleRefine(instruction: string) {
    setIsRefining(true)
    setRefineError(null)

    try {
      const res = await fetch(`/api/articles/${articleRow.id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      })

      if (!res.ok) throw new Error('Refinement failed')

      const data = await res.json()

      // If the refine created a new child article, redirect to it
      if (data.newSlug) {
        router.push(`/article/${data.newSlug}`)
        return
      }

      // Fallback: update in-place (shouldn't happen with new API)
      setArticle(data.article)
      setChips(data.suggestion_chips)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setRefineError('Something went wrong refining the article. Please try again.')
    } finally {
      setIsRefining(false)
    }
  }

  const handleReplaceImage = useCallback(
    async (sectionIndex: number, imageIndex: number) => {
      try {
        const res = await fetch(`/api/articles/${articleRow.id}/replace-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionIndex, imageIndex }),
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (data.article) setArticle(data.article)
      } catch {
        // silently fail
      }
    },
    [articleRow.id]
  )

  const handleSetPrimaryImage = useCallback(
    async (sectionIndex: number, imageIndex: number) => {
      try {
        const res = await fetch(`/api/articles/${articleRow.id}/set-primary-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionIndex, imageIndex }),
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (data.article) setArticle(data.article)
      } catch {
        // silently fail
      }
    },
    [articleRow.id]
  )

  const formattedDate = new Date(articleRow.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const readingTime = getReadingTime(article)

  const navItems = useMemo(() => buildNavItems(article), [article])

  return (
    <div className="article-page-layout">
      {/* Sidebar navigation — desktop only */}
      <ArticleSidebarNav items={navItems} />

      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      {/* Header */}
      <div className="mb-6 relative">
        <div className="flex items-start justify-between mb-3">
          <div /> {/* Spacer */}

          {/* Admin menu — small gear icon */}
          {isOwner && (
            <AdminMenu
              articleId={articleRow.id}
              articleType={article.article_type}
              isAdmin={isAdmin}
              isRegeneratingImages={isRegeneratingImages}
              isRegeneratingArticle={isRegeneratingArticle}
              toolbarBusy={toolbarBusy}
              initialPinned={articleRow.pinned ?? false}
              initialHidden={articleRow.hidden_from_homepage ?? false}
              onRegenerateImages={handleRegenerateImages}
              onRegenerateArticle={handleRegenerateArticle}
              onCategoryChange={(newType) => {
                setArticle({ ...article, article_type: newType as typeof article.article_type })
              }}
            />
          )}
        </div>
        <h1
          className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {article.title}
        </h1>
        <p
          className="text-sm font-medium uppercase tracking-wide mb-3"
          style={{ color: '#E07A3A' }}
        >
          {(() => {
            const labels: Record<string, string> = {
              buyer_guide: 'Buying Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
              explainer: 'Explainer', news: 'News', planning: 'Travel & Living',
              trend_analysis: 'Trend Analysis', tutorial: 'Tutorial',
            }
            return labels[article.article_type] ?? article.article_type.replace(/_/g, ' ')
          })()}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {articleRow.user_name && (
            <>
              <Link
                href={`/creator/${articleRow.user_id}`}
                className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity"
              >
                {articleRow.user_avatar && (
                  <img
                    src={articleRow.user_avatar}
                    alt=""
                    className="w-5 h-5 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {articleRow.user_name}
                </span>
              </Link>
              <span style={{ color: 'var(--border)' }}>·</span>
            </>
          )}
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formattedDate} · {readingTime} min read
          </p>
          <span style={{ color: 'var(--border)' }}>·</span>
          <ShareButton title={article.title} url={`https://unpacked.fyi/article/${articleRow.slug}`} />
          <span style={{ color: 'var(--border)' }}>·</span>
          <BookmarkButton articleId={articleRow.id} user={user} />
          {(articleRow.status === 'verified' || articleRow.fact_check) && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <FactCheckBadge factCheck={articleRow.fact_check} />
            </>
          )}
        </div>
      </div>

      {/* Debug panel — dev mode only */}
      {process.env.NODE_ENV === 'development' && articleRow.plan?.visual_strategy && (
        <DebugPanel
          articleType={article.article_type}
          visualStrategy={articleRow.plan.visual_strategy}
          sections={article.sections.map((s) => s.type)}
        />
      )}

      {/* Hero Image — first visual, before any content */}
      {article.thumbnail_url && (
        <HeroImage
          url={article.thumbnail_url}
          alt={article.title}
          history={article.thumbnail_history ?? []}
          isAdmin={isOwner}
          articleId={articleRow.id}
          onReplace={async (useAI?: boolean) => {
            try {
              const url = `/api/articles/${articleRow.id}/replace-thumbnail${useAI ? '?ai=true' : ''}`
              const res = await fetch(url, { method: 'POST' })
              if (!res.ok) throw new Error('Failed')
              const data = await res.json()
              if (data.article) setArticle(data.article)
            } catch {
              // silently fail
            }
          }}
          onPick={async (index: number) => {
            try {
              const res = await fetch(`/api/articles/${articleRow.id}/replace-thumbnail?pick=${index}`, { method: 'POST' })
              if (!res.ok) throw new Error('Failed')
              const data = await res.json()
              if (data.article) setArticle(data.article)
            } catch {
              // silently fail
            }
          }}
          onKeep={(updatedArticle) => setArticle(updatedArticle)}
        />
      )}

      <div className="mb-8" style={{ borderTop: '1px solid var(--border)' }} />

      {/* Quick Verdict */}
      <div id="section-verdict">
        <QuickVerdict data={article.quick_verdict} />
      </div>

      {/* Executive Summary */}
      <div id="section-summary">
        <ExecutiveSummary data={article.executive_summary} />
      </div>

      <div className="mb-8" style={{ borderTop: '1px solid var(--border)' }} />

      {/* All sections with staggered fade-in */}
      {isRefining ? (
        <div className="py-16 text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Updating article…
          </p>
        </div>
      ) : (
        <SectionRenderer
          sections={article.sections}
          animated
          isAdmin={isOwner}
          articleId={articleRow.id}
          onReplaceImage={handleReplaceImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onArticleUpdated={(updated) => setArticle(updated)}
        />
      )}

      {/* ─── Bottom sections (hidden in print) ─── */}

      {/* 1. Feedback row — centred */}
      <div className="mt-10 mb-8" data-no-print>
        <ArticleFeedback articleId={articleRow.id} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* 2. Chat-style refine input */}
      <div className="mt-8" data-no-print ref={refineContainerRef}>
        {refineError && (
          <p className="text-sm text-red-600 mb-3">{refineError}</p>
        )}
        <RefinementInput
          onSubmit={handleRefine}
          isLoading={isRefining}
          externalValue={refineValue}
          onExternalValueChange={setRefineValue}
        />
      </div>

      {/* 3. Two-column: Refinements + Related topics */}
      {chips && (chips.refinements.length > 0 || chips.related.length > 0) && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8" data-no-print>
          {/* Left: Suggested Refinements */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
            >
              Suggested refinements
            </p>
            <RefinementChips
              chips={chips}
              onRefine={handleRefine}
              isRefining={isRefining}
            />
          </div>

          {/* Right: Related Topics */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
            >
              Related topics
            </p>
            <RelatedChips chips={chips} />
          </div>
        </div>
      )}

      {/* 4. Share + Export row — aligned to two-column grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3" data-no-print>
        <ShareButton
          title={article.title}
          url={`https://unpacked.fyi/article/${articleRow.slug}`}
          variant="bottom-row"
        />
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-sora)',
            cursor: 'pointer',
          }}
          title="Print or save as PDF"
          data-no-print
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </div>

      <div className="my-10" style={{ borderTop: '1px solid var(--border)' }} data-no-print />

      {/* 5. Related articles */}
      <div data-no-print>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
        >
          Related articles
        </p>
        <RelatedArticles
          articleId={articleRow.id}
          articleType={article.article_type}
        />
      </div>
    </div>

    {/* First Draft Banner — shown to owner on freshly generated articles */}
    {isNew && isOwner && (
      <FirstDraftBanner
        correctionsCount={articleRow.fact_check?.total_issues ?? 0}
        sourceCount={(() => {
          const src = article.sections.find(s => s.type === 'sources')
          if (!src) return 0
          const sources = (src as unknown as { sources?: unknown[] }).sources
          return Array.isArray(sources) ? sources.length : 0
        })()}
        firstSectionTitle={
          article.sections.find(s => s.type === 'content_section')?.heading ?? 'introduction'
        }
        onPrefillRefine={(text) => {
          setRefineValue(text)
          // Brief amber glow on the refine container
          if (refineContainerRef.current) {
            refineContainerRef.current.style.boxShadow = '0 0 0 3px rgba(186, 117, 23, 0.3)'
            refineContainerRef.current.style.borderRadius = '12px'
            refineContainerRef.current.style.transition = 'box-shadow 0.3s ease'
            setTimeout(() => {
              if (refineContainerRef.current) {
                refineContainerRef.current.style.boxShadow = 'none'
              }
            }, 1000)
          }
        }}
        onScrollToRefine={() => {
          refineContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }}
        onShare={async () => {
          const shareUrl = `https://unpacked.fyi/article/${articleRow.slug}`
          if (typeof navigator !== 'undefined' && navigator.share) {
            try { await navigator.share({ title: article.title, url: shareUrl }) } catch {}
          } else {
            try { await navigator.clipboard.writeText(shareUrl) } catch {}
          }
        }}
      />
    )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  )
}

