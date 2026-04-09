'use client'

import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
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
import ArticleVoting from './ui/ArticleVoting'
import FactCheckBar, { FactCheckBadge, ClaimsPanel } from './ui/FactCheckBar'
import EditorBar from './ui/EditorBar'
import MenuItem from './article/MenuItem'
import DebugPanel from './article/DebugPanel'
import HeroImage from './article/HeroImage'
import AdminMenu from './article/AdminMenu'
import { buildNavItems } from '@/lib/section-ids'
import { getReadingTime } from '@/lib/reading-time'
import { formatCost } from '@/lib/format-cost'
import { ARTICLE_TYPE_LABELS } from '@/lib/article-config'
import { categoryToSlug } from '@/lib/category-config'
import { useUser } from '@/hooks/useUser'
import SignInNudge from './ui/SignInNudge'
import ArticleBottomCTA from './ArticleBottomCTA'

const SharePanel = lazy(() => import('./SharePanel'))

interface Props {
  articleRow: ArticleRow
  isOwner: boolean
  isAdmin?: boolean
  isNew?: boolean
  factCheckStatus?: 'none' | 'checking' | 'verified'
  linkableArticles?: Array<{ title: string; slug: string }>
  creatorBio?: string
  creatorTwitterUrl?: string
  creatorLinkedinUrl?: string
  creatorMediumUrl?: string
  isFoundingCreator?: boolean
  unusedFindingsCount?: number
  onSwitchToEditor?: () => void
}

export default function ArticleView({ articleRow, isOwner, isAdmin = false, isNew, factCheckStatus = 'none', linkableArticles, creatorBio, creatorTwitterUrl, creatorLinkedinUrl, creatorMediumUrl, isFoundingCreator = false, unusedFindingsCount = 0, onSwitchToEditor }: Props) {
  const router = useRouter()
  const { user } = useUser()
  const [article, setArticle] = useState(articleRow.article!)
  const [chips, setChips] = useState(articleRow.suggestion_chips)
  const [twitterFindings, setTwitterFindings] = useState(() => articleRow.twitter_findings ?? [])
  const [twitterSummary, setTwitterSummary] = useState<string | null>(() => articleRow.twitter_summary ?? null)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [refineSuccess, setRefineSuccess] = useState(false)
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false)
  const [isRegeneratingArticle, setIsRegeneratingArticle] = useState(false)
  const [toolbarBusy, setToolbarBusy] = useState<string | null>(null)
  const [refineValue, setRefineValue] = useState('')
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [claimsPanelOpen, setClaimsPanelOpen] = useState(false)
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

  async function handleRefine(instruction: string, imageUrl?: string) {
    setIsRefining(true)
    setRefineError(null)

    try {
      const res = await fetch(`/api/articles/${articleRow.id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction, imageUrl }),
      })

      if (!res.ok) throw new Error('Refinement failed')

      const data = await res.json()

      // If the refine created a new child article, show success then redirect
      if (data.newSlug) {
        setRefineSuccess(true)
        setTimeout(() => router.push(`/article/${data.newSlug}`), 1800)
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
      // Step 1: Get candidate image URLs via preview search
      const previewRes = await fetch(`/api/articles/${articleRow.id}/replace-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex, imageIndex, preview: true, count: 4 }),
      })
      if (!previewRes.ok) throw new Error('Preview search failed')
      const { preview_urls } = await previewRes.json()
      if (!preview_urls?.length) throw new Error('No replacement images found')

      // Step 2: Select the first candidate and save it
      const selectRes = await fetch(`/api/articles/${articleRow.id}/replace-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex, imageIndex, selected_url: preview_urls[0] }),
      })
      if (!selectRes.ok) throw new Error('Failed to save replacement')
      const data = await selectRes.json()
      if (data.article) setArticle(data.article)
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
          {/* Visibility badge — shown to owner when article is not published */}
          {isOwner && articleRow.visibility && articleRow.visibility !== 'published' ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: articleRow.visibility === 'unlisted' ? '#eff6ff' : '#f5f5f4',
                color: articleRow.visibility === 'unlisted' ? '#2563eb' : '#78716c',
                border: `1px solid ${articleRow.visibility === 'unlisted' ? '#bfdbfe' : '#e7e5e4'}`,
              }}
            >
              {articleRow.visibility === 'unlisted' ? '🔗 Unlisted' : '🔒 Private'}
            </span>
          ) : <div />}

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
              initialFeatured={articleRow.is_featured ?? false}
              initialTrending={articleRow.is_trending ?? false}
              initialVisibility={articleRow.visibility ?? 'published'}
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
          {articleRow.category ? (
            <Link
              href={`/category/${categoryToSlug(articleRow.category)}`}
              className="no-underline hover:underline"
              style={{ color: '#E07A3A' }}
            >
              {(ARTICLE_TYPE_LABELS as Record<string, string>)[article.article_type] ?? article.article_type.replace(/_/g, ' ')}
            </Link>
          ) : (
            (ARTICLE_TYPE_LABELS as Record<string, string>)[article.article_type] ?? article.article_type.replace(/_/g, ' ')
          )}
        </p>
        {articleRow.user_name && (
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/creator/${articleRow.user_id}`}
              className="flex items-center gap-3 no-underline hover:opacity-80 transition-opacity min-w-0"
            >
              {articleRow.user_avatar && (
                <img
                  src={articleRow.user_avatar}
                  alt=""
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex flex-col min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {articleRow.user_name}
                  </span>
                  {isFoundingCreator && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}
                    >
                      Founding Creator
                    </span>
                  )}
                </span>
                {creatorBio && (
                  <span className="text-sm line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                    {creatorBio}
                  </span>
                )}
              </div>
            </Link>
            {(creatorTwitterUrl || creatorLinkedinUrl || creatorMediumUrl) && (
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                {creatorTwitterUrl && (
                  <a
                    href={creatorTwitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="X / Twitter"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {creatorLinkedinUrl && (
                  <a
                    href={creatorLinkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="LinkedIn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                )}
                {creatorMediumUrl && (
                  <a
                    href={creatorMediumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="Medium"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formattedDate} · {readingTime} min read
          </p>
          <span style={{ color: 'var(--border)' }}>·</span>
          {isOwner ? (
            <button
              onClick={() => setShowSharePanel(true)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors relative py-2 px-1 -my-2 -mx-1"
              style={{ color: 'var(--text-secondary)', minHeight: '44px', minWidth: '44px', cursor: 'pointer', background: 'none', border: 'none' }}
              title="Share article"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>Share</span>
            </button>
          ) : (
            <ShareButton title={article.title} url={`https://unpacked.fyi/article/${articleRow.slug}`} />
          )}
          <span style={{ color: 'var(--border)' }}>·</span>
          <BookmarkButton articleId={articleRow.id} user={user} />
          {/* Visibility moved to EditorBar */}
          {(articleRow.status === 'verified' || articleRow.fact_check) && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <FactCheckBadge
                factCheck={articleRow.fact_check}
                audit={articleRow.fact_check_audit}
                expanded={claimsPanelOpen}
                onToggle={() => setClaimsPanelOpen(prev => !prev)}
              />
            </>
          )}
          {isAdmin && articleRow.total_cost != null && articleRow.total_cost > 0 && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <ArticleCostDisplay articleId={articleRow.id} totalCost={articleRow.total_cost} totalTimeMs={(articleRow.generation_options as Record<string, unknown> | null)?.timings ? ((articleRow.generation_options as Record<string, unknown>).timings as Record<string, number>)?.total_ms : undefined} />
            </>
          )}
        </div>
      </div>

      {/* Expandable claims panel */}
      {claimsPanelOpen && articleRow.fact_check_audit && articleRow.fact_check_audit.claims?.length > 0 && (
        <div className="mt-3" style={{ maxWidth: '900px' }}>
          <ClaimsPanel
            audit={articleRow.fact_check_audit}
            onClose={() => setClaimsPanelOpen(false)}
          />
        </div>
      )}

      {/* Debug panel — dev mode only */}
      {process.env.NODE_ENV === 'development' && articleRow.plan?.visual_strategy && (
        <DebugPanel
          articleType={article.article_type}
          visualStrategy={articleRow.plan.visual_strategy}
          sections={article.sections.map((s) => s.type)}
        />
      )}

      {/* Editor Bar — owner-only persistent toolbar */}
      {isOwner && (
        <EditorBar
          articleId={articleRow.id}
          articleSlug={articleRow.slug}
          visibility={articleRow.visibility ?? 'published'}
          unusedFindingsCount={unusedFindingsCount}
          onOpenSharePanel={() => setShowSharePanel(true)}
          onSwitchToEditor={onSwitchToEditor ?? (() => {})}
          onExportPDF={() => window.print()}
          isNew={isNew}
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
          attribution={article.hero_attribution}
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
          currentSlug={articleRow.slug}
          linkableArticles={linkableArticles}
          onReplaceImage={handleReplaceImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onArticleUpdated={(updated) => setArticle(updated)}
          twitterFindings={twitterFindings}
          twitterSummary={twitterSummary}
          twitterSentimentSplit={articleRow.twitter_sentiment_split ?? undefined}
          twitterContextTrigger={articleRow.twitter_context_trigger ?? undefined}
          twitterPostsAnalysed={articleRow.twitter_posts_analysed ?? undefined}
          isOwner={isOwner}
          onTwitterUpdated={(next) => {
            setTwitterFindings(next.findings)
            setTwitterSummary(next.summary)
          }}
        />
      )}

      {/* Twitter/X sentiment is now rendered inline by SectionRenderer (after community_insights or before sources) */}

      {/* ─── Bottom sections (hidden in print) ─── */}

      {/* Voting — helpfulness + verdict conviction */}
      <ArticleVoting articleId={articleRow.id} />

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* 2. Chat-style refine input + suggestion chips */}
      <div className="mt-8" data-no-print ref={refineContainerRef}>
        {user ? (
          <>
            {refineSuccess && (
              <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#16a34a' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Done! Opening your refined article...
              </p>
            )}
            {refineError && (
              <p className="text-sm text-red-600 mb-3">{refineError}</p>
            )}
            <RefinementInput
              onSubmit={handleRefine}
              isLoading={isRefining}
              externalValue={refineValue}
              onExternalValueChange={setRefineValue}
              articleId={articleRow.id}
            />
          </>
        ) : (
          <SignInNudge user={user} articleId={articleRow.id} />
        )}
      </div>

      {/* 3. Two-column: Refinements + Related topics — logged-in only */}
      {user && chips && (chips.refinements.length > 0 || chips.related.length > 0) && (
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
        {isOwner ? (
          <button
            onClick={() => setShowSharePanel(true)}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--font-sora)',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share this article
          </button>
        ) : (
          <ShareButton
            title={article.title}
            url={`https://unpacked.fyi/article/${articleRow.slug}`}
            variant="bottom-row"
          />
        )}
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
      {isOwner && user && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }} data-no-print>
          Share to earn bonus articles
        </p>
      )}

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

      {/* 6. Bottom CTA — convert readers to creators */}
      <ArticleBottomCTA
        isOwner={isOwner}
        isLoggedIn={!!user}
        category={articleRow.category ?? null}
        query={articleRow.query}
        sourceCount={articleRow.research_preview?.source_count}
      />
    </div>

    {/* Share Panel — owner only, lazy loaded */}
    {isOwner && showSharePanel && (
      <Suspense fallback={null}>
        <SharePanel
          articleRow={articleRow}
          isOpen={showSharePanel}
          onClose={() => setShowSharePanel(false)}
        />
      </Suspense>
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

/**
 * Admin-only cost display with expandable breakdown by call type.
 */
interface CostBreakdownItem {
  call_type: string
  label: string
  total_cost: number
  call_count: number
  models: string[]
}

interface CostBreakdownData {
  total_cost: number
  total_calls: number
  breakdown: CostBreakdownItem[]
  timings: Record<string, number> | null
}

function formatMs(ms: number | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatModel(model: string): string {
  // Shorten model names for display
  if (model.includes('haiku-4-5')) return 'Haiku 4.5'
  if (model.includes('haiku-4')) return 'Haiku 4'
  if (model.includes('haiku-3')) return 'Haiku 3'
  if (model.includes('sonnet-4')) return 'Sonnet 4'
  if (model.includes('sonnet-3-5')) return 'Sonnet 3.5'
  if (model.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash'
  if (model.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash'
  if (model.includes('gpt-4o-mini')) return 'GPT-4o Mini'
  if (model.includes('brave')) return 'Brave Search'
  return model
}

// Map timing keys to breakdown call_types for matching
const TIMING_MAP: Record<string, string[]> = {
  planning_ms: ['plan'],
  research_ms: ['synthesis', 'polymarket_filter'],
  blueprint_ms: ['blueprint'],
  writing_ms: ['write'],
  editorial_ms: ['editorial_pass'],
  factcheck_ms: ['fact_check_stage1', 'fact_check_claims', 'fact_check_stage2', 'fact_check_stage3'],
}

const TIMING_LABELS: Record<string, string> = {
  planning_ms: 'Planning',
  research_ms: 'Research',
  blueprint_ms: 'Blueprint',
  writing_ms: 'Writing',
  editorial_ms: 'Editorial',
  save_ms: 'Save',
  factcheck_ms: 'Fact-check',
  total_ms: 'Total',
}

function ArticleCostDisplay({ articleId, totalCost, totalTimeMs }: { articleId: string; totalCost: number; totalTimeMs?: number }) {
  const [expanded, setExpanded] = useState(false)
  const [data, setData] = useState<CostBreakdownData | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadBreakdown() {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    setExpanded(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/cost-breakdown`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  // Close on outside click
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expanded])

  return (
    <span className="relative" ref={panelRef}>
      <button
        onClick={loadBreakdown}
        className="text-xs"
        style={{ color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.7 }}
      >
        {formatCost(totalCost)}{totalTimeMs != null ? ` · ${Math.round(totalTimeMs / 1000)}s` : ''}
      </button>
      {expanded && (
        <div
          className="absolute top-6 right-0 z-30 rounded-xl p-4 min-w-[320px]"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
        >
          {loading ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          ) : data ? (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                  Generation Costs
                </p>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent, #BA7517)' }}>
                  {formatCost(data.total_cost)} · {data.total_calls} calls
                </span>
              </div>

              {/* Cost by stage */}
              {data.breakdown.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {data.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                        <span className="ml-1.5" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                          {item.models.map(formatModel).join(', ')}
                        </span>
                      </div>
                      <span className="tabular-nums font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                        {formatCost(item.total_cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timings */}
              {data.timings && (
                <>
                  <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                      Generation Time
                    </p>

                    {/* Visual bar for each phase */}
                    <div className="space-y-1">
                      {Object.entries(TIMING_MAP).map(([timingKey, callTypes]) => {
                        const ms = data.timings?.[timingKey]
                        if (ms == null || ms === 0) return null
                        const totalMs = data.timings?.total_ms ?? 1
                        const pct = Math.min(100, Math.max(2, (ms / totalMs) * 100))
                        // Find matching breakdown items for cost
                        const stageCost = data.breakdown
                          .filter(b => callTypes.includes(b.call_type))
                          .reduce((sum, b) => sum + b.total_cost, 0)

                        return (
                          <div key={timingKey}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                {TIMING_LABELS[timingKey] ?? timingKey}
                              </span>
                              <span className="tabular-nums" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                {formatMs(ms)}{stageCost > 0 ? ` · ${formatCost(stageCost)}` : ''}
                              </span>
                            </div>
                            <div
                              className="rounded-full h-1.5"
                              style={{ backgroundColor: 'var(--border)' }}
                            >
                              <div
                                className="rounded-full h-1.5"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: 'var(--accent, #BA7517)',
                                  opacity: 0.7,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Total time */}
                    {data.timings.total_ms != null && (
                      <div className="flex items-center justify-between text-xs font-semibold mt-2 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>Total time</span>
                        <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
                          {formatMs(data.timings.total_ms)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No breakdown available</p>
          )}
        </div>
      )}
    </span>
  )
}

// VisibilityPill removed — now part of EditorBar

