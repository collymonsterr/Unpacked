'use client'

import { useState } from 'react'

interface Finding {
  id: string
  source: string
  source_type: 'web' | 'reddit' | 'twitter'
  url: string
  content: string
  used_in_article: boolean
}

interface FindingCardProps {
  finding: Finding
  isUsed: boolean
  isSelectedForAdd: boolean
  isSelectedForRemove: boolean
  sectionName?: string
  onToggle: () => void
}

const SOURCE_BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  web: { bg: '#eff6ff', color: '#2563eb', label: 'WEB' },
  reddit: { bg: '#fff7ed', color: '#ea580c', label: 'REDDIT' },
  twitter: { bg: '#f5f5f4', color: '#78716c', label: 'TWITTER' },
}

export default function FindingCard({
  finding,
  isUsed,
  isSelectedForAdd,
  isSelectedForRemove,
  sectionName,
  onToggle,
}: FindingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isSelected = isSelectedForAdd || isSelectedForRemove

  const badge = SOURCE_BADGE_STYLES[finding.source_type] ?? SOURCE_BADGE_STYLES.web
  const contentLines = finding.content.split('\n').filter(Boolean)
  const snippet = contentLines.slice(0, 3).join(' ')
  const isLong = finding.content.length > 200

  // Extract display domain from URL
  const sourceDomain = (() => {
    if (!finding.url) return null
    try {
      const url = new URL(finding.url)
      const hostname = url.hostname.replace(/^www\./, '')
      // For Reddit, try to show subreddit
      if (finding.source_type === 'reddit' || hostname.includes('reddit.com')) {
        const match = url.pathname.match(/\/r\/([^/]+)/)
        if (match) return `reddit.com/r/${match[1]}`
        return 'reddit.com'
      }
      return hostname
    } catch {
      return null
    }
  })()

  return (
    <div
      className="relative rounded-lg transition-all"
      style={{
        border: `1px solid ${isSelected ? '#BA7517' : '#E8E3DC'}`,
        borderLeft: isSelected ? '3px solid #BA7517' : '1px solid #E8E3DC',
        backgroundColor: isSelected ? '#FFFBF5' : '#fff',
      }}
    >
      <div className="px-3 py-2.5">
        {/* Header row: source name + badge + action */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isSelected && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#BA7517"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            <a
              href={finding.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold truncate hover:underline"
              style={{ color: 'var(--text-primary)' }}
              title={finding.source}
            >
              {finding.source}
            </a>
            <span
              className="flex-shrink-0 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>

          {/* Action button */}
          {isUsed ? (
            <button
              onClick={onToggle}
              className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              style={{
                color: isSelectedForRemove ? '#dc2626' : '#78716c',
                border: `1px solid ${isSelectedForRemove ? '#fecaca' : 'transparent'}`,
                backgroundColor: isSelectedForRemove ? '#fef2f2' : 'transparent',
                cursor: 'pointer',
                // Always show on touch devices and when selected
                ...(isSelectedForRemove ? { opacity: 1 } : {}),
              }}
            >
              {isSelectedForRemove ? 'Undo remove' : 'Remove'}
            </button>
          ) : (
            <button
              onClick={onToggle}
              className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded transition-all"
              style={{
                color: isSelectedForAdd ? '#BA7517' : '#BA7517',
                border: `1px solid ${isSelectedForAdd ? '#BA7517' : '#E8E3DC'}`,
                backgroundColor: isSelectedForAdd ? '#FFF8EE' : '#fff',
                cursor: 'pointer',
              }}
            >
              {isSelectedForAdd ? 'Added ✓' : 'Add to article'}
            </button>
          )}
        </div>

        {/* Content snippet */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {expanded ? finding.content : snippet}
          {!expanded && isLong && '…'}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs mt-1"
            style={{ color: '#BA7517', cursor: 'pointer' }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Section reference (for used findings) */}
        {sectionName && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Used in: <span className="font-medium">{sectionName}</span>
          </p>
        )}

        {/* Source link */}
        {sourceDomain && finding.url && (
          <a
            href={finding.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] mt-1.5 hover:underline"
            style={{ color: '#94918D' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            via {sourceDomain}
          </a>
        )}
      </div>
    </div>
  )
}
