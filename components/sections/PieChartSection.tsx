'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { PieChartSection as PieChartSectionType } from '@/types/article'

const COLORS = ['#E07A3A', '#2D7D9A', '#D4A843', '#6B8F71', '#8B6DB0', '#94918D']

export default function PieChartSection({ section }: { section: PieChartSectionType }) {
  // Reorder so highlighted item gets the primary color
  const highlightIndex = section.data.findIndex((d) => d.highlight)
  const colorMap = section.data.map((_, i) => {
    if (highlightIndex >= 0 && i === highlightIndex) return COLORS[0]
    const offset = highlightIndex >= 0 && i > highlightIndex ? i : i
    return COLORS[(highlightIndex >= 0 ? offset : i) % COLORS.length]
  })

  const isDonut = section.variant === 'donut'

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

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={section.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={isDonut ? '55%' : 0}
                outerRadius="80%"
                paddingAngle={2}
                isAnimationActive
                animationDuration={1000}
                animationBegin={200}
              >
                {section.data.map((_, i) => (
                  <Cell key={i} fill={colorMap[i]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value}${section.unit ?? ''}`}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value: string) => (
                  <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
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
