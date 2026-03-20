'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { TreemapSection as TreemapSectionType } from '@/types/article'

const COLORS = ['#E07A3A', '#2D7D9A', '#D4A843', '#6B8F71', '#8B6DB0', '#94918D', '#B87D5E']

interface CustomContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  name?: string
  value?: number
  highlight?: boolean
}

function CustomTreemapContent(props: CustomContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name, value } = props
  const highlight = props.highlight
  const color = highlight ? COLORS[0] : COLORS[(index % (COLORS.length - 1)) + 1]

  if (width < 30 || height < 30) return null

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 100 ? 13 : 11}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize={width > 100 ? 12 : 10}
          >
            {value}
          </text>
        </>
      )}
    </g>
  )
}

export default function TreemapSection({ section }: { section: TreemapSectionType }) {
  const data = section.data.map((d) => ({
    name: d.label,
    value: d.value,
    highlight: d.highlight,
  }))

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
            <Treemap
              data={data}
              dataKey="value"
              nameKey="name"
              content={<CustomTreemapContent />}
              isAnimationActive
              animationDuration={1000}
              animationBegin={200}
            >
              <Tooltip
                formatter={(value) => `${value}${section.unit ? ` ${section.unit}` : ''}`}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
              />
            </Treemap>
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
