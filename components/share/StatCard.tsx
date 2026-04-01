'use client'

import type { ImageCardData } from '@/lib/social-content'

interface Props {
  card: ImageCardData
}

export default function StatCard({ card }: Props) {
  return (
    <div
      data-screenshot="true"
      className="relative overflow-hidden"
      style={{
        width: '100%',
        aspectRatio: '1200 / 630',
        backgroundColor: '#FAFAF8',
        border: '1px solid #e8e6e3',
        borderRadius: '12px',
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        {/* Top — Title */}
        <div>
          <p
            className="text-xs uppercase tracking-widest mb-2"
            style={{ color: '#BA7517', fontFamily: 'var(--font-sora)', fontWeight: 600, letterSpacing: '0.1em' }}
          >
            Key Data
          </p>
          <h2
            className="text-base sm:text-lg font-semibold leading-snug"
            style={{ color: '#1a1a1a', fontFamily: 'var(--font-sora)' }}
          >
            {card.title}
          </h2>
        </div>

        {/* Centre — Stat */}
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="text-center">
            <p
              className="text-3xl sm:text-4xl font-extrabold leading-none"
              style={{ color: '#1a1a1a', fontFamily: 'var(--font-sora)' }}
            >
              {card.content}
            </p>
            {card.subtitle && (
              <p
                className="mt-2 text-sm"
                style={{ color: '#666', fontFamily: 'var(--font-outfit)' }}
              >
                {card.subtitle}
              </p>
            )}
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
            <span className="text-xs" style={{ color: '#999' }}>·</span>
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
