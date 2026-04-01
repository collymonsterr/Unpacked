'use client'

import { useState } from 'react'
import { ARTICLE_TYPES, type ArticleType } from '@/lib/article-types'

interface RewriteControlsProps {
  articleId: string
  addCount: number
  removeCount: number
  instructions: string
  onInstructionsChange: (v: string) => void
  onRewrite: () => void
  isRewriting: boolean
  rewriteResult: { success: boolean; newSlug?: string; error?: string } | null
  currentSlug: string
  currentType: string
  alternativeTypes: string[]
  onSwitchType: (newType: string) => void
  isSwitching: boolean
}

export default function RewriteControls({
  articleId,
  addCount,
  removeCount,
  instructions,
  onInstructionsChange,
  onRewrite,
  isRewriting,
  rewriteResult,
  currentSlug,
  currentType,
  alternativeTypes,
  onSwitchType,
  isSwitching,
}: RewriteControlsProps) {
  const [showTypeConfirm, setShowTypeConfirm] = useState<string | null>(null)
  const hasChanges = addCount > 0 || removeCount > 0 || instructions.trim().length > 0

  // Build changes summary
  const parts: string[] = []
  if (addCount > 0) parts.push(`Adding ${addCount} finding${addCount !== 1 ? 's' : ''}`)
  if (removeCount > 0) parts.push(`Removing ${removeCount} finding${removeCount !== 1 ? 's' : ''}`)
  const summary = parts.length > 0 ? parts.join(' · ') : 'No changes selected'

  // All available types for switching (current + alternatives)
  const allTypes = Object.keys(ARTICLE_TYPES) as ArticleType[]
  const switchableTypes = allTypes.filter(t => t !== currentType)

  return (
    <div
      className="rounded-xl p-4 mt-6"
      style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}
    >
      {/* Changes summary */}
      <p
        className="text-sm font-medium mb-3"
        style={{ color: hasChanges ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {summary}
      </p>

      {/* Instructions textarea */}
      <textarea
        value={instructions}
        onChange={e => onInstructionsChange(e.target.value)}
        placeholder="Any specific instructions? e.g., 'emphasise the budget options more' or 'make the verdict stronger'"
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-sm resize-none transition-colors"
        style={{
          border: '1px solid #E8E3DC',
          backgroundColor: '#FAFAF8',
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#BA7517' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#E8E3DC' }}
        disabled={isRewriting}
      />

      {/* Rewrite button */}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={onRewrite}
          disabled={!hasChanges || isRewriting}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            backgroundColor: hasChanges && !isRewriting ? '#BA7517' : '#d4c9b8',
            color: '#fff',
            cursor: hasChanges && !isRewriting ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-sora)',
          }}
        >
          {isRewriting ? (
            <span className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"
                style={{ borderColor: '#fff', borderTopColor: 'transparent' }}
              />
              Rewriting — about 30 seconds...
            </span>
          ) : (
            'Rewrite with changes'
          )}
        </button>

        {!isRewriting && hasChanges && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Uses existing research — fast and free
          </p>
        )}
      </div>

      {/* Success state */}
      {rewriteResult?.success && rewriteResult.newSlug && (
        <div
          className="mt-3 p-3 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0' }}
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-sm font-medium" style={{ color: '#059669' }}>
              Article updated successfully
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/article/${rewriteResult.newSlug}`}
              className="text-sm font-semibold no-underline"
              style={{ color: '#059669' }}
            >
              View new version →
            </a>
            <a
              href={`/article/${currentSlug}`}
              className="text-xs no-underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Undo
            </a>
          </div>
        </div>
      )}

      {/* Error state */}
      {rewriteResult?.error && (
        <p className="mt-3 text-sm" style={{ color: '#dc2626' }}>
          {rewriteResult.error}
        </p>
      )}

      {/* Article type switch — separate section */}
      {switchableTypes.length > 0 && (
        <div
          className="mt-4 pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2"
          style={{ borderTop: '1px solid #E8E3DC' }}
        >
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Regenerate as:
          </label>
          <select
            value=""
            onChange={e => {
              if (e.target.value) setShowTypeConfirm(e.target.value)
            }}
            disabled={isSwitching || isRewriting}
            className="text-sm rounded-lg px-3 py-1.5"
            style={{
              border: '1px solid #E8E3DC',
              backgroundColor: '#FAFAF8',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sora)',
            }}
          >
            <option value="">
              {currentType ? (ARTICLE_TYPES[currentType as ArticleType]?.label ?? currentType) : 'Select type'}
            </option>
            {switchableTypes.map(t => (
              <option key={t} value={t}>
                {ARTICLE_TYPES[t].label}
              </option>
            ))}
          </select>

          {isSwitching && (
            <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span
                className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin inline-block"
                style={{ borderColor: '#BA7517', borderTopColor: 'transparent' }}
              />
              Rewriting with new type...
            </span>
          )}
        </div>
      )}

      {/* Type switch confirmation dialog */}
      {showTypeConfirm && (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ backgroundColor: '#FFF8EE', border: '1px solid #F5D5A0' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            Switch to <strong>{ARTICLE_TYPES[showTypeConfirm as ArticleType]?.label ?? showTypeConfirm}</strong>?
            This will rewrite your article with a different structure and focus. Uses 1 article credit.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSwitchType(showTypeConfirm)
                setShowTypeConfirm(null)
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#BA7517', color: '#fff', cursor: 'pointer' }}
            >
              Switch type
            </button>
            <button
              onClick={() => setShowTypeConfirm(null)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                border: '1px solid #E8E3DC',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                backgroundColor: '#fff',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
