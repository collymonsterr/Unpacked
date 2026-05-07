'use client'

import { useState, useRef, useEffect } from 'react'
import type { VideoEmbedSection } from '@/types/article'

/**
 * VideoEmbed — renders a responsive 16:9 iframe for YouTube or Vimeo URLs.
 *
 * Accepts:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/embed/ID
 *   - vimeo.com/ID
 *   - player.vimeo.com/video/ID
 *
 * Lazy-loaded: shows a click-to-load thumbnail until the user opts in. This
 * keeps initial page weight low even when an article embeds 10+ videos
 * (e.g. "best boiler room sets").
 */
function getEmbedUrl(rawUrl: string): { embedUrl: string; thumbnail: string | null; provider: 'youtube' | 'vimeo' } | null {
  if (!rawUrl) return null
  const url = rawUrl.trim()

  // YouTube — watch?v=, youtu.be/, embed/, shorts/
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)
  if (ytMatch) {
    const id = ytMatch[1]
    return {
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      provider: 'youtube',
    }
  }

  // Vimeo — vimeo.com/ID or player.vimeo.com/video/ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      thumbnail: null, // Vimeo thumbnails require an API call we won't make at render time
      provider: 'vimeo',
    }
  }

  return null
}

export default function VideoEmbed({ section }: { section: VideoEmbedSection }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const embed = getEmbedUrl(section.url)
  if (!embed) return null

  const containerStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  }

  return (
    <div ref={ref} className="mb-8">
      {section.heading && (
        <h3
          className="text-lg font-bold mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {section.heading}
        </h3>
      )}

      <div style={containerStyle}>
        <div className="relative w-full" style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
          {loaded ? (
            <iframe
              src={`${embed.embedUrl}${embed.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
              title={section.caption ?? 'Embedded video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <button
              onClick={() => setLoaded(true)}
              aria-label={`Play video: ${section.caption ?? section.url}`}
              className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer group"
              style={{
                backgroundColor: '#000',
                backgroundImage: embed.thumbnail ? `url(${embed.thumbnail})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: 0,
              }}
            >
              {/* Dark overlay for play button visibility */}
              <span
                className="absolute inset-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)', transition: 'background-color 0.2s' }}
              />
              {/* Play button */}
              <span
                className="relative flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
                style={{
                  width: 72,
                  height: 72,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#BA7517" style={{ marginLeft: 4 }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              {/* Provider badge */}
              <span
                className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-widest"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
              >
                {embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}
              </span>
            </button>
          )}
        </div>

        {(section.caption || section.context) && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            {section.caption && (
              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {section.caption}
              </p>
            )}
            {section.context && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {section.context}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
