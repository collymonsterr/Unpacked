'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { InteractiveCalculatorSection } from '@/types/article'

const ACCENT = '#E07A3A'
const ACCENT_LIGHT = '#FEF3EC'

// ── Built-in formulas ────────────────────────────────────────────────────────

function calcCompoundInterest(inputs: Record<string, number>) {
  const startAge = inputs.starting_age ?? 25
  const monthly = inputs.monthly_savings ?? 300
  const annualReturn = (inputs.annual_return ?? 7) / 100
  const retireAge = inputs.retirement_age ?? 65
  const months = Math.max(0, (retireAge - startAge) * 12)
  const r = annualReturn / 12

  const totalContributed = monthly * months
  let total = 0
  if (r > 0) {
    total = monthly * ((Math.pow(1 + r, months) - 1) / r)
  } else {
    total = totalContributed
  }

  // Build growth curve data
  const years = retireAge - startAge
  const chartData = []
  for (let y = 0; y <= years; y += Math.max(1, Math.floor(years / 20))) {
    const m = y * 12
    let val = 0
    if (r > 0) {
      val = monthly * ((Math.pow(1 + r, m) - 1) / r)
    } else {
      val = monthly * m
    }
    chartData.push({ year: `Age ${startAge + y}`, value: Math.round(val), contributed: monthly * m })
  }
  // Ensure final point
  if (chartData.length === 0 || chartData[chartData.length - 1].year !== `Age ${retireAge}`) {
    chartData.push({ year: `Age ${retireAge}`, value: Math.round(total), contributed: totalContributed })
  }

  return {
    outputs: {
      total_saved: Math.round(total),
      total_contributed: Math.round(totalContributed),
      interest_earned: Math.round(total - totalContributed),
    },
    chartData,
  }
}

function calcMortgage(inputs: Record<string, number>) {
  const principal = inputs.home_price ?? inputs.principal ?? 300000
  const downPct = (inputs.down_payment ?? inputs.down_payment_pct ?? 20) / 100
  const annualRate = (inputs.interest_rate ?? inputs.annual_rate ?? 6) / 100
  const termYears = inputs.loan_term ?? inputs.term_years ?? 30
  const loanAmount = principal * (1 - downPct)
  const r = annualRate / 12
  const n = termYears * 12

  let monthlyPayment = 0
  if (r > 0) {
    monthlyPayment = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  } else {
    monthlyPayment = n > 0 ? loanAmount / n : 0
  }

  const totalPaid = monthlyPayment * n
  const totalInterest = totalPaid - loanAmount

  const chartData = []
  let balance = loanAmount
  for (let y = 0; y <= termYears; y += Math.max(1, Math.floor(termYears / 20))) {
    chartData.push({ year: `Year ${y}`, value: Math.round(balance), paid: Math.round(loanAmount - balance) })
    const monthsStep = Math.max(1, Math.floor(termYears / 20)) * 12
    for (let m = 0; m < monthsStep && balance > 0; m++) {
      const interest = balance * r
      const principalPmt = monthlyPayment - interest
      balance = Math.max(0, balance - principalPmt)
    }
  }

  return {
    outputs: {
      monthly_payment: Math.round(monthlyPayment),
      total_paid: Math.round(totalPaid),
      total_interest: Math.round(totalInterest),
      loan_amount: Math.round(loanAmount),
    },
    chartData,
  }
}

function calcRoiComparison(inputs: Record<string, number>) {
  const investment = inputs.investment ?? inputs.initial_investment ?? 10000
  const rateA = (inputs.return_a ?? inputs.rate_a ?? 5) / 100
  const rateB = (inputs.return_b ?? inputs.rate_b ?? 8) / 100
  const years = inputs.years ?? inputs.time_horizon ?? 10

  const chartData = []
  for (let y = 0; y <= years; y++) {
    chartData.push({
      year: `Year ${y}`,
      value: Math.round(investment * Math.pow(1 + rateA, y)),
      optionB: Math.round(investment * Math.pow(1 + rateB, y)),
    })
  }

  return {
    outputs: {
      option_a_total: Math.round(investment * Math.pow(1 + rateA, years)),
      option_b_total: Math.round(investment * Math.pow(1 + rateB, years)),
      difference: Math.round(investment * Math.pow(1 + rateB, years) - investment * Math.pow(1 + rateA, years)),
    },
    chartData,
  }
}

function calcBudget(inputs: Record<string, number>) {
  const income = inputs.monthly_income ?? inputs.income ?? 5000
  const allKeys = Object.keys(inputs).filter(k => k !== 'monthly_income' && k !== 'income')
  let totalExpenses = 0
  allKeys.forEach(k => { totalExpenses += inputs[k] ?? 0 })
  const remaining = income - totalExpenses

  const chartData = allKeys.map(k => ({
    year: k.replace(/_/g, ' '),
    value: inputs[k] ?? 0,
  }))
  if (remaining > 0) {
    chartData.push({ year: 'Remaining', value: remaining })
  }

  return {
    outputs: {
      total_expenses: Math.round(totalExpenses),
      remaining: Math.round(remaining),
      savings_rate: income > 0 ? Math.round((remaining / income) * 100) : 0,
    },
    chartData,
  }
}

function runCalculation(
  type: string,
  inputs: Record<string, number>,
  _formula?: string
): { outputs: Record<string, number>; chartData: Array<Record<string, number | string>> } {
  switch (type) {
    case 'compound_interest': return calcCompoundInterest(inputs)
    case 'mortgage': return calcMortgage(inputs)
    case 'roi_comparison': return calcRoiComparison(inputs)
    case 'budget': return calcBudget(inputs)
    default:
      // Custom — try to evaluate formula or return empty
      return { outputs: {}, chartData: [] }
  }
}

// ── Animated number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, format }: { value: number; format: string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = value

    if (Math.abs(from - to) < 1) {
      setDisplay(to)
      return
    }

    const duration = 400
    const steps = 20
    const stepTime = duration / steps
    let step = 0

    const interval = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (step >= steps) {
        clearInterval(interval)
        setDisplay(to)
      }
    }, stepTime)

    return () => clearInterval(interval)
  }, [value])

  const formatted = useMemo(() => {
    const n = Math.round(display)
    if (format === 'currency') {
      return '$' + n.toLocaleString('en-US')
    }
    if (format === 'percentage') {
      return n + '%'
    }
    return n.toLocaleString('en-US')
  }, [display, format])

  return <>{formatted}</>
}

// ── Main component ───────────────────────────────────────────────────────────

export default function InteractiveCalculator({ section }: { section: InteractiveCalculatorSection }) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    section.inputs.forEach(inp => { initial[inp.id] = inp.default })
    return initial
  })

  const handleChange = useCallback((id: string, val: number) => {
    setValues(prev => ({ ...prev, [id]: val }))
  }, [])

  const result = useMemo(
    () => runCalculation(section.calculator_type, values, section.formula),
    [section.calculator_type, section.formula, values]
  )

  const outputDefs = section.outputs ?? []

  return (
    <div className="mb-8">
      <div
        className="rounded-2xl overflow-hidden p-5 md:p-7"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: ACCENT_LIGHT }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="10" y2="10" />
              <line x1="12" y1="10" x2="14" y2="10" />
              <line x1="8" y1="14" x2="10" y2="14" />
              <line x1="12" y1="14" x2="14" y2="14" />
              <line x1="8" y1="18" x2="14" y2="18" />
            </svg>
          </div>
          <div>
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {section.heading}
            </h3>
            {section.description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {section.description}
              </p>
            )}
          </div>
        </div>

        {/* Sliders */}
        <div className="mt-5 space-y-5">
          {section.inputs.map((input) => (
            <div key={input.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {input.label}
                </label>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: ACCENT, fontFamily: 'var(--font-sora)' }}
                >
                  {input.unit === '$' && '$'}
                  {values[input.id]?.toLocaleString('en-US')}
                  {input.unit && input.unit !== '$' && ` ${input.unit}`}
                </span>
              </div>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step}
                value={values[input.id] ?? input.default}
                onChange={(e) => handleChange(input.id, parseFloat(e.target.value))}
                className="calc-slider"
                style={{
                  width: '100%',
                  accentColor: ACCENT,
                }}
              />
              <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                <span>{input.unit === '$' ? `$${input.min.toLocaleString()}` : `${input.min}${input.unit ? ` ${input.unit}` : ''}`}</span>
                <span>{input.unit === '$' ? `$${input.max.toLocaleString()}` : `${input.max}${input.unit ? ` ${input.unit}` : ''}`}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Output stat cards */}
        {outputDefs.length > 0 && (
          <div className={`grid gap-3 mt-6 ${outputDefs.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {outputDefs.map((out) => (
              <div
                key={out.id}
                className="rounded-xl p-4 text-center"
                style={{
                  backgroundColor: ACCENT_LIGHT,
                  border: `1px solid #f0d5be`,
                }}
              >
                <p
                  className="text-xl md:text-2xl font-extrabold mb-0.5"
                  style={{ fontFamily: 'var(--font-sora)', color: ACCENT }}
                >
                  <AnimatedNumber
                    value={result.outputs[out.id] ?? 0}
                    format={out.format}
                  />
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {out.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Growth chart */}
        {result.chartData.length > 1 && (
          <div className="mt-6" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="calcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                  width={65}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={ACCENT}
                  fill="url(#calcGradient)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Source / disclaimer */}
        {section.source && (
          <p className="text-xs mt-4 italic" style={{ color: 'var(--text-secondary)' }}>
            {section.source}
          </p>
        )}
      </div>

      <style>{`
        .calc-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: var(--border);
          outline: none;
          cursor: pointer;
        }
        .calc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .calc-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${ACCENT};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
