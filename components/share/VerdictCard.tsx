'use client'

import type { ImageCardData } from '@/lib/social-content'

interface Props {
  card: ImageCardData
  /** 'landscape' for Twitter/LinkedIn (1200x630), 'square' for Instagram (1080x1080) */
  aspect?: 'landscape' | 'square'
}

export default function VerdictCard({ card, aspect = 'landscape' }: Props) {
  const isSquare = aspect === 'square'

  return (
    <div
      data-screenshot="true"
      className="relative overflow-hidden"
      style={{
        width: '100%',
        aspectRatio: isSquare ? '1 / 1' : '1200 / 630',
        backgroundColor: '#FAFAF8',
        border: '1px solid #e8e6e3',
        borderRadius: '12px',
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        {/* Top — Title */}
        <div>
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: '#BA7517', fontFamily: 'var(--font-sora)', fontWeight: 600, letterSpacing: '0.1em' }}
          >
            The Verdict
          </p>
          <h2
            className="text-lg sm:text-xl font-bold leading-snug"
            style={{ color: '#1a1a1a', fontFamily: 'var(--font-sora)' }}
          >
            {card.title}
          </h2>
        </div>

        {/* Centre — Verdict */}
        <div className="flex-1 flex items-center py-4">
          <div className="w-full">
            <div
              className="w-full h-px mb-4"
              style={{ backgroundColor: '#d4d0cb' }}
            />
            <div className="flex items-start gap-3">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0 mt-0.5"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="#BA7517"
                />
              </svg>
              <p
                className="text-sm sm:text-base leading-relaxed"
                style={{
                  color: '#333',
                  fontFamily: 'var(--font-outfit)',
                  fontStyle: 'italic',
                }}
              >
                {card.content}
              </p>
            </div>
            {card.subtitle && (
              <p
                className="mt-2 ml-9 text-xs"
                style={{ color: '#888', fontFamily: 'var(--font-outfit)' }}
              >
                {card.subtitle}
              </p>
            )}
            <div
              className="w-full h-px mt-4"
              style={{ backgroundColor: '#d4d0cb' }}
            />
          </div>
        </div>

        {/* Bottom — Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: '#1a1a1a', fontFamily: 'var(--font-sora)' }}
            >
              Unpacked.
            </span>
            <span className="text-xs" style={{ color: '#999' }}>
              ·
            </span>
            <span
              className="text-xs"
              style={{ color: '#666', fontFamily: 'var(--font-outfit)' }}
            >
              {card.creator_name}
            </span>
          </div>
          <span
            className="text-[10px]"
            style={{ color: '#aaa', fontFamily: 'var(--font-outfit)' }}
          >
            unpacked.fyi
          </span>
        </div>
      </div>
    </div>
  )
}
