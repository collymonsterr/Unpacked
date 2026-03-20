'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { BarChartSection as BarChartSectionType } from '@/types/article'

const HIGHLIGHT_COLOR = '#E07A3A'
const NEUTRAL_COLOR = '#C4C0B9'

export default function BarChartSection({ section }: { section: BarChartSectionType }) {
  const isHorizontal = section.orientation === 'horizontal'

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

        <div style={{ width: '100%', height: isHorizontal ? Math.max(250, section.data.length * 50) : 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              {isHorizontal ? (
                <BarChart data={section.data} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={section.y_label ? { value: section.y_label, position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-secondary)' } : undefined} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-primary)' }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={1000} animationBegin={200}>
                    {section.data.map((entry, i) => (
                      <Cell key={i} fill={entry.highlight ? HIGHLIGHT_COLOR : NEUTRAL_COLOR} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-primary)' }} />
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={section.data} margin={{ left: 0, right: 10, top: 5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} label={section.y_label ? { value: section.y_label, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--text-secondary)' } : undefined} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1000} animationBegin={200}>
                    {section.data.map((entry, i) => (
                      <Cell key={i} fill={entry.highlight ? HIGHLIGHT_COLOR : NEUTRAL_COLOR} />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-primary)' }} />
                  </Bar>
                </BarChart>
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
