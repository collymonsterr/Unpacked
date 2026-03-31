'use client'

import { useState, useCallback } from 'react'
import type { ArticleRow } from '@/types/article'

type ResearchPreviewData = NonNullable<ArticleRow['research_preview']>

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

interface Props {
  preview: ResearchPreviewData
  query: string
  articleId?: string
}

export default function ResearchPreview({ preview, query, articleId }: Props) {
  const [currentType, setCurrentType] = useState(preview.article_type)
  const [switching, setSwitching] = useState(false)
  const typeLabel = TYPE_LABELS[currentType] ?? currentType.replace(/_/g, ' ')

  const hasAlternatives = preview.alternative_types && preview.alternative_types.length > 0
    && (preview.article_type_confidence ?? 100) < 90

  const handleTypeSwitch = useCallback(async (newType: string) => {
    if (!articleId || switching) return
    setSwitching(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/switch-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      })
      if (res.ok) {
        setCurrentType(newType)
      }
    } catch {
      // Silently fail — type switch is optional
    } finally {
      setSwitching(false)
    }
  }, [articleId, switching])

  return (
    <div className="max-w-[900px] mx-auto px-4 pt-10 pb-32">
      {/* Type badge + alternatives */}
      <div className="mb-4">
        <span
          className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          {typeLabel}
        </span>
        {hasAlternatives && (
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Also works as:
            </span>
            {preview.alternative_types!.map((altType) => (
              <button
                key={altType}
                onClick={() => handleTypeSwitch(altType)}
                disabled={switching || altType === currentType}
                className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: altType === currentType ? 'var(--accent-light)' : 'transparent',
                  color: altType === currentType ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: switching ? 'wait' : 'pointer',
                  opacity: switching ? 0.6 : 1,
                }}
              >
                {TYPE_LABELS[altType] ?? altType.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Article title */}
      <h1
        className="text-3xl md:text-4xl font-extrabold leading-tight mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {preview.title}
      </h1>

      {/* Teaser line */}
      {preview.teaser_line && (
        <p
          className="text-lg mb-8 leading-relaxed"
          style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}
        >
          {preview.teaser_line}
        </p>
      )}

      {/* Research findings card */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          backgroundColor: '#fff',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            Research complete
          </p>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>
            {preview.source_quality
              ? preview.source_quality
              : `${preview.source_count} sources found`}
          </span>
        </div>

        {/* Entities found */}
        {preview.entities_found.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
              {preview.article_type === 'buyer_guide' || preview.article_type === 'comparison' || preview.article_type === 'roundup'
                ? 'Contenders found'
                : 'Key topics'}
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.entities_found.map((entity) => (
                <span
                  key={entity}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg"
                  style={{
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {preview.source_names.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
              Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.source_names.map((source) => (
                <span
                  key={source}
                  className="text-xs px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: '#f5f5f3',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Article structure preview (skeleton) */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: '#fff',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)' }}>
          Your article will include
        </p>
        <div className="space-y-3">
          {/* Skeleton content lines */}
          <SkeletonLine width="100%" />
          <SkeletonLine width="92%" />
          <SkeletonLine width="85%" />
          <div className="py-2" />
          <SkeletonLine width="70%" />
          <SkeletonLine width="95%" />
          <SkeletonLine width="88%" />
          <div className="py-2" />
          <SkeletonLine width="60%" />
          <SkeletonLine width="78%" />
        </div>
      </div>

      {/* Query reminder */}
      <p className="text-xs mt-6 text-center" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
        &ldquo;{query}&rdquo;
      </p>
    </div>
  )
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-3 rounded-full"
      style={{
        width,
        backgroundColor: '#f0efed',
      }}
    />
  )
}
