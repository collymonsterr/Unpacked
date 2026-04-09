'use client'

import { useState } from 'react'
import type { ScenarioSimulatorData } from '@/types/article'

interface Props {
  data: ScenarioSimulatorData
}

const IMPACT_COLORS = {
  positive: '#3B6D11',
  negative: '#A32D2D',
  neutral: '#6B6259',
}

export default function ScenarioSimulator({ data }: Props) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)

  const activeScenario = data.scenarios.find(s => s.id === activeScenarioId)

  return (
    <div>
      {/* Scenario cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        {data.scenarios.map(scenario => {
          const isActive = scenario.id === activeScenarioId
          return (
            <button
              key={scenario.id}
              onClick={() => setActiveScenarioId(isActive ? null : scenario.id)}
              className="text-left rounded-xl px-3 py-3 sm:px-4 sm:py-4 transition-all duration-200"
              style={{
                backgroundColor: isActive ? '#FDF6E9' : '#FFFFFF',
                border: isActive ? '2px solid #BA7517' : '1px solid #E8E2D9',
                cursor: 'pointer',
              }}
            >
              <p
                className="text-sm font-semibold mb-1 line-clamp-2"
                style={{
                  color: isActive ? '#BA7517' : '#1A1714',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                {scenario.name}
              </p>
              <div className="flex items-center gap-1.5">
                <div
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: scenario.probability >= 50
                      ? '#3B6D11'
                      : scenario.probability >= 20
                        ? '#BA7517'
                        : '#A32D2D',
                  }}
                />
                <span className="text-xs font-bold" style={{ color: '#6B6259' }}>
                  {scenario.probability}%
                </span>
                {scenario.probability_source && (
                  <span className="text-[10px]" style={{ color: '#94918D' }}>
                    {scenario.probability_source}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Impact breakdown */}
      {activeScenario && (
        <div
          className="rounded-xl px-4 py-4 mb-3"
          style={{
            backgroundColor: '#FDF6E9',
            border: '1px solid #F0D9A8',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h5
              className="text-sm font-bold"
              style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}
            >
              {activeScenario.name}
            </h5>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#E8E2D9', color: '#6B6259' }}
            >
              {activeScenario.probability}% likely
            </span>
          </div>

          {/* Impact bars */}
          <div className="space-y-3 mb-4">
            {activeScenario.impacts.map((impact, i) => {
              const isPositive = impact.value >= 0
              const absValue = Math.min(Math.abs(impact.value), 100)
              const color = impact.value > 5
                ? IMPACT_COLORS.positive
                : impact.value < -5
                  ? IMPACT_COLORS.negative
                  : IMPACT_COLORS.neutral

              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: '#1A1714' }}>
                      {impact.dimension}
                    </span>
                    <span className="text-xs font-bold" style={{ color }}>
                      {impact.label}
                    </span>
                  </div>
                  <div
                    className="relative h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#E8E2D9' }}
                  >
                    {/* Center line */}
                    <div
                      className="absolute top-0 h-full"
                      style={{ left: '50%', width: 1, backgroundColor: '#1A1714', opacity: 0.15 }}
                    />
                    {/* Impact bar */}
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{
                        [isPositive ? 'left' : 'right']: '50%',
                        width: `${absValue / 2}%`,
                        backgroundColor: color,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: '#94918D' }}>
                    {impact.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Verdict */}
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
          >
            <p className="text-xs font-medium leading-relaxed" style={{ color: '#412402' }}>
              {activeScenario.verdict}
            </p>
          </div>
        </div>
      )}

      {!activeScenario && (
        <p className="text-center text-xs py-3" style={{ color: '#94918D' }}>
          Select a scenario to see projected impacts
        </p>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
