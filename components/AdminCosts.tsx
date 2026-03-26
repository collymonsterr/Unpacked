'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface CostsData {
  totalCost: number
  costByProvider: Record<string, number>
  costByType: Record<string, number>
  articlesThisMonth: number
  avgCostPerArticle: number
  dailyCosts: { date: string; cost: number }[]
  totalCalls: number
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
