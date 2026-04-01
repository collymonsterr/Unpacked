'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface AnalyticsData {
  totalViews: number
  totalArticles: number
  topArticles: { title: string; slug: string; views: number }[]
  viewsByType: Record<string, number>
  articlesByType: Record<string, number>
  articlesByCategory: Record<string, number>
  viewsTimeSeries: { date: string; views: number }[]
}

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

const COLORS = ['#E07A3A', '#D3D1C7', '#94918D', '#6B6B6B', '#1A1A1A', '#FEF3EC', '#f0d5be', '#c4a882']

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-8 text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        Loading analytics...
      </div>
    )
  }

  if (!data) return null

  const pieData = Object.entries(data.articlesByType).map(([type, count]) => ({
    name: TYPE_LABELS[type] ?? type,
    value: count,
  }))

  return (
    <div className="mb-10">
      <h2
        className="text-xl font-bold mb-6"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Analytics
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Views" value={data.totalViews.toLocaleString()} />
        <StatCard label="Total Articles" value={data.totalArticles.toString()} />
        <StatCard
          label="Avg Views / Article"
          value={data.totalArticles > 0 ? Math.round(data.totalViews / data.totalArticles).toString() : '0'}
        />
        <StatCard
          label="Article Types"
          value={Object.keys(data.articlesByType).length.toString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views over time */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            Views — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.viewsTimeSeries}>
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                tick={{ fontSize: 10, fill: '#94918D' }}
                interval={6}
              />
              <YAxis tick={{ fontSize: 10, fill: '#94918D' }} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 12, backgroundColor: '#fff', border: '1px solid #E8E8E5', borderRadius: 8 }}
                labelFormatter={(d) => new Date(String(d)).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              />
              <Area type="monotone" dataKey="views" stroke="#E07A3A" fill="#FEF3EC" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 articles */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            Top Articles
          </h3>
          {data.topArticles.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, data.topArticles.length * 44 + 40)}>
              <BarChart data={data.topArticles} layout="vertical" margin={{ left: 10, right: 20 }} barSize={22}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94918D' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={220}
                  tick={{ fontSize: 11, fill: '#6B6B6B' }}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, backgroundColor: '#fff', border: '1px solid #E8E8E5', borderRadius: 8 }}
                />
                <Bar dataKey="views" fill="#E07A3A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              No views yet — visit some articles to start tracking
            </p>
          )}
        </div>

        {/* Articles by type — bar chart */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            Articles by Type
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, pieData.length * 36 + 40)}>
            <BarChart data={pieData.sort((a, b) => b.value - a.value)} layout="vertical" margin={{ left: 10, right: 30 }} barSize={20}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94918D' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11, fill: '#6B6B6B' }}
                interval={0}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, backgroundColor: '#fff', border: '1px solid #E8E8E5', borderRadius: 8 }}
              />
              <Bar dataKey="value" name="Articles" radius={[0, 4, 4, 0]}>
                {pieData.sort((a, b) => b.value - a.value).map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#E07A3A' : '#D3D1C7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Views by type */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            Views by Category
          </h3>
          <div className="space-y-3">
            {Object.entries(data.viewsByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, views]) => {
                const maxViews = Math.max(...Object.values(data.viewsByType), 1)
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{TYPE_LABELS[type] ?? type}</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{views}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(views / maxViews) * 100}%`,
                          backgroundColor: 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Category breakdown table */}
      {data.articlesByCategory && (
        <div
          className="rounded-xl p-5 mt-6"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            Content by Category
          </h3>
          <div className="space-y-2.5">
            {Object.entries(data.articlesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const maxCount = Math.max(...Object.values(data.articlesByCategory), 1)
                const isEmpty = count === 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: isEmpty ? '#D97706' : 'var(--text-secondary)', fontWeight: isEmpty ? 600 : 400 }}>
                        {cat}{isEmpty ? ' ⚠' : ''}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: isEmpty ? '#D97706' : 'var(--text-primary)' }}
                      >
                        {count} {count === 1 ? 'article' : 'articles'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: count > 0 ? `${Math.max((count / maxCount) * 100, 2)}%` : '0%',
                          backgroundColor: isEmpty ? 'transparent' : 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p
        className="text-2xl font-bold"
        style={{ color: 'var(--accent)', fontFamily: 'var(--font-sora)' }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  )
}
