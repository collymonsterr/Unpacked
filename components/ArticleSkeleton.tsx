'use client'

import { useState, useEffect } from 'react'

interface Props {
  /** Section titles from the plan or article */
  sections?: string[]
  /** Article title if known */
  title?: string
  /** Article type if known */
  articleType?: string
  /** Verdict preview text if known */
  verdictPreview?: string
  /** Show hero image placeholder */
  showHero?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buying Guide',
  comparison: 'Comparison',
  decision_guide: 'Decision Guide',
  explainer: 'Explainer',
  news: 'News',
  planning: 'Travel & Living',
  trend_analysis: 'Trend Analysis',
  tutorial: 'Tutorial',
}

export default function ArticleSkeleton({
  sections = [],
  title,
  articleType,
  verdictPreview,
  showHero = true,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(0)

  // Progressive reveal: show sections one at a time
  useEffect(() => {
    // Show verdict immediately
    setVisibleCount(1)

    const totalItems = 2 + sections.length // verdict + summary + sections
    let current = 1

    const interval = setInterval(() => {
      current++
      setVisibleCount(current)
      if (current >= totalItems) clearInterval(interval)
    }, 300)

    return () => clearInterval(interval)
  }, [sections.length])

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      {/* Hero image placeholder */}
      {showHero && (
        <div
          className="w-full rounded-2xl mb-8 skeleton-shimmer"
          style={{
            aspectRatio: '16 / 9',
            backgroundColor: 'var(--border)',
          }}
        />
      )}

      {/* Title */}
      {title ? (
        <h1
          className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
      ) : (
        <div className="mb-6">
          <div className="h-10 rounded-lg skeleton-shimmer mb-2" style={{ width: '80%', backgroundColor: 'var(--border)' }} />
          <div className="h-10 rounded-lg skeleton-shimmer" style={{ width: '55%', backgroundColor: 'var(--border)' }} />
        </div>
      )}

      {/* Article type */}
      {articleType && (
        <p
          className="text-sm font-medium uppercase tracking-wide mb-3"
          style={{ color: '#E07A3A' }}
        >
          {TYPE_LABELS[articleType] ?? articleType.replace(/_/g, ' ')}
        </p>
      )}

      {/* Meta row placeholder */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-4 rounded skeleton-shimmer" style={{ width: '120px', backgroundColor: 'var(--border)' }} />
        <div className="h-4 rounded skeleton-shimmer" style={{ width: '80px', backgroundColor: 'var(--border)' }} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} className="mb-8" />

      {/* Verdict skeleton */}
      {visibleCount >= 1 && (
        <div
          className="rounded-xl p-5 mb-8 skeleton-fade-in"
          style={{
            backgroundColor: 'var(--accent-light)',
            borderLeft: '4px solid var(--accent)',
          }}
        >
          {verdictPreview ? (
            <>
              <span
                className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase mb-2"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Verdict
              </span>
              <p
                className="text-lg font-bold leading-snug"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {verdictPreview}
              </p>
            </>
          ) : (
            <>
              <div className="h-4 rounded skeleton-shimmer mb-3" style={{ width: '80px', backgroundColor: 'var(--accent)', opacity: 0.3 }} />
              <div className="h-5 rounded skeleton-shimmer mb-2" style={{ width: '90%', backgroundColor: 'var(--border)' }} />
              <div className="h-5 rounded skeleton-shimmer" style={{ width: '70%', backgroundColor: 'var(--border)' }} />
            </>
          )}
        </div>
      )}

      {/* Executive summary skeleton */}
      {visibleCount >= 2 && (
        <div className="mb-8 skeleton-fade-in">
          <div className="h-6 rounded-lg skeleton-shimmer mb-4" style={{ width: '200px', backgroundColor: 'var(--border)' }} />
          <SkeletonParagraph lines={3} />
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)' }} className="mb-8" />

      {/* Section skeletons */}
      {sections.map((sectionTitle, i) => (
        visibleCount >= 3 + i && (
          <div key={i} className="mb-10 skeleton-fade-in">
            <h2
              className="text-xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {sectionTitle}
            </h2>
            <SkeletonParagraph lines={i % 2 === 0 ? 4 : 3} />
          </div>
        )
      ))}

      {/* CSS for animations */}
      <style>{`
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            var(--border) 25%,
            #f0efed 37%,
            var(--border) 63%
          );
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .skeleton-fade-in {
          animation: skeletonFadeIn 0.35s ease-out;
        }
        @keyframes skeletonFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function SkeletonParagraph({ lines }: { lines: number }) {
  const widths = ['100%', '92%', '85%', '78%', '70%']
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded skeleton-shimmer"
          style={{
            width: widths[i % widths.length],
            backgroundColor: 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}
