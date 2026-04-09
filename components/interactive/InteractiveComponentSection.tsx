'use client'

import dynamic from 'next/dynamic'
import type { InteractiveComponentData } from '@/types/article'

// Lazy-load sub-components (Leaflet especially benefits from this)
const DecisionTool = dynamic(() => import('./DecisionTool'), { ssr: false })
const ScenarioSimulator = dynamic(() => import('./ScenarioSimulator'), { ssr: false })
const InteractiveMap = dynamic(() => import('./InteractiveMap'), { ssr: false })
const ComparisonCalculator = dynamic(() => import('./ComparisonCalculator'), { ssr: false })

interface Props {
  data: InteractiveComponentData
}

const TYPE_LABELS: Record<string, string> = {
  decision_tool: 'Decision Tool',
  scenario_simulator: 'Scenario Simulator',
  interactive_map: 'Interactive Map',
  comparison_calculator: 'Calculator',
}

export default function InteractiveComponentSection({ data }: Props) {
  if (!data || !data.type || !data.title) return null

  return (
    <div
      className="mb-8 rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--card, #FFFFFF)',
        border: '1px solid var(--border, #E8E2D9)',
        borderLeft: '3px solid #BA7517',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Interactive icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#BA7517"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: '#BA7517' }}
          >
            {TYPE_LABELS[data.type] ?? 'Interactive'}
          </span>
        </div>
        <h3
          className="text-lg font-bold mb-1"
          style={{ color: 'var(--text-primary, #1A1714)', fontFamily: 'var(--font-sora)' }}
        >
          {data.title}
        </h3>
        {data.subtitle && (
          <p className="text-sm mb-0" style={{ color: '#6B6259' }}>
            {data.subtitle}
          </p>
        )}
      </div>

      {/* Component body */}
      <div className="px-5 py-4" style={{ overflowX: 'hidden' }}>
        {data.type === 'decision_tool' && <DecisionTool data={data} />}
        {data.type === 'scenario_simulator' && <ScenarioSimulator data={data} />}
        {data.type === 'interactive_map' && <InteractiveMap data={data} />}
        {data.type === 'comparison_calculator' && <ComparisonCalculator data={data} />}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2.5 flex justify-end"
        style={{ borderTop: '1px solid var(--border, #E8E2D9)' }}
      >
        <span className="text-[10px]" style={{ color: '#94918D' }}>
          Generated for this article
        </span>
      </div>
    </div>
  )
}
