'use client'

import { useRef, useState, useEffect } from 'react'
import type { ComparisonMatrixSection } from '@/types/article'

const HIGHLIGHT_COLOR = '#E07A3A'
const NEUTRAL_COLOR = '#8A8580'
const DOT_BG = '#E8E6E3'

export default function ComparisonMatrix({ section }: { section: ComparisonMatrixSection }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="mb-8">
      <div
        className="rounded-2xl overflow-hidden p-5 md:p-6"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h3
          className="text-lg font-bold mb-1"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {section.heading}
        </h3>
        {section.description && (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {section.description}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: section.items.length > 3 ? 500 : 'auto' }}>
            <thead>
              <tr>
                <th className="text-left text-xs uppercase tracking-wide py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>
                  Metric
                </th>
                {section.items.map((item) => (
                  <th
                    key={item}
                    className="text-center text-xs font-semibold uppercase tracking-wide py-2 px-2"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.metrics.map((metric, mi) => {
                // Pad scores to match items length (handles AI generating fewer scores than items)
                const scores = section.items.map((_, i) => metric.scores[i] ?? 0)
                const maxScore = Math.max(...scores)
                return (
                  <tr key={metric.name} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="text-sm font-medium py-3 pr-4" style={{ color: 'var(--text-primary)' }}>
                      {metric.name}
                    </td>
                    {scores.map((score, si) => {
                      const isHighest = score === maxScore
                      return (
                        <td key={si} className="py-3 px-2">
                          <div className="flex justify-center gap-1">
                            {Array.from({ length: metric.max }, (_, di) => (
                              <div
                                key={di}
                                className="rounded-full"
                                style={{
                                  width: 8,
                                  height: 8,
                                  backgroundColor: di < score
                                    ? (isHighest ? HIGHLIGHT_COLOR : NEUTRAL_COLOR)
                                    : DOT_BG,
                                  transition: visible ? `background-color 0.3s ease ${(mi * metric.max + di) * 30}ms` : 'none',
                                }}
                              />
                            ))}
                          </div>
                          <p
                            className="text-center text-xs font-semibold mt-1"
                            style={{ color: isHighest ? HIGHLIGHT_COLOR : 'var(--text-secondary)' }}
                          >
                            {score}/{metric.max}
                          </p>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
