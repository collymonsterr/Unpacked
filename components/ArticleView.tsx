'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { ArticleRow, ProductCard, VisualStrategy } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'
import QuickVerdict from './sections/QuickVerdict'
import ExecutiveSummary from './sections/ExecutiveSummary'
import SectionRenderer from './sections/SectionRenderer'
import SuggestionChips from './ui/SuggestionChips'
import RefinementInput from './ui/RefinementInput'

interface Props {
  articleRow: ArticleRow
  isOwner: boolean
}

export default function ArticleView({ articleRow, isOwner }: Props) {
  const router = useRouter()
  const [article, setArticle] = useState(articleRow.article!)
  const [chips, setChips] = useState(articleRow.suggestion_chips)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false)
  const [isRegeneratingArticle, setIsRegeneratingArticle] = useState(false)
  const [isPinned, setIsPinned] = useState(articleRow.pinned ?? false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toolbarBusy, setToolbarBusy] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

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
      if (!res.ok) throw new Error('Failed')
      // Re-fetch the full article
      const articleRes = await fetch(`/api/articles/${articleRow.id}`)
      if (!articleRes.ok) throw new Error('Failed to fetch')
      const data = await articleRes.json()
      setArticle(data.article)
      setChips(data.suggestion_chips)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      // silently fail
    } finally {
      setIsRegeneratingArticle(false)
      setToolbarBusy(null)
    }
  }

  async function handleTogglePin() {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    try {
      const res = await fetch(`/api/articles/${articleRow.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      })
      if (!res.ok) setIsPinned(!newPinned) // revert on failure
    } catch {
      setIsPinned(!newPinned)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/articles/${articleRow.id}/delete`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed')
      router.push('/')
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
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

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      {/* Header */}
      <div className="mb-6 relative">
        <div className="flex items-start justify-between mb-3">
          <ArticleTypeBadge type={article.article_type} />

          {/* Admin menu — small gear icon */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: menuOpen ? 'var(--accent-light)' : 'transparent',
                }}
                title="Article settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => { setMenuOpen(false); setShowDeleteConfirm(false) }}
                  />
                  <div
                    className="absolute right-0 top-10 z-20 w-52 rounded-xl overflow-hidden py-1"
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    <MenuItem
                      onClick={() => { handleTogglePin(); setMenuOpen(false) }}
                      disabled={!!toolbarBusy}
                    >
                      {isPinned ? 'Unpin from Homepage' : 'Pin to Homepage'}
                    </MenuItem>
                    <MenuItem
                      onClick={() => { handleRegenerateImages(); setMenuOpen(false) }}
                      disabled={!!toolbarBusy}
                      loading={isRegeneratingImages}
                    >
                      Regenerate Images
                    </MenuItem>
                    <MenuItem
                      onClick={() => { handleRegenerateArticle(); setMenuOpen(false) }}
                      disabled={!!toolbarBusy}
                      loading={isRegeneratingArticle}
                    >
                      Regenerate Article
                    </MenuItem>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                    {showDeleteConfirm ? (
                      <div className="px-3 py-2">
                        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Delete this article?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="text-xs font-semibold px-3 py-1 rounded-lg text-white disabled:opacity-50"
                            style={{ backgroundColor: '#dc2626' }}
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="text-xs px-3 py-1 rounded-lg"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <MenuItem
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={!!toolbarBusy}
                        danger
                      >
                        Delete Article
                      </MenuItem>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <h1
          className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {article.title}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Generated {formattedDate}
        </p>
      </div>

      {/* Debug panel — dev mode only */}
      {process.env.NODE_ENV === 'development' && articleRow.plan?.visual_strategy && (
        <DebugPanel
          articleType={article.article_type}
          visualStrategy={articleRow.plan.visual_strategy}
          sections={article.sections.map((s) => s.type)}
        />
      )}

      <div className="mb-8" style={{ borderTop: '1px solid var(--border)' }} />

      {/* Quick Verdict */}
      <QuickVerdict data={article.quick_verdict} />

      {/* Hero Image */}
      {article.thumbnail_url && (
        <HeroImage
          url={article.thumbnail_url}
          alt={article.title}
          isAdmin={isOwner}
          onReplace={async () => {
            try {
              const res = await fetch(`/api/articles/${articleRow.id}/replace-thumbnail`, {
                method: 'POST',
              })
              if (!res.ok) throw new Error('Failed')
              const data = await res.json()
              if (data.article) setArticle(data.article)
            } catch {
              // silently fail
            }
          }}
        />
      )}

      {/* Executive Summary */}
      <ExecutiveSummary data={article.executive_summary} />

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
          onReplaceImage={handleReplaceImage}
          onSetPrimaryImage={handleSetPrimaryImage}
        />
      )}

      {/* Owner-only: refinement controls */}
      {isOwner && (
        <div className="mt-8">
          {refineError && (
            <p className="text-sm text-red-600 mb-3">{refineError}</p>
          )}
          <RefinementInput onSubmit={handleRefine} isLoading={isRefining} />
          {chips && (
            <SuggestionChips
              chips={chips}
              articleId={articleRow.id}
              onRefine={handleRefine}
              isRefining={isRefining}
            />
          )}
        </div>
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

function MenuItem({
  children,
  onClick,
  disabled,
  loading,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full text-left text-sm px-3 py-2 transition-colors disabled:opacity-40"
      style={{
        color: danger ? '#dc2626' : 'var(--text-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? '#fef2f2' : 'var(--accent-light)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Working...
        </span>
      ) : (
        children
      )}
    </button>
  )
}

function DebugPanel({
  articleType,
  visualStrategy,
  sections,
}: {
  articleType: string
  visualStrategy: VisualStrategy
  sections: string[]
}) {
  const [open, setOpen] = useState(false)

  const sectionCounts = sections.reduce<Record<string, number>>((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1
    return acc
  }, {})

  const enabled = Object.entries(visualStrategy)
    .filter(([k, v]) => k.startsWith('use_') && v === true)
    .map(([k]) => k.replace('use_', ''))

  const disabled = Object.entries(visualStrategy)
    .filter(([k, v]) => k.startsWith('use_') && v === false)
    .map(([k]) => k.replace('use_', ''))

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-mono px-3 py-1 rounded"
        style={{ backgroundColor: '#1a1a2e', color: '#00d4aa' }}
      >
        {open ? '▼' : '▶'} Debug: {articleType} / {visualStrategy.image_density} images
      </button>
      {open && (
        <div
          className="mt-2 p-4 rounded-lg text-xs font-mono leading-relaxed"
          style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}
        >
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Article Type:</span> {articleType}
          </div>
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Image Density:</span> {visualStrategy.image_density}
          </div>
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Enabled:</span>{' '}
            {enabled.map((c) => (
              <span key={c} className="inline-block mr-1 px-1 rounded" style={{ backgroundColor: '#0d3320', color: '#4ade80' }}>
                {c}
              </span>
            ))}
          </div>
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Disabled:</span>{' '}
            {disabled.map((c) => (
              <span key={c} className="inline-block mr-1 px-1 rounded" style={{ backgroundColor: '#3b1c1c', color: '#f87171' }}>
                {c}
              </span>
            ))}
          </div>
          <div>
            <span style={{ color: '#00d4aa' }}>Sections rendered:</span>{' '}
            {Object.entries(sectionCounts).map(([type, count]) => (
              <span key={type} className="inline-block mr-1 px-1 rounded" style={{ backgroundColor: '#1e293b', color: '#93c5fd' }}>
                {type}{count > 1 ? ` ×${count}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HeroImage({
  url,
  alt,
  isAdmin,
  onReplace,
}: {
  url: string
  alt: string
  isAdmin?: boolean
  onReplace?: () => Promise<void>
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [replacing, setReplacing] = useState(false)

  if (error) return null

  async function handleReplace() {
    if (!onReplace || replacing) return
    setReplacing(true)
    try {
      await onReplace()
      setLoaded(false)
    } finally {
      setReplacing(false)
    }
  }

  return (
    <figure
      className="rounded-2xl overflow-hidden mb-8 group"
      style={{
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <Image
          src={url}
          alt={alt}
          fill
          className="object-cover transition-opacity duration-500"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          unoptimized
        />
        {isAdmin && onReplace && (
          <button
            onClick={handleReplace}
            disabled={replacing}
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
            title="Replace hero image"
          >
            {replacing ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Replacing…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                Replace image
              </>
            )}
          </button>
        )}
      </div>
    </figure>
  )
}
