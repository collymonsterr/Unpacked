'use client'

import { useState, useEffect } from 'react'
import type { FactCheckResult } from '@/types/article'

interface Props {
  status: 'checking' | 'verified'
  factCheck?: FactCheckResult | null
}

export default function FactCheckBar({ status, factCheck }: Props) {
  const [visible, setVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Auto-hide after 10s if no issues
  useEffect(() => {
    if (status === 'verified' && !factCheck?.issues_found) {
      const timer = setTimeout(() => setVisible(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [status, factCheck])

  if (!visible) return null

  // Currently checking
  if (status === 'checking') {
    return (
      <div
        className="mt-8 rounded-xl px-5 py-4 flex items-center gap-3"
        style={{
          backgroundColor: 'var(--accent-light)',
          border: '1px solid #f0d5be',
        }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
            Fact-checking this article
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {' '}against live sources...
          </span>
        </p>
      </div>
    )
  }

  // Verified — no issues
  if (!factCheck?.issues_found) {
    return (
      <div
        className="mt-8 rounded-xl px-5 py-4 flex items-center gap-3 transition-opacity duration-1000"
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-sm" style={{ color: '#15803d' }}>
          <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
            Fact-check complete
          </span>
          {' — no issues found. Prices, specs, and claims verified.'}
        </p>
      </div>
    )
  }

  // Verified — with corrections
  const corrections = factCheck.issues.filter(i => i.severity !== 'note')
  const notes = factCheck.issues.filter(i => i.severity === 'note')

  return (
    <div
      className="mt-8 rounded-xl px-5 py-4"
      style={{
        backgroundColor: 'var(--accent-light)',
        border: '1px solid #f0d5be',
      }}
    >
      <div className="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
          <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
            Fact-check complete
          </span>
          {' — we found and corrected '}
          <span className="font-bold" style={{ color: 'var(--accent)' }}>
            {corrections.length} issue{corrections.length !== 1 ? 's' : ''}
          </span>
          .{notes.length > 0 && ` ${notes.length} additional note${notes.length !== 1 ? 's' : ''}.`}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold flex-shrink-0 underline"
          style={{ color: 'var(--accent)' }}
        >
          {expanded ? 'Hide details' : 'See what changed'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid #f0d5be' }}>
          {factCheck.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span
                className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                style={{
                  backgroundColor: issue.severity === 'critical' ? '#dc2626'
                    : issue.severity === 'minor' ? 'var(--accent)'
                    : '#94918D',
                  fontSize: 8,
                }}
              >
                {issue.severity === 'critical' ? '!' : issue.severity === 'minor' ? '~' : 'i'}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {issue.entity_name && (
                  <span className="font-semibold">{issue.entity_name}: </span>
                )}
                {issue.correction}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Small badge shown near the article title.
 */
export function FactCheckBadge({ factCheck }: { factCheck?: FactCheckResult | null }) {
  if (!factCheck) return null

  const corrections = factCheck.issues.filter(i => i.severity !== 'note').length

  if (corrections === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Verified
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #f0d5be' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      {corrections} correction{corrections !== 1 ? 's' : ''} applied
    </span>
  )
}
