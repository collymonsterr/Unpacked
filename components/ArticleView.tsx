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
import ArticleVoting from './ui/ArticleVoting'
import FactCheckBar, { FactCheckBadge } from './ui/FactCheckBar'
import FirstDraftBanner from './FirstDraftBanner'
import MenuItem from './article/MenuItem'
import DebugPanel from './article/DebugPanel'
import HeroImage from './article/HeroImage'
import AdminMenu from './article/AdminMenu'
import { buildNavItems } from '@/lib/section-ids'
import { getReadingTime } from '@/lib/reading-time'
import { ARTICLE_TYPE_LABELS } from '@/lib/article-config'
import { useUser } from '@/hooks/useUser'
import SignInNudge from './ui/SignInNudge'

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
}

export default function ArticleView({ articleRow, isOwner, isAdmin = false, isNew, factCheckStatus = 'none', linkableArticles, creatorBio, creatorTwitterUrl, creatorLinkedinUrl }: Props) {
  const router = useRouter()
  const { user } = useUser()
  const [article, setArticle] = useState(articleRow.article!)
  const [chips, setChips] = useState(articleRow.suggestion_chips)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [refineSuccess, setRefineSuccess] = useState(false)
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false)
  const [isRegeneratingArticle, setIsRegeneratingArticle] = useState(false)
  const [toolbarBusy, setToolbarBusy] = useState<string | null>(null)
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
          {(ARTICLE_TYPE_LABELS as Record<string, string>)[article.article_type] ?? article.article_type.replace(/_/g, ' ')}
        </p>
        {articleRow.user_name && (
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/creator/${articleRow.user_id}`}
              className="flex items-center gap-3 no-underline hover:opacity-80 transition-opacity"
            >
              {articleRow.user_avatar && (
                <img
                  src={articleRow.user_avatar}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex flex-col">
                <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {articleRow.user_name}
                </span>
                {creatorBio && (
                  <span className="text-sm line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                    {creatorBio}
                  </span>
                )}
              </div>
            </Link>
            {creatorTwitterUrl && (
              <a
                href={creatorTwitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="X / Twitter"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
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
          currentSlug={articleRow.slug}
          linkableArticles={linkableArticles}
          onReplaceImage={handleReplaceImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onArticleUpdated={(updated) => setArticle(updated)}
        />
      )}

      {/* ─── Bottom sections (hidden in print) ─── */}

      {/* Voting — helpfulness + verdict conviction */}
      <ArticleVoting
        articleId={articleRow.id}
        hasVerdict={!!article.quick_verdict?.one_liner}
      />

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
        articleId={articleRow.id}
        initialVisibility={articleRow.visibility ?? 'private'}
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
        factCheckStatus={factCheckStatus}
        factCheck={articleRow.fact_check}
        onPrefillRefine={(text) => {
          setRefineValue(text)
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

