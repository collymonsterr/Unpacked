'use client'

import { useState, useRef, useCallback } from 'react'

interface Target {
  type: 'hero' | 'section' | 'product'
  sectionIndex?: number
  imageIndex?: number
  productIndex?: number
}

interface Props {
  articleId: string
  target: Target
  onSwapped?: (newUrl: string | null) => void
  children: React.ReactNode
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE = 5 * 1024 * 1024

type OverlayState = 'idle' | 'hover' | 'uploading' | 'confirm-remove' | 'success'

export default function ImageSwapOverlay({ articleId, target, onSwapped, children }: Props) {
  const [state, setState] = useState<OverlayState>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Touch handling — tap to show, tap outside to hide
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (state === 'idle') {
      e.preventDefault()
      setState('hover')
    }
  }, [state])

  const handleMouseEnter = useCallback(() => {
    if (state === 'idle' || state === 'success') {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      setState('hover')
    }
  }, [state])

  const handleMouseLeave = useCallback(() => {
    if (state === 'hover') {
      hoverTimeoutRef.current = setTimeout(() => setState('idle'), 100)
    } else if (state === 'success') {
      setState('idle')
    }
  }, [state])

  // Dismiss on click outside for touch
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  async function uploadAndSwap(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Only JPG, PNG, WebP, and GIF files are accepted.')
      setTimeout(() => setError(null), 4000)
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be under 5MB.')
      setTimeout(() => setError(null), 4000)
      return
    }

    setState('uploading')
    setError(null)

    try {
      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch(`/api/articles/${articleId}/upload-refine-image`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      const { url } = await uploadRes.json()

      // Swap the image in the article JSON
      const swapRes = await fetch(`/api/articles/${articleId}/swap-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, target }),
      })
      if (!swapRes.ok) {
        const err = await swapRes.json().catch(() => ({}))
        throw new Error(err.error || 'Swap failed')
      }

      setState('success')
      onSwapped?.(url)
      setTimeout(() => setState('idle'), 2500)
    } catch (err) {
      setError((err as Error).message || 'Image upload failed. Please try again.')
      setState('hover')
      setTimeout(() => setError(null), 4000)
    }
  }

  async function handleRemove() {
    setState('uploading')
    try {
      const swapRes = await fetch(`/api/articles/${articleId}/swap-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: null, target }),
      })
      if (!swapRes.ok) throw new Error('Remove failed')
      onSwapped?.(null)
      setState('idle')
    } catch {
      setError('Failed to remove image. Please try again.')
      setState('hover')
      setTimeout(() => setError(null), 4000)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadAndSwap(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  // Drag and drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (state === 'idle' || state === 'hover') {
      setState('hover')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file) uploadAndSwap(file)
  }

  const showOverlay = state !== 'idle'
  const isUploading = state === 'uploading'
  const isConfirming = state === 'confirm-remove'
  const isSuccess = state === 'success'

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* The image content */}
      <div
        style={{
          transition: 'filter 0.2s, opacity 0.2s',
          filter: isUploading ? 'blur(2px)' : 'none',
          opacity: isUploading ? 0.4 : isConfirming ? 0.3 : 1,
        }}
      >
        {children}
      </div>

      {/* Success border flash */}
      {isSuccess && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-20"
          style={{
            border: '2px solid #22C55E',
            animation: 'imageSwapSuccess 2s ease-out forwards',
          }}
        />
      )}

      {/* Overlay */}
      {showOverlay && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl transition-opacity duration-200"
          style={{
            backgroundColor: isConfirming ? 'rgba(0,0,0,0.7)' : isUploading ? 'rgba(0,0,0,0.5)' : isSuccess ? 'transparent' : 'rgba(0,0,0,0.5)',
            opacity: isSuccess ? 0 : 1,
            pointerEvents: isSuccess ? 'none' : 'auto',
          }}
          onClick={handleOverlayClick}
        >
          {/* Uploading state */}
          {isUploading && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span className="text-xs text-white">Uploading...</span>
            </div>
          )}

          {/* Confirm remove state */}
          {isConfirming && (
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm text-white font-medium">Remove this image?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setState('hover')}
                  className="px-4 py-2 rounded-lg text-sm text-white transition-colors cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.4)', minHeight: 44 }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors cursor-pointer"
                  style={{ backgroundColor: '#E24B4A', minHeight: 44 }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#C13A28' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#E24B4A' }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Normal hover state — replace + remove buttons */}
          {state === 'hover' && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-white transition-colors cursor-pointer"
                style={{ border: '1.5px solid white', backgroundColor: 'transparent', minHeight: 44 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                Replace image
              </button>
              <button
                onClick={() => setState('confirm-remove')}
                className="px-4 py-1.5 text-xs text-white transition-opacity cursor-pointer"
                style={{ opacity: 0.7, background: 'none', border: 'none', minHeight: 44, display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div
          className="absolute bottom-3 left-3 right-3 z-30 px-3 py-2 rounded-lg text-xs text-white text-center"
          style={{ backgroundColor: 'rgba(194,58,40,0.9)' }}
        >
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* CSS animation for success border */}
      <style jsx>{`
        @keyframes imageSwapSuccess {
          0% { border-color: #22C55E; }
          100% { border-color: transparent; }
        }
      `}</style>
    </div>
  )
}
