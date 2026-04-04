'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  sectionIndex: number
  articleId: string
  onRemove: (sectionIndex: number) => Promise<void>
  onEdit: (sectionIndex: number, instruction: string) => Promise<void>
  isEditing: boolean
  isReplacing: boolean
  onStartReplace: (sectionIndex: number) => void
  onCancelReplace: () => void
}

export default function SectionToolbar({
  sectionIndex,
  articleId,
  onRemove,
  onEdit,
  isEditing,
  isReplacing,
  onStartReplace,
  onCancelReplace,
}: Props) {
  const [showEditInput, setShowEditInput] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [replaceValue, setReplaceValue] = useState('')
  const [selectedPill, setSelectedPill] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false)
  const [replaceError, setReplaceError] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (showEditInput && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [showEditInput])

  useEffect(() => {
    if (isReplacing && replaceInputRef.current) {
      replaceInputRef.current.focus()
    }
  }, [isReplacing, suggestions])

  // Reset edit states when editing completes
  useEffect(() => {
    if (!isEditing && showEditInput) {
      setShowEditInput(false)
      setEditValue('')
    }
  }, [isEditing, showEditInput])

  // Fetch suggestions when replacement bar opens
  useEffect(() => {
    if (!isReplacing) {
      setSuggestions(null)
      setReplaceValue('')
      setSelectedPill(null)
      setIsSubmittingReplace(false)
      setReplaceError(false)
      return
    }

    setLoadingSuggestions(true)
    const controller = new AbortController()
    abortRef.current = controller

    fetch(`/api/articles/${articleId}/section-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionIndex }),
      signal: controller.signal,
    })
      .then(res => res.json())
      .then(data => {
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions?.length > 0 ? data.suggestions : [])
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setSuggestions([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSuggestions(false)
      })

    return () => controller.abort()
  }, [isReplacing, articleId, sectionIndex])

  const handleEditSubmit = () => {
    if (!editValue.trim()) return
    onEdit(sectionIndex, editValue.trim())
  }

  const handlePillClick = useCallback((idx: number, text: string) => {
    setSelectedPill(idx)
    setReplaceValue(text)
    replaceInputRef.current?.focus()
  }, [])

  const handleReplaceInputChange = useCallback((value: string) => {
    setReplaceValue(value)
    if (selectedPill !== null) setSelectedPill(null)
  }, [selectedPill])

  const handleReplaceSubmit = async () => {
    if (!replaceValue.trim() || isSubmittingReplace) return
    setIsSubmittingReplace(true)
    setReplaceError(false)
    try {
      await onEdit(sectionIndex, replaceValue.trim())
      // onEdit will call onArticleUpdated which replaces the section
      // The SectionRenderer will clear isReplacing via onCancelReplace after success
    } catch {
      setReplaceError(true)
      setIsSubmittingReplace(false)
    }
  }

  const handleCancel = () => {
    if (isSubmittingReplace && abortRef.current) {
      abortRef.current.abort()
    }
    setIsSubmittingReplace(false)
    onCancelReplace()
  }

  const handleJustRemove = async () => {
    await onRemove(sectionIndex)
  }

  // Don't show icon buttons when replacement bar or edit input is active
  const showIcons = !isReplacing && !showEditInput

  return (
    <>
      {/* Icon buttons — top-right, visible on hover (desktop), faint on mobile */}
      {showIcons && (
        <div
          className="absolute top-1 right-1 z-10 flex items-center gap-1 opacity-[0.4] md:opacity-0 group-hover/section:opacity-100 transition-opacity duration-150"
          data-no-print
        >
          {/* Edit button */}
          <button
            onClick={() => setShowEditInput(true)}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
            aria-label="Edit section"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>

          {/* Replace button (✕) — opens replacement bar */}
          <button
            onClick={() => onStartReplace(sectionIndex)}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
            aria-label="Replace section"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Edit input (✎ behaviour — unchanged) ── */}
      {showEditInput && (
        <div className="mb-3" data-no-print>
          <div className="flex items-center gap-2">
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') { setShowEditInput(false); setEditValue('') } }}
              placeholder="What should this section cover instead?"
              disabled={isEditing}
              className="flex-1 px-3 py-1.5 text-sm rounded-md"
              style={{ border: '1px solid #BA7517', outline: 'none', backgroundColor: 'white', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleEditSubmit}
              disabled={isEditing || !editValue.trim()}
              className="px-3 py-1.5 rounded-md text-white text-xs font-medium"
              style={{
                backgroundColor: isEditing ? '#94918D' : '#BA7517',
                border: 'none',
                cursor: isEditing || !editValue.trim() ? 'not-allowed' : 'pointer',
                opacity: isEditing || !editValue.trim() ? 0.6 : 1,
              }}
            >
              {isEditing ? 'Updating\u2026' : 'Update'}
            </button>
            {!isEditing && (
              <button
                onClick={() => { setShowEditInput(false); setEditValue('') }}
                className="px-2 py-1.5 rounded-md text-xs"
                style={{ color: '#94918D', backgroundColor: 'transparent', border: '1px solid #d4d4d4', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
          {isEditing && (
            <p className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: '#BA7517' }}>
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Rewriting section…
            </p>
          )}
        </div>
      )}

      {/* ── Replacement bar (✕ behaviour) ── */}
      {isReplacing && (
        <div
          className="relative z-20 mb-4"
          data-no-print
          style={{
            background: '#fff',
            border: '1.5px solid #BA7517',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 12px rgba(186, 117, 23, 0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
              What should replace this section?
            </span>
            <button
              onClick={handleCancel}
              style={{ fontSize: '12px', color: '#94918D', cursor: 'pointer', background: 'none', border: 'none' }}
              className="hover:underline"
            >
              Cancel
            </button>
          </div>

          {/* Suggestion pills */}
          {!loadingSuggestions && suggestions && suggestions.length > 0 && (
            <>
              <p
                className="mb-2"
                style={{ fontSize: '11px', fontWeight: 600, color: '#BA7517', letterSpacing: '0.5px', textTransform: 'uppercase' as const }}
              >
                Suggestions from your research
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePillClick(idx, s)}
                    disabled={isSubmittingReplace}
                    className="transition-colors duration-100"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '5px 12px',
                      borderRadius: '8px',
                      cursor: isSubmittingReplace ? 'not-allowed' : 'pointer',
                      border: selectedPill === idx ? '1.5px solid #BA7517' : '1.5px solid #E8E6E0',
                      backgroundColor: selectedPill === idx ? '#FDF8F0' : '#fff',
                      color: selectedPill === idx ? '#BA7517' : '#5F5E5A',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPill !== idx) {
                        e.currentTarget.style.borderColor = '#BA7517'
                        e.currentTarget.style.color = '#BA7517'
                        e.currentTarget.style.backgroundColor = '#FDF8F0'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPill !== idx) {
                        e.currentTarget.style.borderColor = '#E8E6E0'
                        e.currentTarget.style.color = '#5F5E5A'
                        e.currentTarget.style.backgroundColor = '#fff'
                      }
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Or divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1" style={{ height: '1px', backgroundColor: '#E8E6E0' }} />
                <span style={{ fontSize: '11px', color: '#B4B2A9' }}>or describe what you want</span>
                <div className="flex-1" style={{ height: '1px', backgroundColor: '#E8E6E0' }} />
              </div>
            </>
          )}

          {loadingSuggestions && (
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span style={{ fontSize: '12px', color: '#94918D' }}>Loading suggestions…</span>
            </div>
          )}

          {/* Text input + Replace button */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceValue}
              onChange={(e) => handleReplaceInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleReplaceSubmit(); if (e.key === 'Escape') handleCancel() }}
              placeholder="e.g. 'Compare the Loupedeck CT vs Monogram Creative Console'"
              disabled={isSubmittingReplace}
              className="flex-1 px-3 py-2"
              style={{
                fontSize: '13px',
                backgroundColor: '#FAFAF8',
                border: '1px solid #D3D1C7',
                borderRadius: '8px',
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleReplaceSubmit}
              disabled={isSubmittingReplace || !replaceValue.trim()}
              className="px-4 py-2 flex items-center justify-center gap-1.5 sm:w-auto w-full"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: isSubmittingReplace ? '#94918D' : '#BA7517',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmittingReplace || !replaceValue.trim() ? 'not-allowed' : 'pointer',
                opacity: !replaceValue.trim() && !isSubmittingReplace ? 0.5 : 1,
              }}
            >
              {isSubmittingReplace && (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmittingReplace ? 'Replacing\u2026' : 'Replace'}
            </button>
          </div>

          {replaceError && (
            <p className="mt-2" style={{ fontSize: '12px', color: '#dc2626' }}>
              Something went wrong. Please try again.
            </p>
          )}

          {/* Just remove link */}
          <div className="text-center mt-3">
            <button
              onClick={handleJustRemove}
              disabled={isSubmittingReplace}
              className="hover:underline"
              style={{
                fontSize: '11px',
                color: '#B4B2A9',
                background: 'none',
                border: 'none',
                cursor: isSubmittingReplace ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#888780' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#B4B2A9' }}
            >
              Just remove this section entirely
            </button>
          </div>
        </div>
      )}
    </>
  )
}
