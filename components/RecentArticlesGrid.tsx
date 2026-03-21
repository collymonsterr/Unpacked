'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ArticleRow, ProductCard } from '@/types/article'
import { useAdminMode } from '@/hooks/useAdminMode'

interface Props {
  articles: ArticleRow[]
}

function getCardImage(row: ArticleRow): string | null {
  if (row.article?.thumbnail_url) return row.article.thumbnail_url
  const sections = row.article?.sections ?? []
  const firstCard = sections.find((s): s is ProductCard => s.type === 'product_card')
  return firstCard?.image_urls?.[0] ?? firstCard?.image_url ?? null
}

function getArticleTypeLabel(type: string) {
  const labels: Record<string, string> = {
    buyer_guide: 'Buyer Guide',
    comparison: 'Comparison',
    decision_guide: 'Decision Guide',
    explainer: 'Explainer',
    news: 'News',
    planning: 'Planning Guide',
    trend_analysis: 'Trend Analysis',
    tutorial: 'Tutorial',
  }
  return labels[type] ?? type.replace(/_/g, ' ')
}

// ── Sortable Article Card ────────────────────────────────────────────────────

function SortableArticleCard({
  row,
  isAdmin,
}: {
  row: ArticleRow
  isAdmin: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  const imageUrl = getCardImage(row)
  const title = row.article?.title ?? row.plan?.title ?? row.query
  const type = row.article?.article_type ?? row.plan?.article_type ?? 'buyer_guide'

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Link
        href={`/article/${row.slug}`}
        className="block rounded-2xl overflow-hidden no-underline"
        style={{
          backgroundColor: 'var(--card)',
          boxShadow: isDragging
            ? '0 8px 32px rgba(0,0,0,0.15)'
            : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-end p-4">
              <span
                className="text-sm font-bold leading-snug line-clamp-2"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
              >
                {title}
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {getArticleTypeLabel(type)}
          </span>
          <h3
            className="font-bold leading-snug line-clamp-3 text-sm"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)', minHeight: '3.6em' }}
          >
            {title}
          </h3>
        </div>
      </Link>

      {/* Admin: drag handle */}
      {isAdmin && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
          title="Drag to reorder"
          onClick={(e) => e.preventDefault()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Type Filters ─────────────────────────────────────────────────────────────

const TYPE_FILTERS: Array<{ label: string; value: string | null }> = [
  { label: 'All', value: null },
  { label: 'Buyer Guides', value: 'buyer_guide' },
  { label: 'Comparisons', value: 'comparison' },
  { label: 'Decision Guides', value: 'decision_guide' },
  { label: 'Explainers', value: 'explainer' },
]

// ── Main Grid Component ──────────────────────────────────────────────────────

export default function RecentArticlesGrid({ articles: initialArticles }: Props) {
  const isAdmin = useAdminMode()
  const [articles, setArticles] = useState(initialArticles)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'manual' | 'newest'>('manual')
  const [saving, setSaving] = useState(false)
  const [visibleCount, setVisibleCount] = useState(24)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const sortedArticles = sortMode === 'newest'
    ? [...articles].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : articles

  const filteredArticles = activeFilter
    ? sortedArticles.filter((a) => {
        const type = a.article?.article_type ?? a.plan?.article_type
        return type === activeFilter
      })
    : sortedArticles

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = articles.findIndex((a) => a.id === active.id)
    const newIndex = articles.findIndex((a) => a.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic reorder
    const newArticles = arrayMove(articles, oldIndex, newIndex)
    setArticles(newArticles)
    setSortMode('manual') // Switch to manual mode after drag

    // Save new order to API
    setSaving(true)
    try {
      const orderedIds = newArticles.map((a) => a.id)
      await fetch('/api/articles/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
    } catch {
      // Revert on failure
      setArticles(articles)
    } finally {
      setSaving(false)
    }
  }, [articles])

  if (articles.length === 0) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 pb-16">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-secondary)' }}
          >
            Recent Articles
          </h2>
          {saving && (
            <span className="text-xs" style={{ color: 'var(--accent)' }}>Saving...</span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort toggle — admin only */}
          {isAdmin && (
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setSortMode('manual')}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: sortMode === 'manual' ? 'var(--accent)' : 'transparent',
                  color: sortMode === 'manual' ? '#fff' : 'var(--text-secondary)',
                }}
              >
                Manual order
              </button>
              <button
                onClick={() => setSortMode('newest')}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: sortMode === 'newest' ? 'var(--accent)' : 'transparent',
                  color: sortMode === 'newest' ? '#fff' : 'var(--text-secondary)',
                }}
              >
                Newest first
              </button>
            </div>
          )}

          {/* Type filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_FILTERS.map(({ label, value }) => {
              const isActive = activeFilter === value
              return (
                <button
                  key={label}
                  onClick={() => setActiveFilter(value)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {(() => {
        const visibleArticles = filteredArticles.slice(0, visibleCount)
        const hasMore = filteredArticles.length > visibleCount

        return (
          <>
            {isAdmin && sortMode === 'manual' && !activeFilter ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={visibleArticles.map(a => a.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visibleArticles.map((row) => (
                      <SortableArticleCard
                        key={row.id}
                        row={row}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleArticles.map((row) => (
                  <SortableArticleCard
                    key={row.id}
                    row={row}
                    isAdmin={false}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'var(--card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Show more ({filteredArticles.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )
      })()}

      {filteredArticles.length === 0 && activeFilter && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No {TYPE_FILTERS.find((f) => f.value === activeFilter)?.label.toLowerCase()} yet.
        </p>
      )}
    </section>
  )
}
