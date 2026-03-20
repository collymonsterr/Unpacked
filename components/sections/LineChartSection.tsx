'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts'
import type { LineChartSection as LineChartSectionType } from '@/types/article'

const COLORS = ['#E07A3A', '#2D7D9A', '#D4A843', '#6B8F71', '#8B6DB0']

export default function LineChartSection({ section }: { section: LineChartSectionType }) {
  // Merge all series into a single data array keyed by x
  const mergedData = (() => {
    const map = new Map<string, Record<string, number | string>>()
    for (const s of section.series) {
      for (const point of s.data) {
        const existing = map.get(point.x) ?? { x: point.x }
        existing[s.name] = point.y
        map.set(point.x, existing)
      }
    }
    return Array.from(map.values())
  })()

  return (
    <div className="mb-8">
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

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {section.fill_area ? (
              <AreaChart data={mergedData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  {section.series.map((s, i) => (
                    <linearGradient key={s.name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={section.x_label ? { value: section.x_label, position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-secondary)' } : undefined} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={section.y_label ? { value: section.y_label, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-secondary)' } : undefined} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                {section.series.length > 1 && <Legend />}
                {section.series.map((s, i) => (
                  <Area
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={COLORS[i % COLORS.length]}
                    fill={`url(#gradient-${i})`}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                    isAnimationActive
                    animationDuration={1200}
                    animationBegin={200}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={mergedData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={section.x_label ? { value: section.x_label, position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-secondary)' } : undefined} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={section.y_label ? { value: section.y_label, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-secondary)' } : undefined} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                {section.series.length > 1 && <Legend />}
                {section.series.map((s, i) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                    isAnimationActive
                    animationDuration={1200}
                    animationBegin={200}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {section.source && (
          <p className="text-xs mt-3 italic" style={{ color: 'var(--text-secondary)' }}>
            {section.source}
          </p>
        )}
      </div>
    </div>
  )
}
