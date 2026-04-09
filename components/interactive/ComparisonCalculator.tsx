'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ComparisonCalculatorData } from '@/types/article'

interface Props {
  data: ComparisonCalculatorData
}

/**
 * Safely evaluate a formula expression with the given input values.
 * Only allows basic math operations — no globals, no side effects.
 */
function safeEval(formula: string, inputs: Record<string, number>): number | null {
  try {
    // Whitelist: only allow numbers, basic operators, Math functions, input variable names, and parentheses
    const sanitised = formula.replace(/\s/g, '')
    const allowed = /^[a-zA-Z0-9_.+\-*/(),%]+$/
    if (!allowed.test(sanitised)) return null

    // Build a function with input values as parameters
    const paramNames = Object.keys(inputs)
    const paramValues = Object.values(inputs)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(
      ...paramNames,
      'Math',
      `"use strict"; return (${formula});`
    )
    const result = fn(...paramValues, Math)
    if (typeof result !== 'number' || !isFinite(result)) return null
    return result
  } catch {
    return null
  }
}

function formatOutput(value: number, format: string, suffix?: string): string {
  let formatted: string
  switch (format) {
    case 'currency':
      formatted = value < 0
        ? `-$${Math.abs(Math.round(value)).toLocaleString()}`
        : `$${Math.round(value).toLocaleString()}`
      break
    case 'percentage':
      formatted = `${value.toFixed(1)}%`
      break
    case 'number':
      formatted = Math.abs(value) >= 1000
        ? Math.round(value).toLocaleString()
        : value.toFixed(1)
      break
    default:
      formatted = String(Math.round(value))
  }
  return suffix ? `${formatted} ${suffix}` : formatted
}

function formatInput(value: number, format?: string, unit?: string): string {
  if (format === 'currency') return `$${value.toLocaleString()}`
  if (format === 'percentage') return `${value}%`
  if (unit) return `${value.toLocaleString()} ${unit}`
  return value.toLocaleString()
}

export default function ComparisonCalculator({ data }: Props) {
  // Initialise slider values from defaults
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const input of data.inputs) {
      initial[input.id] = input.default
    }
    return initial
  })

  const handleChange = useCallback((id: string, value: number) => {
    setValues(prev => ({ ...prev, [id]: value }))
  }, [])

  // Compute outputs
  const outputs = useMemo(() => {
    return data.outputs.map(output => ({
      ...output,
      value: safeEval(output.formula, values),
    }))
  }, [data.outputs, values])

  return (
    <div>
      {/* Comparison labels */}
      {data.comparison_labels && (
        <div className="flex justify-center gap-4 mb-4">
          {data.comparison_labels.map((label, i) => (
            <span
              key={i}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: i === 0 ? '#EAF3DE' : '#FDF6E9',
                color: i === 0 ? '#3B6D11' : '#BA7517',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Input sliders */}
      <div className="space-y-4 mb-5">
        {data.inputs.map(input => (
          <div key={input.id}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: '#1A1714' }}
                htmlFor={`calc-${input.id}`}
              >
                {input.label}
              </label>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: '#BA7517' }}
              >
                {formatInput(values[input.id], input.format, input.unit)}
              </span>
            </div>
            <input
              id={`calc-${input.id}`}
              type="range"
              min={input.min}
              max={input.max}
              step={input.step}
              value={values[input.id]}
              onChange={e => handleChange(input.id, Number(e.target.value))}
              className="w-full accent-[#BA7517]"
              style={{ height: 6 }}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px]" style={{ color: '#94918D' }}>
                {formatInput(input.min, input.format, input.unit)}
              </span>
              <span className="text-[10px]" style={{ color: '#94918D' }}>
                {formatInput(input.max, input.format, input.unit)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Output results */}
      <div
        className="rounded-xl px-4 py-4"
        style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: '#BA7517' }}
        >
          Your results
        </p>
        <div className={`grid gap-3 ${outputs.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {outputs.map(output => (
            <div
              key={output.id}
              className="rounded-lg px-3 py-3 text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
            >
              <p
                className="text-lg font-bold tabular-nums mb-0.5"
                style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}
              >
                {output.value !== null
                  ? formatOutput(output.value, output.format, output.suffix)
                  : '--'}
              </p>
              <p className="text-[11px]" style={{ color: '#6B6259' }}>
                {output.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Data source */}
      {data.data_source && (
        <p className="text-[11px] text-right mt-2" style={{ color: '#94918D' }}>
          Data: {data.data_source}
        </p>
      )}
    </div>
  )
}
