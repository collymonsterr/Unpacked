'use client'

import { useRef, useState, useEffect } from 'react'
import type { ComparisonMatrixSection } from '@/types/article'

const HIGHLIGHT_COLOR = '#E07A3A'
const NEUTRAL_COLOR = '#D3D1C7'
const BAR_BG = '#ECEAE6'

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
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {section.description}
          </p>
        )}

        <div className="overflow-x-auto -mx-1">
          <table className="w-full" style={{ minWidth: section.items.length > 3 ? 600 : 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="text-left text-xs uppercase tracking-wide py-3 pr-4 pl-1"
                  style={{ color: 'var(--text-secondary)', width: '20%', minWidth: 100 }}
                >
                  Metric
                </th>
                {section.items.map((item) => (
                  <th
                    key={item}
                    className="text-left text-sm font-bold py-3 px-3"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sora)',
                    }}
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.metrics.map((metric, mi) => {
                const scores = section.items.map((_, i) => metric.scores[i] ?? 0)
                const maxScore = Math.max(...scores)
                return (
                  <tr key={metric.name} style={{ borderTop: '1px solid var(--border)' }}>
                    <td
                      className="text-sm font-medium py-3 pr-4 pl-1"
                      style={{ color: 'var(--text-primary)', verticalAlign: 'middle' }}
                    >
                      {metric.name}
                    </td>
                    {scores.map((score, si) => {
                      const isHighest = score === maxScore && score > 0
                      const pct = metric.max > 0 ? (score / metric.max) * 100 : 0
                      return (
                        <td key={si} className="py-3 px-3" style={{ verticalAlign: 'middle' }}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: BAR_BG, height: 8 }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: visible ? `${pct}%` : '0%',
                                  backgroundColor: isHighest ? HIGHLIGHT_COLOR : NEUTRAL_COLOR,
                                  transition: `width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${mi * 120 + si * 60}ms`,
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-semibold tabular-nums whitespace-nowrap"
                              style={{
                                color: isHighest ? HIGHLIGHT_COLOR : 'var(--text-secondary)',
                                minWidth: 36,
                                textAlign: 'right',
                              }}
                            >
                              {score}/{metric.max}
                            </span>
                          </div>
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
