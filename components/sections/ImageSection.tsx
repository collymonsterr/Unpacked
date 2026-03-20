'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ImageSection as ImageSectionType } from '@/types/article'

export default function ImageSection({ section }: { section: ImageSectionType }) {
  const images = section.images.filter((img) => img.image_url)

  if (images.length === 0) return null

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

      {section.layout === 'single' && images[0] && (
        <SingleImage image={images[0]} />
      )}

      {section.layout === 'gallery' && (
        <Gallery images={images} />
      )}

      {section.layout === 'side-by-side' && (
        <SideBySide images={images.slice(0, 2)} />
      )}
    </div>
  )
}

function SingleImage({ image }: { image: { image_url?: string | null; caption?: string } }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (!image.image_url || error) return null

  return (
    <figure
      className="rounded-2xl overflow-hidden"
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

function Gallery({ images }: { images: Array<{ image_url?: string | null; caption?: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {images.map((img, i) => (
        <GalleryItem key={i} image={img} />
      ))}
    </div>
  )
}

function GalleryItem({ image }: { image: { image_url?: string | null; caption?: string } }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (!image.image_url || error) return null

  return (
    <figure
      className="rounded-xl overflow-hidden"
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

function SideBySide({ images }: { images: Array<{ image_url?: string | null; caption?: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {images.map((img, i) => (
        <GalleryItem key={i} image={img} />
      ))}
    </div>
  )
}
