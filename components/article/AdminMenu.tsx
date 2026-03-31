'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MenuItem from './MenuItem'
import type { ArticleVisibility } from '@/types/article'

interface AdminMenuProps {
  articleId: string
  articleType: string
  isAdmin: boolean
  isRegeneratingImages: boolean
  isRegeneratingArticle: boolean
  toolbarBusy: string | null
  initialPinned: boolean
  initialHidden: boolean
  initialFeatured?: boolean
  initialTrending?: boolean
  initialVisibility?: ArticleVisibility
  onRegenerateImages: () => void
  onRegenerateArticle: () => void
  onCategoryChange: (newType: string) => void
}

const VISIBILITY_OPTIONS: { value: ArticleVisibility; icon: string; label: string; desc: string }[] = [
  { value: 'private',   icon: '🔒', label: 'Private',   desc: 'Only you' },
  { value: 'unlisted',  icon: '🔗', label: 'Unlisted',  desc: 'Anyone with the link' },
  { value: 'published', icon: '🌐', label: 'Published', desc: 'Listed publicly' },
]

export default function AdminMenu({
  articleId,
  articleType,
  isAdmin,
  isRegeneratingImages,
  isRegeneratingArticle,
  toolbarBusy,
  initialPinned,
  initialHidden,
  initialFeatured = false,
  initialTrending = false,
  initialVisibility = 'published',
  onRegenerateImages,
  onRegenerateArticle,
  onCategoryChange,
}: AdminMenuProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(initialPinned)
  const [isHidden, setIsHidden] = useState(initialHidden)
  const [isFeatured, setIsFeatured] = useState(initialFeatured)
  const [isTrending, setIsTrending] = useState(initialTrending)
  const [visibility, setVisibility] = useState<ArticleVisibility>(initialVisibility)
  const [visibilityLoading, setVisibilityLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleTogglePin() {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    setMenuOpen(false)
    try {
      const res = await fetch(`/api/articles/${articleId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      })
      if (!res.ok) setIsPinned(!newPinned)
    } catch {
      setIsPinned(!newPinned)
    }
  }

  async function handleToggleHidden() {
    const newHidden = !isHidden
    setIsHidden(newHidden)
    setMenuOpen(false)
    try {
      const res = await fetch(`/api/articles/${articleId}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: newHidden }),
      })
      if (!res.ok) setIsHidden(!newHidden)
    } catch {
      setIsHidden(!newHidden)
    }
  }

  async function handleVisibilityChange(newVisibility: ArticleVisibility) {
    if (newVisibility === visibility || visibilityLoading) return
    const prev = visibility
    setVisibility(newVisibility) // optimistic
    setVisibilityLoading(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      if (!res.ok) setVisibility(prev)
    } catch {
      setVisibility(prev)
    } finally {
      setVisibilityLoading(false)
    }
  }

  async function handleToggleFeatured() {
    const newVal = !isFeatured
    setIsFeatured(newVal)
    setMenuOpen(false)
    try {
      const res = await fetch(`/api/articles/${articleId}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: newVal }),
      })
      if (!res.ok) setIsFeatured(!newVal)
    } catch {
      setIsFeatured(!newVal)
    }
  }

  async function handleToggleTrending() {
    const newVal = !isTrending
    setIsTrending(newVal)
    setMenuOpen(false)
    try {
      const res = await fetch(`/api/articles/${articleId}/trending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_trending: newVal }),
      })
      if (!res.ok) setIsTrending(!newVal)
    } catch {
      setIsTrending(!newVal)
    }
  }

  async function handleChangeCategory(newType: string) {
    onCategoryChange(newType)
    setShowCategoryPicker(false)
    setMenuOpen(false)
    try {
      await fetch(`/api/articles/${articleId}/update-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_type: newType }),
      })
    } catch {
      // Parent handles revert if needed
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/delete`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed')
      router.push('/')
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
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
            {/* Visibility selector — owner + admin */}
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Visibility
              </p>
              <div className="flex flex-col gap-0.5">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleVisibilityChange(opt.value)}
                    disabled={visibilityLoading}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      backgroundColor: visibility === opt.value ? 'var(--accent-light)' : 'transparent',
                      color: visibility === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: visibility === opt.value ? 600 : 400,
                      cursor: visibilityLoading ? 'wait' : 'pointer',
                    }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span className="ml-auto opacity-60" style={{ fontSize: '10px' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />

            {/* Admin-only actions */}
            {isAdmin && (
            <MenuItem
              onClick={handleTogglePin}
              disabled={!!toolbarBusy}
            >
              {isPinned ? 'Unpin from Homepage' : 'Pin to Homepage'}
            </MenuItem>
            )}
            {isAdmin && (
            <MenuItem
              onClick={handleToggleHidden}
              disabled={!!toolbarBusy}
            >
              {isHidden ? 'Show on Homepage' : 'Hide from Homepage'}
            </MenuItem>
            )}
            {isAdmin && (
            <MenuItem
              onClick={handleToggleFeatured}
              disabled={!!toolbarBusy}
            >
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isFeatured ? '#BA7517' : 'none'} stroke={isFeatured ? '#BA7517' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {isFeatured ? 'Remove from Featured' : 'Add to Featured'}
              </span>
            </MenuItem>
            )}
            {isAdmin && (
            <MenuItem
              onClick={handleToggleTrending}
              disabled={!!toolbarBusy}
            >
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isTrending ? '#BA7517' : 'none'} stroke={isTrending ? '#BA7517' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                {isTrending ? 'Remove from Trending' : 'Add to Trending'}
              </span>
            </MenuItem>
            )}
            {isAdmin && (
            <div>
              <MenuItem
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                disabled={!!toolbarBusy}
              >
                Change category ›
              </MenuItem>
              {showCategoryPicker && (
                <div className="px-2 py-1 space-y-0.5">
                  {[
                    { value: 'buyer_guide', label: 'Buyer Guide' },
                    { value: 'comparison', label: 'Comparison' },
                    { value: 'decision_guide', label: 'Decision Guide' },
                    { value: 'explainer', label: 'Explainer' },
                    { value: 'how_to', label: 'How-To' },
                    { value: 'roundup', label: 'Roundup' },
                    { value: 'news_analysis', label: 'News Analysis' },
                    { value: 'trend_analysis', label: 'Trend Analysis' },
                    { value: 'breaking_news', label: 'Breaking News' },
                    { value: 'deep_dive', label: 'Deep Dive' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleChangeCategory(value)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors"
                      style={{
                        color: articleType === value ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: articleType === value ? 600 : 400,
                        backgroundColor: articleType === value ? 'var(--accent-light)' : 'transparent',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}
            {/* Owner + admin: image management */}
            <MenuItem
              onClick={() => { onRegenerateImages(); setMenuOpen(false) }}
              disabled={!!toolbarBusy}
              loading={isRegeneratingImages}
            >
              Regenerate Images
            </MenuItem>
            {/* Admin-only: regenerate article + delete */}
            {isAdmin && (
            <MenuItem
              onClick={() => { onRegenerateArticle(); setMenuOpen(false) }}
              disabled={!!toolbarBusy}
              loading={isRegeneratingArticle}
            >
              Regenerate Article
            </MenuItem>
            )}
            {isAdmin && (
            <>
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
            </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
