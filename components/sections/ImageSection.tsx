'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ImageSection as ImageSectionType } from '@/types/article'

interface Props {
  section: ImageSectionType
  isAdmin?: boolean
  sectionIndex?: number
  onReplaceImage?: (imageIndex: number) => Promise<void>
}

type ImageItem = ImageSectionType['images'][number]

export default function ImageSection({ section, isAdmin, onReplaceImage }: Props) {
  // Track which indices have valid URLs
  const validIndices = section.images
    .map((img, i) => (img.image_url ? i : -1))
    .filter((i) => i >= 0)

  if (validIndices.length === 0) return null

  return (
    <div className="mb-8">
      {section.heading && (
        <h3
          className="text-lg font-bold mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {section.heading}
        </h3>
      )}

      {section.layout === 'single' && validIndices[0] !== undefined && (
        <SingleImage
          image={section.images[validIndices[0]]}
          imageIndex={validIndices[0]}
          isAdmin={isAdmin}
          onReplace={onReplaceImage}
        />
      )}

      {section.layout === 'gallery' && (
        <Gallery
          indices={validIndices}
          allImages={section.images}
          isAdmin={isAdmin}
          onReplace={onReplaceImage}
        />
      )}

      {section.layout === 'side-by-side' && (
        <SideBySide
          indices={validIndices.slice(0, 2)}
          allImages={section.images}
          isAdmin={isAdmin}
          onReplace={onReplaceImage}
        />
      )}
    </div>
  )
}

function SingleImage({
  image,
  imageIndex,
  isAdmin,
  onReplace,
}: {
  image: { image_url?: string | null; caption?: string }
  imageIndex: number
  isAdmin?: boolean
  onReplace?: (imageIndex: number) => Promise<void>
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [replacing, setReplacing] = useState(false)

  if (!image.image_url || error) return null

  async function handleReplace() {
    if (!onReplace || replacing) return
    setReplacing(true)
    try {
      await onReplace(imageIndex)
      // Only reset loaded after a successful replace — the new src will trigger onLoad
      setLoaded(false)
    } catch {
      // Replace failed — keep current image visible
    } finally {
      setReplacing(false)
    }
  }

  return (
    <figure
      className="rounded-2xl overflow-hidden group"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <Image
          src={image.image_url}
          alt={image.caption ?? ''}
          fill
          className="object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          unoptimized
        />
        {isAdmin && onReplace && (
          <button
            onClick={handleReplace}
            disabled={replacing}
            className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
            title="Replace this image"
          >
            {replacing ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            )}
          </button>
        )}
      </div>
      {image.caption && (
        <figcaption
          className="px-4 py-2.5 text-xs italic"
          style={{ color: 'var(--text-secondary)' }}
        >
          {image.caption}
        </figcaption>
      )}
    </figure>
  )
}

function Gallery({
  indices,
  allImages,
  isAdmin,
  onReplace,
}: {
  indices: number[]
  allImages: ImageItem[]
  isAdmin?: boolean
  onReplace?: (imageIndex: number) => Promise<void>
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {indices.map((idx) => (
        <GalleryItem
          key={idx}
          image={allImages[idx]}
          imageIndex={idx}
          isAdmin={isAdmin}
          onReplace={onReplace}
        />
      ))}
    </div>
  )
}

function GalleryItem({
  image,
  imageIndex,
  isAdmin,
  onReplace,
}: {
  image: { image_url?: string | null; caption?: string }
  imageIndex: number
  isAdmin?: boolean
  onReplace?: (imageIndex: number) => Promise<void>
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [replacing, setReplacing] = useState(false)

  if (!image.image_url || error) return null

  async function handleReplace() {
    if (!onReplace || replacing) return
    setReplacing(true)
    try {
      await onReplace(imageIndex)
      // Only reset loaded after a successful replace — the new src will trigger onLoad
      setLoaded(false)
    } catch {
      // Replace failed — keep current image visible
    } finally {
      setReplacing(false)
    }
  }

  return (
    <figure
      className="rounded-xl overflow-hidden group"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
        <Image
          src={image.image_url}
          alt={image.caption ?? ''}
          fill
          className="object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          unoptimized
        />
        {isAdmin && onReplace && (
          <button
            onClick={handleReplace}
            disabled={replacing}
            className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
            title="Replace this image"
          >
            {replacing ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            )}
          </button>
        )}
      </div>
      {image.caption && (
        <figcaption
          className="px-3 py-2 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {image.caption}
        </figcaption>
      )}
    </figure>
  )
}

function SideBySide({
  indices,
  allImages,
  isAdmin,
  onReplace,
}: {
  indices: number[]
  allImages: ImageItem[]
  isAdmin?: boolean
  onReplace?: (imageIndex: number) => Promise<void>
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {indices.map((idx) => (
        <GalleryItem
          key={idx}
          image={allImages[idx]}
          imageIndex={idx}
          isAdmin={isAdmin}
          onReplace={onReplace}
        />
      ))}
    </div>
  )
}
