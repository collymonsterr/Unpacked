'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (instruction: string) => void
  onNewArticle?: (query: string) => void
  isLoading: boolean
}

export default function RefinementInput({ onSubmit, isLoading }: Props) {
  const [value, setValue] = useState('')
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
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Refine this article or start a new one
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading || !value.trim()}
              onClick={() => {
                const trimmed = value.trim()
                if (!trimmed) return
                // Navigate to homepage with the query pre-filled
                window.location.href = `/?q=${encodeURIComponent(trimmed)}`
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                cursor: isLoading || !value.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              New article
            </button>
            <button
              type="button"
              onClick={handleRefine}
              disabled={isLoading || !value.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                cursor: isLoading || !value.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Updating...' : 'Refine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
