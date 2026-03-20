'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

  const formattedDate = new Date(articleRow.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      {/* Admin Toolbar */}
      {isOwner && (
        <div
          className="mb-6 flex flex-wrap items-center gap-2 p-3 rounded-xl"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <ToolbarButton
            onClick={handleTogglePin}
            disabled={!!toolbarBusy}
            active={isPinned}
          >
            {isPinned ? 'Pinned' : 'Pin to Homepage'}
          </ToolbarButton>

          <ToolbarButton
            onClick={handleRegenerateImages}
            disabled={!!toolbarBusy}
            loading={isRegeneratingImages}
          >
            Regenerate Images
          </ToolbarButton>

          <ToolbarButton
            onClick={handleRegenerateArticle}
            disabled={!!toolbarBusy}
            loading={isRegeneratingArticle}
          >
            Regenerate Article
          </ToolbarButton>

          <div className="flex-1" />

          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Are you sure?
              </span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: '#dc2626' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <ToolbarButton
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!!toolbarBusy}
              variant="danger"
            >
              Delete
            </ToolbarButton>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="mb-3">
          <ArticleTypeBadge type={article.article_type} />
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
        <SectionRenderer sections={article.sections} animated />
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

function ToolbarButton({
  children,
  onClick,
  disabled,
  loading,
  active,
  variant = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  active?: boolean
  variant?: 'default' | 'danger'
}) {
  const isDanger = variant === 'danger'

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
      style={{
        backgroundColor: active
          ? 'var(--accent)'
          : isDanger
            ? 'transparent'
            : 'var(--accent-light)',
        color: active
          ? '#fff'
          : isDanger
            ? '#dc2626'
            : 'var(--accent)',
        border: isDanger ? '1px solid #fca5a5' : '1px solid transparent',
      }}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
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
