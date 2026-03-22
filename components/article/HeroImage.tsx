'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ArticleContent } from '@/types/article'

interface HeroImageProps {
  url: string
  alt: string
  history?: string[]
  isAdmin?: boolean
  articleId?: string
  onReplace?: (useAI?: boolean) => Promise<void>
  onPick?: (index: number) => Promise<void>
  onKeep?: (article: ArticleContent) => void
}

export default function HeroImage({
  url,
  alt,
  history,
  isAdmin,
  articleId,
  onReplace,
  onPick,
  onKeep,
}: HeroImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [replacing, setReplacing] = useState<'photo' | 'ai' | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set())

  if (error) return null

  async function handleReplace(useAI: boolean) {
    if (!onReplace || replacing) return
    setReplacing(useAI ? 'ai' : 'photo')
    try {
      // Fetch preview URL without saving
      const res = await fetch(`/api/articles/${articleId}/replace-thumbnail?preview=true${useAI ? '&ai=true' : ''}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.preview_url) {
        setPreviewUrl(data.preview_url)
        setPreviewLoaded(false)
      }
    } catch {
      // Fall back to direct replace
      await onReplace(useAI)
      setLoaded(false)
    } finally {
      setReplacing(null)
    }
  }

  async function handleKeepPreview() {
    if (!previewUrl) return
    setReplacing('photo')
    try {
      const res = await fetch(`/api/articles/${articleId}/replace-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_url: previewUrl }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      // Update parent state with the new article data
      if (data.article && onKeep) {
        onKeep(data.article)
      }
      // Preview is now the real image — clear preview state
      setPreviewUrl(null)
      setPreviewLoaded(false)
      setLoaded(true)
    } catch {
      // silent
    } finally {
      setReplacing(null)
    }
  }

  function handleDiscardPreview() {
    setPreviewUrl(null)
    setPreviewLoaded(false)
  }

  // History thumbnails — exclude the current image, filter out errored ones
  const historyItems = (history ?? [])
    .map((u, i) => ({ url: u, index: i }))
    .filter(({ url: u }) => u !== url)
    .filter(({ index }) => !thumbErrors.has(index))

  return (
    <div className="mb-8">
      <figure
        className="rounded-2xl overflow-hidden"
        style={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          {/* AI generation overlay */}
          {replacing === 'ai' && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            >
              <div className="w-8 h-8 rounded-full border-3 border-white border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
              <p className="text-white text-sm font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
                Generating AI image...
              </p>
              <p className="text-white/60 text-xs">
                This takes 30–60 seconds
              </p>
            </div>
          )}
          {/* Current image (dimmed when preview is showing) */}
          <Image
            src={previewUrl ?? url}
            alt={alt}
            fill
            className="object-cover transition-opacity duration-500"
            style={{ opacity: (previewUrl ? previewLoaded : loaded) ? 1 : 0 }}
            onLoad={() => previewUrl ? setPreviewLoaded(true) : setLoaded(true)}
            onError={() => previewUrl ? setPreviewUrl(null) : setError(true)}
            unoptimized
            key={previewUrl ?? url}
          />
          {/* Preview Keep/Discard buttons */}
          {previewUrl && previewLoaded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              <button
                onClick={handleKeepPreview}
                disabled={!!replacing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
                style={{ backgroundColor: '#16a34a', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Keep
              </button>
              <button
                onClick={handleDiscardPreview}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Discard
              </button>
            </div>
          )}
          {previewUrl && (
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}>
              Preview
            </div>
          )}
          {isAdmin && onReplace && (
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                onClick={() => handleReplace(false)}
                disabled={!!replacing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', opacity: replacing ? 0.6 : 0.85 }}
                title="Find a different photo from the web"
              >
                {replacing === 'photo' ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6" />
                      <path d="M2.5 22v-6h6" />
                      <path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" />
                      <path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" />
                    </svg>
                    New photo
                  </>
                )}
              </button>
              <button
                onClick={() => handleReplace(true)}
                disabled={!!replacing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{ backgroundColor: 'rgba(100,60,180,0.75)', color: '#fff', opacity: replacing ? 0.6 : 0.85 }}
                title="Generate an AI image"
              >
                {replacing === 'ai' ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    Generate AI
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </figure>

      {/* History thumbnails — only shown in admin mode when there are previous images */}
      {isAdmin && historyItems.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Previous:</span>
          <div className="flex gap-2 overflow-x-auto">
            {historyItems.map(({ url: thumbUrl, index }) => (
              <button
                key={index}
                onClick={() => onPick?.(index)}
                className="flex-shrink-0 rounded-lg overflow-hidden transition-all hover:ring-2"
                style={{
                  width: 80,
                  height: 45,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
                title="Use this image"
              >
                <Image
                  src={thumbUrl}
                  alt={`Previous hero ${index + 1}`}
                  width={80}
                  height={45}
                  className="object-cover w-full h-full"
                  onError={() => setThumbErrors((prev) => new Set([...prev, index]))}
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
