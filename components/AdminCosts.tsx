'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface FallbackStats {
  geminiWritesLast24h: number
  geminiFallbacksLast24h: number
  fallbackRate24h: number // percentage, 0-100
  estimatedExtraCost24h: number
}

interface CostsData {
  totalCost: number
  costByProvider: Record<string, number>
  costByType: Record<string, number>
  articlesThisMonth: number
  avgCostPerArticle: number
  dailyCosts: { date: string; cost: number }[]
  totalCalls: number
  fallbackStats?: FallbackStats
  note: string
}

const TYPE_LABELS: Record<string, string> = {
  plan: 'Planning',
  write: 'Writing',
  refine: 'Refinement',
}

export default function AdminCosts() {
  const [data, setData] = useState<CostsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/costs')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-8">
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Costs
        </h2>
        <div className="animate-pulse h-32 rounded-xl" style={{ backgroundColor: 'var(--border)' }} />
      </div>
    )
  }

  if (!data) return null

  const dailyData = data.dailyCosts.map(d => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
  }))

  return (
    <div className="mb-8">
      <h2
        className="text-lg font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Costs
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <CostCard label="Total spend (month)" value={`$${data.totalCost.toFixed(2)}`} />
        <CostCard label="Avg per article" value={`$${data.avgCostPerArticle.toFixed(2)}`} />
        <CostCard label="Articles this month" value={String(data.articlesThisMonth)} />
        <CostCard label="API calls this month" value={String(data.totalCalls)} />
      </div>

      {/* Fallback alert — shown when 24h fallback rate > 5% */}
      {data.fallbackStats && data.fallbackStats.fallbackRate24h > 5 && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
          style={{ backgroundColor: '#FEF3EC', border: '1px solid #F5C28A' }}
        >
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#BA7517' }}>
              High Gemini fallback rate ({data.fallbackStats.fallbackRate24h.toFixed(1)}% in last 24h)
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8C6010' }}>
              {data.fallbackStats.geminiFallbacksLast24h} of {data.fallbackStats.geminiWritesLast24h + data.fallbackStats.geminiFallbacksLast24h} writes fell back to Sonnet — estimated extra cost: ${data.fallbackStats.estimatedExtraCost24h.toFixed(2)}. Check server logs for Gemini errors.
            </p>
          </div>
        </div>
      )}

      {/* Fallback breakdown — last 24h */}
      {data.fallbackStats && (
        <div
          className="rounded-xl p-4 mb-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Gemini fallback rate (last 24h)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-lg font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}>
                {data.fallbackStats.geminiWritesLast24h}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gemini Flash writes</p>
            </div>
            <div>
              <p
                className="text-lg font-bold"
                style={{
                  color: data.fallbackStats.geminiFallbacksLast24h > 0 ? '#BA7517' : 'var(--accent)',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                {data.fallbackStats.geminiFallbacksLast24h}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sonnet fallbacks</p>
            </div>
            <div>
              <p
                className="text-lg font-bold"
                style={{
                  color: data.fallbackStats.fallbackRate24h > 5 ? '#BA7517' : 'var(--accent)',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                {data.fallbackStats.fallbackRate24h.toFixed(1)}%
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Fallback rate</p>
            </div>
            <div>
              <p
                className="text-lg font-bold"
                style={{
                  color: data.fallbackStats.estimatedExtraCost24h > 0 ? '#BA7517' : 'var(--accent)',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                ${data.fallbackStats.estimatedExtraCost24h.toFixed(2)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Est. extra cost</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily spend chart + breakdown side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily spend bar chart */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Daily spend (last 7 days)
          </p>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94918D' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94918D' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spend']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E8E3DC',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="cost" fill="#E07A3A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown tables */}
        <div className="flex flex-col gap-4">
          {/* By provider */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              By provider
            </p>
            {Object.entries(data.costByProvider)
              .sort(([, a], [, b]) => b - a)
              .map(([provider, cost]) => (
                <div key={provider} className="flex items-center justify-between py-1.5">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{provider}</span>
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
                    ${cost.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>

          {/* By call type */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              By call type
            </p>
            {Object.entries(data.costByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, cost]) => (
                <div key={type} className="flex items-center justify-between py-1.5">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {TYPE_LABELS[type] ?? type}
                  </span>
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
                    ${cost.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Note about incomplete tracking */}
      <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
        {data.note}
      </p>
    </div>
  )
}

function CostCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p
        className="text-xl font-bold mb-1"
        style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
    </div>
  )
}
