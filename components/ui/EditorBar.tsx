'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { ArticleVisibility } from '@/types/article'

const VISIBILITY_OPTIONS = [
  { value: 'published', label: 'Published', color: '#059669', bg: '#ecfdf5', border: '#bbf7d0', desc: 'Visible on homepage' },
  { value: 'unlisted', label: 'Unlisted', color: '#d97706', bg: '#fffbeb', border: '#fde68a', desc: 'Link only' },
  { value: 'private', label: 'Private', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', desc: 'Only you' },
] as const

interface Props {
  articleId: string
  articleSlug: string
  visibility: ArticleVisibility
  unusedFindingsCount: number
  onOpenSharePanel: () => void
  onSwitchToEditor: () => void
  onExportPDF: () => void
  isNew?: boolean
}

/**
 * EditorBar — persistent owner-only toolbar between article metadata and hero image.
 * Six actions: Sections · Images · Research (badge) · Share · Export · Visibility
 * Plus contextual helper text that rotates based on article state.
 */
export default function EditorBar({
  articleId,
  articleSlug,
  visibility: initialVisibility,
  unusedFindingsCount,
  onOpenSharePanel,
  onSwitchToEditor,
  onExportPDF,
  isNew,
}: Props) {
  const [visibility, setVisibility] = useState(initialVisibility)
  const [visOpen, setVisOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const visRef = useRef<HTMLDivElement>(null)

  const current = VISIBILITY_OPTIONS.find(o => o.value === visibility) ?? VISIBILITY_OPTIONS[0]

  // Close visibility dropdown on outside click
  useEffect(() => {
    if (!visOpen) return
    function handleClick(e: MouseEvent) {
      if (visRef.current && !visRef.current.contains(e.target as Node)) setVisOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [visOpen])

  const handleVisibilityChange = useCallback(async (newVisibility: ArticleVisibility) => {
    if (newVisibility === visibility || saving) return
    setSaving(true)
    setVisOpen(false)
    try {
      const res = await fetch(`/api/articles/${articleId}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      if (res.ok) setVisibility(newVisibility)
    } catch {}
    setSaving(false)
  }, [articleId, visibility, saving])

  // Scroll to first section for "Sections" button
  const handleScrollToSections = useCallback(() => {
    const el = document.getElementById('section-0')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Contextual helper text
  const helperText = (() => {
    if (isNew && visibility !== 'published') {
      return 'Your article is ready. Make it public when you\'re happy with it.'
    }
    if (unusedFindingsCount > 0) {
      return `${unusedFindingsCount} research finding${unusedFindingsCount === 1 ? '' : 's'} weren't used — open the Editor to add them.`
    }
    if (visibility === 'published') {
      return 'Share this article to earn bonus articles.'
    }
    return null
  })()

  return (
    <div
      className="mb-4"
      data-no-print
      style={{
        backgroundColor: '#FAFAF8',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 14px',
      }}
    >
      {/* Action buttons row */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Sections */}
        <BarButton
          icon={<SectionsIcon />}
          label="Sections"
          onClick={handleScrollToSections}
        />

        {/* Images — scroll to hero */}
        <BarButton
          icon={<ImagesIcon />}
          label="Images"
          onClick={() => {
            const hero = document.querySelector('[data-hero-image]') || document.querySelector('.hero-image-container')
            if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />

        {/* Research — opens Editor tab, shows badge */}
        <BarButton
          icon={<ResearchIcon />}
          label="Research"
          badge={unusedFindingsCount > 0 ? unusedFindingsCount : undefined}
          onClick={onSwitchToEditor}
        />

        {/* Edit — full-document editor */}
        <Link
          href={`/article/${articleSlug}/edit`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/[0.04]"
          style={{
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-sora)',
            textDecoration: 'none',
          }}
        >
          <EditIcon />
          <span className="hidden sm:inline">Edit</span>
        </Link>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />

        {/* Share */}
        <BarButton
          icon={<ShareIcon />}
          label="Share"
          onClick={onOpenSharePanel}
        />

        {/* Export */}
        <BarButton
          icon={<ExportIcon />}
          label="Export"
          onClick={onExportPDF}
        />

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />

        {/* Visibility dropdown */}
        <div className="relative" ref={visRef}>
          <button
            onClick={() => setVisOpen(!visOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: current.bg,
              color: current.color,
              border: `1px solid ${current.border}`,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'var(--font-sora)',
            }}
          >
            <span className="hidden sm:inline">{current.label}</span>
            <span className="sm:hidden">{current.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {visOpen && (
            <div
              className="absolute top-8 right-0 z-30 rounded-lg py-1 min-w-[160px]"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleVisibilityChange(opt.value as ArticleVisibility)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between transition-colors"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: visibility === opt.value ? opt.bg : 'transparent',
                    border: 'none',
                  }}
                  onMouseEnter={e => { if (visibility !== opt.value) e.currentTarget.style.backgroundColor = '#FAFAF8' }}
                  onMouseLeave={e => { if (visibility !== opt.value) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div>
                    <p className="text-xs font-medium" style={{ color: opt.color }}>{opt.label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{opt.desc}</p>
                  </div>
                  {visibility === opt.value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={opt.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contextual helper text */}
      {helperText && (
        <p
          className="mt-2 text-[11px]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
        >
          {helperText}
        </p>
      )}
    </div>
  )
}

// ── Shared button component ──

function BarButton({ icon, label, badge, onClick }: {
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/[0.04]"
      style={{
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        fontFamily: 'var(--font-sora)',
        position: 'relative',
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="inline-flex items-center justify-center text-[9px] font-bold rounded-full"
          style={{
            backgroundColor: '#BA7517',
            color: '#fff',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            fontFamily: 'var(--font-sora)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Icons (14×14, stroke-based) ──

function SectionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function ImagesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function ResearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
