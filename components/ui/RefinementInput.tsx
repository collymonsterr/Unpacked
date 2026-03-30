'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (instruction: string) => void
  onNewArticle?: (query: string) => void
  isLoading: boolean
  externalValue?: string
  onExternalValueChange?: (value: string) => void
}

export default function RefinementInput({ onSubmit, isLoading, externalValue, onExternalValueChange }: Props) {
  const [internalValue, setInternalValue] = useState('')

  // Support both controlled and uncontrolled modes
  const value = externalValue !== undefined ? externalValue : internalValue
  const setValue = (v: string) => {
    if (onExternalValueChange) onExternalValueChange(v)
    setInternalValue(v)
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(100, Math.min(el.scrollHeight, 200)) + 'px'
  }, [value])

  function handleRefine() {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRefine()
    }
  }

  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
      >
        What would you like to do?
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: '1.5px solid var(--border)',
          backgroundColor: 'var(--card)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 'Make it more opinionated and add a section on gaming performance' or 'Rewrite the intro to be shorter' or 'Generate a new article about MacBook alternatives'…"
          disabled={isLoading}
          rows={3}
          className="w-full px-4 pt-3 pb-2 text-sm outline-none bg-transparent disabled:opacity-50 resize-none"
          style={{
            color: 'var(--text-primary)',
            minHeight: '100px',
          }}
        />
        {/* Footer row inside the box */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2.5 w-full">
              <div
                className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Refining your article — this takes 20–40 seconds...
              </span>
            </div>
          ) : (
            <>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Refine this article or start a new one
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!value.trim()}
                  onClick={() => {
                    const trimmed = value.trim()
                    if (!trimmed) return
                    window.location.href = `/?q=${encodeURIComponent(trimmed)}`
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-30"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    cursor: !value.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  New article
                </button>
                <button
                  type="button"
                  onClick={handleRefine}
                  disabled={!value.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-30"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: !value.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Refine
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
