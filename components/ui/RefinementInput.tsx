'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (instruction: string, imageUrl?: string) => void
  onNewArticle?: (query: string) => void
  isLoading: boolean
  externalValue?: string
  onExternalValueChange?: (value: string) => void
  articleId?: string
}

export default function RefinementInput({ onSubmit, isLoading, externalValue, onExternalValueChange, articleId }: Props) {
  const [internalValue, setInternalValue] = useState('')

  // Support both controlled and uncontrolled modes
  const value = externalValue !== undefined ? externalValue : internalValue
  const setValue = (v: string) => {
    if (onExternalValueChange) onExternalValueChange(v)
    setInternalValue(v)
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image upload state
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(100, Math.min(el.scrollHeight, 200)) + 'px'
  }, [value])

  // Clear image error after 4 seconds
  useEffect(() => {
    if (!imageError) return
    const t = setTimeout(() => setImageError(null), 4000)
    return () => clearTimeout(t)
  }, [imageError])

  // Clear validation error on typing
  useEffect(() => {
    if (value.trim()) setValidationError(null)
  }, [value])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input so the same file can be re-selected
    e.target.value = ''

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5MB.')
      return
    }

    if (!articleId) {
      setImageError('Image upload failed. Please try again.')
      return
    }

    setImageUploading(true)
    setImageError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/articles/${articleId}/upload-refine-image`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }

      const data = await res.json()
      setImageUrl(data.url)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image upload failed. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

  function removeImage() {
    setImageUrl(null)
  }

  function handleRefine() {
    const trimmed = value.trim()

    // If image is attached but no text, require text
    if (imageUrl && !trimmed) {
      setValidationError('Tell us where to place this image')
      return
    }

    if (!trimmed || isLoading) return
    onSubmit(trimmed, imageUrl ?? undefined)
    setValue('')
    setImageUrl(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRefine()
    }
  }

  // Dynamic placeholder based on image attachment
  const placeholder = imageUrl
    ? "Tell us where to place this image, e.g. 'Put this after the battery life section' or 'Replace the main product image with this'"
    : "e.g. 'Make it more opinionated and add a section on gaming performance' or 'Rewrite the intro to be shorter' or 'Generate a new article about MacBook alternatives'\u2026"

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
        {/* Image thumbnail preview */}
        {(imageUrl || imageUploading) && (
          <div className="px-4 pt-3 flex items-start gap-3">
            {imageUploading ? (
              <div
                className="rounded-lg flex items-center justify-center"
                style={{
                  width: '80px',
                  height: '60px',
                  backgroundColor: 'var(--accent-light)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : imageUrl && (
              <div className="relative group">
                <img
                  src={imageUrl}
                  alt="Attached image"
                  className="rounded-lg object-cover"
                  style={{
                    height: '60px',
                    maxWidth: '120px',
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    backgroundColor: '#666',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '10px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            {imageUrl && (
              <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                1 image per edit
              </span>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={3}
          className="w-full px-4 pt-3 pb-2 text-sm outline-none bg-transparent disabled:opacity-50 resize-none"
          style={{
            color: 'var(--text-primary)',
            minHeight: '100px',
          }}
        />

        {/* Error messages */}
        {imageError && (
          <div className="px-4 pb-2">
            <p className="text-xs text-red-600">{imageError}</p>
          </div>
        )}
        {validationError && (
          <div className="px-4 pb-2">
            <p className="text-xs text-red-600">{validationError}</p>
          </div>
        )}

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
              <div className="flex items-center gap-2">
                {/* Image upload button */}
                {articleId && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: imageUploading ? 'not-allowed' : 'pointer',
                      color: 'var(--text-secondary)',
                      padding: '2px',
                    }}
                    title="Attach an image"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                )}
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Refine this article or start a new one
                </span>
              </div>
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
                  disabled={!value.trim() && !imageUrl}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-30"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: (!value.trim() && !imageUrl) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Refine
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}
