'use client'

import Image from 'next/image'
import { useState, useMemo, useCallback } from 'react'
import type { ProductCard as ProductCardType } from '@/types/article'

interface Props {
  section: ProductCardType
  isAdmin?: boolean
  sectionIndex?: number
  onReplaceImage?: (imageIndex: number) => Promise<void>
  onSetPrimaryImage?: (imageIndex: number) => Promise<void>
}

export default function ProductCard({ section, isAdmin, onReplaceImage, onSetPrimaryImage }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)

  const productType = section.product_type ?? 'physical'

  // Build a clean array of loadable images
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

  const handleReplace = useCallback(
    async (index: number) => {
      if (!onReplaceImage || replacingIndex !== null) return
      setReplacingIndex(index)
      try {
        await onReplaceImage(index)
        setSelectedIndex(0)
        setImgErrors(new Set())
      } finally {
        setReplacingIndex(null)
        setHeroLoaded(false)
      }
    },
    [onReplaceImage, replacingIndex]
  )

  const handleSetPrimary = useCallback(
    async (index: number) => {
      if (!onSetPrimaryImage || replacingIndex !== null) return
      setReplacingIndex(index)
      try {
        await onSetPrimaryImage(index)
        setSelectedIndex(0)
        setHeroLoaded(false)
      } finally {
        setReplacingIndex(null)
      }
    },
    [onSetPrimaryImage, replacingIndex]
  )

  const heroUrl = allImages[selectedIndex] && !imgErrors.has(selectedIndex)
    ? allImages[selectedIndex]
    : images[0] ?? null

  // Software/service cards use a compact image; physical products get a big hero
  const isCompactImage = productType === 'software' || productType === 'service'

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'var(--card)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Verdict badge — top of card, immediately visible */}
      <div className="px-5 md:px-6 pt-5 md:pt-6">
        <div
          className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          {section.verdict}
        </div>
      </div>

      {/* Title + Price */}
      <div className="flex items-start justify-between gap-4 px-5 md:px-6 pt-3 pb-1">
        <h3
          className="text-2xl md:text-3xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {section.heading}
        </h3>
        {section.price && (
          <p
            className="text-lg md:text-xl font-bold shrink-0 mt-1"
            style={{ color: 'var(--accent)' }}
          >
            {section.price}
          </p>
        )}
      </div>

      {/* Image area — layout depends on product type */}
      {isCompactImage ? (
        /* Software/Service: smaller, contained image */
        heroUrl ? (
          <div className="px-5 md:px-6 py-3">
            <div
              className="relative w-full overflow-hidden rounded-xl group"
              style={{
                aspectRatio: '16 / 9',
                backgroundColor: '#ffffff',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
              }}
            >
              <Image
                key={heroUrl}
                src={heroUrl}
                alt={section.entity_name}
                fill
                className={`object-contain p-4 md:p-6 transition-all duration-300 ${heroLoaded ? 'hero-image-fade' : 'opacity-0'}`}
                onLoad={() => setHeroLoaded(true)}
                onError={() => {
                  handleImageError(allImages.indexOf(heroUrl))
                  setHeroLoaded(false)
                }}
                unoptimized
              />
              {/* Admin: replace button */}
              {isAdmin && onReplaceImage && (
                <button
                  onClick={() => handleReplace(allImages.indexOf(heroUrl))}
                  disabled={replacingIndex !== null}
                  className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  title="Replace this image"
                >
                  {replacingIndex === allImages.indexOf(heroUrl) ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" /><path d="M2.5 11.5a10 10 0 0 1 18.4-4.5" /><path d="M21.5 12.5a10 10 0 0 1-18.4 4.5" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : null
      ) : (
        /* Physical/Place: full hero image + optional thumbnails */
        <>
          <div className="p-4 md:p-5">
            <div
              className="relative w-full overflow-hidden rounded-xl group"
              style={{
                aspectRatio: '4 / 3',
                backgroundColor: '#ffffff',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
              }}
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
                    onError={() => {
                      handleImageError(allImages.indexOf(heroUrl))
                      setHeroLoaded(false)
                    }}
                    unoptimized
                  />
                  {/* Admin: replace button */}
                  {isAdmin && onReplaceImage && (
                    <button
                      onClick={() => handleReplace(allImages.indexOf(heroUrl))}
                      disabled={replacingIndex !== null}
                      className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                      title="Replace this image"
                    >
                      {replacingIndex === allImages.indexOf(heroUrl) ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <span
                    className="text-center text-lg font-semibold leading-snug"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {section.entity_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Strip — only for physical products with multiple images */}
          {images.length > 1 && (
            <div
              className="grid gap-2 px-4 md:px-5 pb-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(images.length, 4)}, 1fr)`,
              }}
            >
              {allImages.map((url, i) => {
                if (imgErrors.has(i)) return null
                const isActive = url === heroUrl
                return (
                  <div key={i} className="relative group/thumb">
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
                        src={url}
                        alt={`${section.entity_name} view ${i + 1}`}
                        fill
                        className="object-contain p-2 md:p-3 transition-transform duration-200 hover:scale-105"
                        onError={() => handleImageError(i)}
                        unoptimized
                      />
                      {/* "Primary" label on first image in admin mode */}
                      {isAdmin && i === 0 && (
                        <span
                          className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                        >
                          Primary
                        </span>
                      )}
                    </button>
                    {/* Admin: X button to remove image */}
                    {isAdmin && onReplaceImage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReplace(i) }}
                        disabled={replacingIndex !== null}
                        className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                        title="Remove this image"
                      >
                        {replacingIndex === i ? (
                          <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Details */}
      <div className="p-5 md:p-6">
        {/* Key specs grid */}
        {Object.keys(section.key_specs).length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
            {Object.entries(section.key_specs).map(([key, value]) => (
              <div key={key}>
                <span
                  className="text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {key}
                </span>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          {section.opinion}
        </p>

        {/* Links row */}
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
