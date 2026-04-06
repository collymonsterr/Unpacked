'use client'

import Image from 'next/image'
import { useState, useMemo, useCallback } from 'react'
import type { ProductCard as ProductCardType, ArticleContent } from '@/types/article'

interface Props {
  section: ProductCardType
  isAdmin?: boolean
  sectionIndex?: number
  articleId?: string
  onReplaceImage?: (imageIndex: number) => Promise<void>
  onSetPrimaryImage?: (imageIndex: number) => Promise<void>
  onArticleUpdated?: (article: ArticleContent) => void
}

export default function ProductCard({ section, isAdmin, sectionIndex, articleId, onSetPrimaryImage, onArticleUpdated }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())
  const [heroLoaded, setHeroLoaded] = useState(false)

  // Picker state
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [pickerUrls, setPickerUrls] = useState<string[] | null>(null)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerExcluded, setPickerExcluded] = useState<string[]>([])
  const [pickerError, setPickerError] = useState(false)
  const [saving, setSaving] = useState(false)

  const productType = section.product_type ?? 'physical'

  const allImages = useMemo(() => {
    if (section.image_urls?.length) return section.image_urls
    if (section.image_url) return [section.image_url]
    return []
  }, [section.image_urls, section.image_url])

  const images = useMemo(
    () => allImages.filter((_, i) => !imgErrors.has(i)),
    [allImages, imgErrors]
  )

  const handleImageError = useCallback(
    (index: number) => {
      setImgErrors((prev) => new Set(prev).add(index))
      if (index === selectedIndex) {
        const next = allImages.findIndex((_, i) => i > index && !imgErrors.has(i))
        if (next !== -1) setSelectedIndex(next)
      }
    },
    [selectedIndex, allImages, imgErrors]
  )

  const handleSetPrimary = useCallback(
    async (index: number) => {
      if (!onSetPrimaryImage || pickerLoading) return
      try {
        await onSetPrimaryImage(index)
        setSelectedIndex(0)
        setHeroLoaded(false)
      } catch { /* silent */ }
    },
    [onSetPrimaryImage, pickerLoading]
  )

  // ═══ Picker functions ═══

  async function openPicker(imageIndex: number) {
    if (pickerLoading || saving || !articleId || sectionIndex == null) return
    setPickerSlot(imageIndex)
    setPickerLoading(true)
    setPickerError(false)
    setPickerExcluded([])
    try {
      const res = await fetch(`/api/articles/${articleId}/replace-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex, imageIndex, preview: true, count: 4 }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.preview_urls?.length > 0) {
        setPickerUrls(data.preview_urls)
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
    if (pickerLoading || saving || !articleId || sectionIndex == null || pickerSlot == null) return
    setPickerLoading(true)
    setPickerError(false)
    const newExcluded = [...pickerExcluded, ...(pickerUrls ?? [])]
    setPickerExcluded(newExcluded)
    try {
      const res = await fetch(`/api/articles/${articleId}/replace-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex, imageIndex: pickerSlot, preview: true, count: 4, extra_exclude: newExcluded }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.preview_urls?.length > 0) {
        setPickerUrls(data.preview_urls)
      } else {
        setPickerError(true)
      }
    } catch {
      setPickerError(true)
    } finally {
      setPickerLoading(false)
    }
  }

  async function selectImage(selectedUrl: string) {
    if (saving || !articleId || sectionIndex == null || pickerSlot == null) return
    setSaving(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/replace-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex, imageIndex: pickerSlot, selected_url: selectedUrl }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.article && onArticleUpdated) {
        onArticleUpdated(data.article)
      }
      closePicker()
      setSelectedIndex(0)
      setHeroLoaded(false)
      setImgErrors(new Set())
    } catch {
      // stay in picker
    } finally {
      setSaving(false)
    }
  }

  function closePicker() {
    setPickerSlot(null)
    setPickerUrls(null)
    setPickerExcluded([])
    setPickerLoading(false)
    setPickerError(false)
  }

  const pickerOpen = pickerSlot !== null

  const heroUrl = allImages[selectedIndex] && !imgErrors.has(selectedIndex)
    ? allImages[selectedIndex]
    : images[0] ?? null

  const isCompactImage = productType === 'software' || productType === 'service'

  // ═══ Picker UI component — shared between layouts ═══
  function renderPicker() {
    if (!pickerOpen) return null

    return (
      <div
        className="mx-4 md:mx-5 mb-4 rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Choose a replacement image
          </span>
          <button
            onClick={closePicker}
            className="w-6 h-6 flex items-center justify-center rounded-full"
            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {pickerLoading && (
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Finding images...</span>
          </div>
        )}

        {/* Error — no results */}
        {pickerError && !pickerLoading && !pickerUrls && (
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No images found</span>
            <button
              onClick={searchAgain}
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Search again
            </button>
          </div>
        )}

        {/* Image grid / scroll */}
        {pickerUrls && !pickerLoading && (
          <div className="p-2">
            {/* Desktop: 2×2 grid | Mobile: horizontal scroll */}
            <div className="hidden sm:grid grid-cols-2 gap-2">
              {pickerUrls.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => selectImage(imgUrl)}
                  disabled={saving}
                  className="relative rounded-lg overflow-hidden transition-all hover:ring-2 disabled:opacity-50"
                  style={{ aspectRatio: '4/3', cursor: saving ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid #E07A3A' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={`Option ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </button>
              ))}
            </div>
            {/* Mobile: horizontal scroll */}
            <div className="flex sm:hidden gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {pickerUrls.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => selectImage(imgUrl)}
                  disabled={saving}
                  className="flex-shrink-0 rounded-lg overflow-hidden transition-all hover:ring-2 disabled:opacity-50"
                  style={{ width: '100px', height: '100px', cursor: saving ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid #E07A3A' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={`Option ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </button>
              ))}
            </div>
            {/* Search again */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={searchAgain}
                disabled={pickerLoading}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: pickerLoading ? 'not-allowed' : 'pointer' }}
              >
                Search again
              </button>
              {pickerError && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No more results</span>}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'var(--card)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Verdict badge */}
      <div className="px-5 md:px-6 pt-5 md:pt-6">
        <div
          className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          {section.verdict}
        </div>
      </div>

      {/* Title + Price */}
      <div className="px-5 md:px-6 pt-3 pb-1">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-4">
          <h3
            className="text-xl md:text-3xl font-bold leading-tight"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {section.heading}
          </h3>
          {section.price && (
            <p className="text-base md:text-xl font-bold shrink-0 mt-1" style={{ color: 'var(--accent)' }}>
              {section.price}
            </p>
          )}
        </div>
      </div>

      {/* Image area */}
      {isCompactImage ? (
        heroUrl ? (
          <div className="px-5 md:px-6 py-3">
            <div
              className="relative w-full overflow-hidden rounded-xl group"
              style={{ aspectRatio: '16 / 9', backgroundColor: '#ffffff', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
            >
              <Image
                key={heroUrl}
                src={heroUrl}
                alt={section.entity_name}
                fill
                className={`object-contain p-4 md:p-6 transition-all duration-300 ${heroLoaded ? 'hero-image-fade' : 'opacity-0'}`}
                onLoad={() => setHeroLoaded(true)}
                onError={() => { handleImageError(allImages.indexOf(heroUrl)); setHeroLoaded(false) }}
                unoptimized
              />
              {isAdmin && articleId && (
                <button
                  onClick={() => openPicker(allImages.indexOf(heroUrl))}
                  className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  title="Replace this image"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" /><path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" /><path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 md:px-6 py-3">
            <div className="flex flex-col items-center justify-center p-6 gap-2 rounded-xl" style={{ backgroundColor: '#f5f5f3' }}>
              <span className="text-center text-base font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                {section.entity_name}
              </span>
              {isAdmin && articleId && (
                <button
                  onClick={() => openPicker(0)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
                >
                  Find image
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          <div className="p-4 md:p-5">
            <div
              className="relative w-full overflow-hidden rounded-xl group"
              style={{ aspectRatio: '4 / 3', backgroundColor: '#ffffff', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}
            >
              {heroUrl ? (
                <>
                  <Image
                    key={heroUrl}
                    src={heroUrl}
                    alt={section.entity_name}
                    fill
                    className={`object-contain p-5 md:p-8 transition-all duration-300 group-hover:scale-[1.02] ${heroLoaded ? 'hero-image-fade' : 'opacity-0'}`}
                    onLoad={() => setHeroLoaded(true)}
                    onError={() => { handleImageError(allImages.indexOf(heroUrl)); setHeroLoaded(false) }}
                    unoptimized
                  />
                  {isAdmin && articleId && (
                    <button
                      onClick={() => openPicker(allImages.indexOf(heroUrl))}
                      className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer' }}
                      title="Replace this image"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-2" style={{ backgroundColor: '#f5f5f3' }}>
                  <span className="text-center text-base font-semibold leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    {section.entity_name}
                  </span>
                  {isAdmin && articleId && (
                    <button
                      onClick={() => openPicker(0)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
                    >
                      Find image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-2 px-4 md:px-5 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {allImages.map((imgUrl, i) => {
                if (imgErrors.has(i)) return null
                const isActive = imgUrl === heroUrl
                return (
                  <div key={i} className="relative group/thumb flex-1 min-w-0" style={{ maxWidth: `${100 / Math.min(images.length, 5)}%` }}>
                    <button
                      onClick={() => {
                        if (isAdmin && onSetPrimaryImage && i !== 0) {
                          handleSetPrimary(i)
                        } else {
                          setSelectedIndex(i)
                          setHeroLoaded(false)
                        }
                      }}
                      className="relative w-full rounded-xl overflow-hidden transition-all duration-200 hover:opacity-100"
                      style={{
                        aspectRatio: '1',
                        backgroundColor: '#ffffff',
                        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                        opacity: isActive ? 1 : 0.7,
                        boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
                      }}
                    >
                      <Image
                        src={imgUrl}
                        alt={`${section.entity_name} view ${i + 1}`}
                        fill
                        className="object-contain p-2 md:p-3 transition-transform duration-200 hover:scale-105"
                        onError={() => handleImageError(i)}
                        unoptimized
                      />
                      {isAdmin && i === 0 && (
                        <span
                          className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >
                          Primary
                        </span>
                      )}
                    </button>
                    {/* Admin: X button opens picker for this slot */}
                    {isAdmin && articleId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openPicker(i) }}
                        className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                        title="Replace this image"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Inline image picker — appears between images and details */}
      {renderPicker()}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Details */}
      <div className="p-5 md:p-6">
        {Object.keys(section.key_specs).length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
            {Object.entries(section.key_specs).map(([key, value]) => (
              <div key={key}>
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{key}</span>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-sm leading-relaxed mb-4 space-y-3" style={{ color: 'var(--text-secondary)' }}>
          {section.opinion.split(/\n\n+/).filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {section.links && section.links.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {section.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                {link.label} →
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
