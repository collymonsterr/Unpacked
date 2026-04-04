'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  sectionIndex: number
  onRemove: (sectionIndex: number) => Promise<void>
  onEdit: (sectionIndex: number, instruction: string) => Promise<void>
  isEditing: boolean
}

export default function SectionToolbar({ sectionIndex, onRemove, onEdit, isEditing }: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [showEditInput, setShowEditInput] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showEditInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showEditInput])

  // Reset states when editing completes
  useEffect(() => {
    if (!isEditing && showEditInput) {
      setShowEditInput(false)
      setEditValue('')
    }
  }, [isEditing, showEditInput])

  const handleEditSubmit = () => {
    if (!editValue.trim()) return
    onEdit(sectionIndex, editValue.trim())
  }

  return (
    <>
      {/* Icon buttons — top-right, visible on hover (desktop), faint on mobile */}
      {!confirmRemove && !showEditInput && (
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

          {/* Remove button */}
          <button
            onClick={() => setConfirmRemove(true)}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
            aria-label="Remove section"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Remove confirmation */}
      {confirmRemove && (
        <div
          className="flex items-center gap-2 mb-2 text-xs"
          data-no-print
        >
          <span style={{ color: '#94918D' }}>Remove this section?</span>
          <button
            onClick={() => { setConfirmRemove(false); onRemove(sectionIndex) }}
            className="px-2 py-0.5 rounded text-white text-xs font-medium"
            style={{ backgroundColor: '#dc2626', border: 'none', cursor: 'pointer' }}
          >
            Remove
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="px-2 py-0.5 rounded text-xs"
            style={{ color: '#94918D', backgroundColor: 'transparent', border: '1px solid #d4d4d4', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit input */}
      {showEditInput && (
        <div className="mb-3" data-no-print>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') { setShowEditInput(false); setEditValue('') } }}
              placeholder="What should this section cover instead?"
              disabled={isEditing}
              className="flex-1 px-3 py-1.5 text-sm rounded-md"
              style={{
                border: '1px solid #BA7517',
                outline: 'none',
                backgroundColor: 'white',
                color: 'var(--text-primary)',
              }}
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
              Rewriting section\u2026
            </p>
          )}
        </div>
      )}
    </>
  )
}
