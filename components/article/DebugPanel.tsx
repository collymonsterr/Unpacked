'use client'

import { useState } from 'react'
import type { VisualStrategy } from '@/types/article'

export default function DebugPanel({
  articleType,
  visualStrategy,
  sections,
}: {
  articleType: string
  visualStrategy: VisualStrategy
  sections: string[]
}) {
  const [open, setOpen] = useState(false)

  const sectionCounts = sections.reduce<Record<string, number>>((acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1
    return acc
  }, {})

  const enabled = Object.entries(visualStrategy)
    .filter(([k, v]) => k.startsWith('use_') && v === true)
    .map(([k]) => k.replace('use_', ''))

  const disabled = Object.entries(visualStrategy)
    .filter(([k, v]) => k.startsWith('use_') && v === false)
    .map(([k]) => k.replace('use_', ''))

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-mono px-3 py-1 rounded"
        style={{ backgroundColor: '#1a1a2e', color: '#00d4aa' }}
      >
        {open ? '▼' : '▶'} Debug: {articleType} / {visualStrategy.image_density} images
      </button>
      {open && (
        <div
          className="mt-2 p-4 rounded-lg text-xs font-mono leading-relaxed"
          style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}
        >
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Article Type:</span> {articleType}
          </div>
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Image Density:</span> {visualStrategy.image_density}
          </div>
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Enabled:</span>{' '}
            {enabled.map((c) => (
              <span key={c} className="inline-block mr-1 px-1 rounded" style={{ backgroundColor: '#0d3320', color: '#4ade80' }}>
                {c}
              </span>
            ))}
          </div>
          <div className="mb-2">
            <span style={{ color: '#00d4aa' }}>Disabled:</span>{' '}
            {disabled.map((c) => (
              <span key={c} className="inline-block mr-1 px-1 rounded" style={{ backgroundColor: '#3b1c1c', color: '#f87171' }}>
                {c}
              </span>
            ))}
          </div>
          <div>
            <span style={{ color: '#00d4aa' }}>Sections rendered:</span>{' '}
            {Object.entries(sectionCounts).map(([type, count]) => (
              <span key={type} className="inline-block mr-1 px-1 rounded" style={{ backgroundColor: '#1e293b', color: '#93c5fd' }}>
                {type}{count > 1 ? ` ×${count}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
