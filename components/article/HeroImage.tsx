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
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set())

  // Grid picker state
  const [pickerUrls, setPickerUrls] = useState<string[] | null>(null)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerExcluded, setPickerExcluded] = useState<string[]>([])
  const [pickerError, setPickerError] = useState(false)
  const [saving, setSaving] = useState(false)

  // AI generation state
  const [generatingAI, setGeneratingAI] = useState(false)

  if (error) return null

  async function openPicker() {
    if (pickerLoading || saving) return
    setPickerLoading(true)
    setPickerError(false)
    setPickerExcluded([])
    try {
      const res = await fetch(
        `/api/articles/${articleId}/replace-thumbnail?preview=true&count=4`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const urls = data.preview_urls as string[] | undefined
      if (urls && urls.length > 0) {
        setPickerUrls(urls)
      } else {
        setPickerError(true)
      }
    } catch {
      setPickerError(true)
    } finally {
      setPickerLoading(false)
    }
  }

  async function searchAgain() {
    if (pickerLoading || saving) return
    setPickerLoading(true)
    setPickerError(false)
    // Add current picker URLs to the excluded list
    const newExcluded = [...pickerExcluded, ...(pickerUrls ?? [])]
    setPickerExcluded(newExcluded)
    try {
      const res = await fetch(
        `/api/articles/${articleId}/replace-thumbnail?preview=true&count=4`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extra_exclude: newExcluded }),
        }
      )
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const urls = data.preview_urls as string[] | undefined
      if (urls && urls.length > 0) {
        setPickerUrls(urls)
      } else {
        setPickerError(true)
        // Keep showing old results if search again found nothing
      }
    } catch {
      setPickerError(true)
    } finally {
      setPickerLoading(false)
    }
  }

  async function selectImage(selectedUrl: string) {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/replace-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_url: selectedUrl }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.article && onKeep) {
        onKeep(data.article)
      }
      // Close picker
      setPickerUrls(null)
      setPickerExcluded([])
      setLoaded(true)
    } catch {
      // silent — stay in picker
    } finally {
      setSaving(false)
    }
  }

  function closePicker() {
    setPickerUrls(null)
    setPickerExcluded([])
    setPickerLoading(false)
    setPickerError(false)
  }

  async function handleGenerateAI() {
    if (!onReplace || generatingAI) return
    setGeneratingAI(true)
    try {
      await onReplace(true)
      setLoaded(true)
    } finally {
      setGeneratingAI(false)
    }
  }

  // History thumbnails — exclude the current image, filter out errored ones
  const historyItems = (history ?? [])
    .map((u, i) => ({ url: u, index: i }))
    .filter(({ url: u }) => u !== url)
    .filter(({ index }) => !thumbErrors.has(index))

  const pickerOpen = pickerUrls !== null || pickerLoading || pickerError

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
          {/* Current hero image — always rendered underneath */}
          <Image
            src={url}
            alt={alt}
            fill
            className="object-cover transition-opacity duration-500"
            style={{ opacity: loaded ? 1 : 0 }}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            unoptimized
            key="hero-img"
          />

          {/* AI generation overlay */}
          {generatingAI && (
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

          {/* Grid picker overlay */}
          {pickerOpen && (
            <div
              className="absolute inset-0 z-20 flex flex-col"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }}
            >
              {/* Close button */}
              <button
                onClick={closePicker}
                className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Loading state */}
              {pickerLoading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <p className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-sora)' }}>
                    Finding images...
                  </p>
                </div>
              )}

              {/* Error state — no images found */}
              {pickerError && !pickerLoading && !pickerUrls && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <p className="text-white text-sm">No images found — try a different search</p>
                  <button
                    onClick={searchAgain}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#fff', cursor: 'pointer' }}
                  >
                    Search again
                  </button>
                </div>
              )}

              {/* Image grid */}
              {pickerUrls && !pickerLoading && (
                <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
                  <div
                    className="grid grid-cols-2 gap-2"
                    style={{ gridTemplateRows: '1fr 1fr', flex: '1 1 0', minHeight: 0 }}
                  >
                    {pickerUrls.map((imgUrl, i) => (
                      <button
                        key={i}
                        onClick={() => selectImage(imgUrl)}
                        disabled={saving}
                        className="relative rounded-lg overflow-hidden transition-all hover:ring-2 disabled:opacity-50"
                        style={{
                          cursor: saving ? 'not-allowed' : 'pointer',
                          minHeight: 0,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid #E07A3A' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`Option ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Search again + error notice */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={searchAgain}
                      disabled={pickerLoading}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                      style={{
                        border: '1px solid rgba(255,255,255,0.4)',
                        color: '#fff',
                        cursor: pickerLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Search again
                    </button>
                    {pickerError && (
                      <span className="text-xs text-white/60">No more results found</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin buttons — only show when picker is NOT open */}
          {isAdmin && onReplace && !pickerOpen && !generatingAI && (
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                onClick={openPicker}
                disabled={pickerLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', opacity: 0.85 }}
                title="Choose a new photo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6" />
                  <path d="M2.5 22v-6h6" />
                  <path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" />
                  <path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" />
                </svg>
                New photo
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={generatingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{ backgroundColor: 'rgba(100,60,180,0.75)', color: '#fff', opacity: 0.85 }}
                title="Generate an AI image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Generate AI
              </button>
            </div>
          )}
        </div>
      </figure>

      {/* History thumbnails — only shown in admin mode when there are previous images */}
      {isAdmin && historyItems.length > 0 && !pickerOpen && (
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
