'use client'

import Image from 'next/image'
import { useState, useMemo, useCallback } from 'react'
import type { ProductCard as ProductCardType } from '@/types/article'

export default function ProductCard({ section }: { section: ProductCardType }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())
  const [heroLoaded, setHeroLoaded] = useState(false)

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

  const heroUrl = allImages[selectedIndex] && !imgErrors.has(selectedIndex)
    ? allImages[selectedIndex]
    : images[0] ?? null

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'var(--card)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Hero Image Container — white bg with padding */}
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

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="flex gap-3 px-4 md:px-5 pb-4 overflow-x-auto scrollbar-hide"
        >
          {allImages.map((url, i) => {
            if (imgErrors.has(i)) return null
            const isActive = url === heroUrl
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedIndex(i)
                  setHeroLoaded(false)
                }}
                className="shrink-0 relative rounded-lg overflow-hidden transition-all duration-200 hover:opacity-100"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: '#ffffff',
                  border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                  opacity: isActive ? 1 : 0.65,
                  boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
                }}
              >
                <Image
                  src={url}
                  alt={`${section.entity_name} view ${i + 1}`}
                  fill
                  className="object-contain p-1.5 transition-transform duration-200 hover:scale-110"
                  onError={() => handleImageError(i)}
                  unoptimized
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Details */}
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {section.heading}
          </h3>
          <p
            className="text-xl md:text-2xl font-bold shrink-0"
            style={{ color: 'var(--accent)' }}
          >
            {section.price}
          </p>
        </div>

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

        {/* Verdict + Links row */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-block px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {section.verdict}
          </div>

          {section.links && section.links.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
