'use client'

import { useRef, useState, useEffect } from 'react'
import { forwardRef } from 'react'

interface LiveDataCardProps {
  section: {
    type: 'live_data_card'
    data_source: 'polymarket' | 'yahoo_finance' | 'google_trends'
    content: Record<string, unknown>
  }
}

export default function LiveDataCard({ section }: LiveDataCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.2 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const cardStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  }

  switch (section.data_source) {
    case 'polymarket':
      return <PolymarketCard content={section.content} cardStyle={cardStyle} ref={ref} />
    case 'yahoo_finance':
      return <YahooFinanceCard content={section.content} cardStyle={cardStyle} ref={ref} />
    case 'google_trends':
      return <GoogleTrendsCard content={section.content} cardStyle={cardStyle} ref={ref} />
    default:
      return null
  }
}

// ── Badge Component ──────────────────────────────────────────────────────────

function SourceBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: 'var(--accent, #BA7517)',
        color: '#fff',
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </span>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] hover:underline"
      style={{ color: 'var(--accent, #BA7517)' }}
    >
      {children} →
    </a>
  )
}

// ── Polymarket Card ──────────────────────────────────────────────────────────

const PolymarketCard = forwardRef<HTMLDivElement, {
  content: Record<string, unknown>
  cardStyle: React.CSSProperties
}>(({ content, cardStyle }, ref) => {
  const question = String(content.question ?? '')
  const outcomes = Array.isArray(content.outcomes) ? content.outcomes.map(String) : []
  const probabilities = Array.isArray(content.probabilities)
    ? content.probabilities.map(Number)
    : []
  const volume = Number(content.volume ?? 0)
  const url = String(content.url ?? 'https://polymarket.com')

  const formatVolume = (v: number): string => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }

  const isBinary = outcomes.length === 2

  return (
    <div ref={ref} className="rounded-xl px-4 py-3" style={cardStyle}>
      <div className="flex items-center gap-2 mb-2">
        <SourceBadge label="Polymarket" />
      </div>

      <p
        className="text-sm font-semibold mb-2 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {question}
      </p>

      {/* Outcomes — binary (Yes/No) shown side-by-side, multi stacked */}
      {isBinary ? (
        <div className="flex gap-3 mb-2">
          {outcomes.map((outcome, i) => {
            const prob = probabilities[i] ?? 0
            const pct = Math.round(prob * 100)
            return (
              <div key={i} className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {outcome}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ fontFamily: 'var(--font-sora)', color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: i === 0 ? 'var(--accent, #BA7517)' : 'var(--text-secondary, #999)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-1.5 mb-2">
          {outcomes.map((outcome, i) => {
            const prob = probabilities[i] ?? 0
            const pct = Math.round(prob * 100)
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {outcome}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: i === 0 ? 'var(--accent, #BA7517)' : 'var(--text-secondary, #999)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {formatVolume(volume)} traded
        </span>
        <ExternalLink href={url}>polymarket.com</ExternalLink>
      </div>
    </div>
  )
})
PolymarketCard.displayName = 'PolymarketCard'

// ── Yahoo Finance Card ───────────────────────────────────────────────────────

const YahooFinanceCard = forwardRef<HTMLDivElement, {
  content: Record<string, unknown>
  cardStyle: React.CSSProperties
}>(({ content, cardStyle }, ref) => {
  const symbol = String(content.symbol ?? '')
  const name = String(content.name ?? '')
  const price = Number(content.price ?? 0)
  const change = Number(content.change ?? 0)
  const changePercent = Number(content.changePercent ?? 0)
  const currency = String(content.currency ?? 'USD')
  const url = String(content.url ?? 'https://finance.yahoo.com')

  const isPositive = change >= 0
  const changeColor = isPositive ? '#16a34a' : '#dc2626'
  const arrow = isPositive ? '▲' : '▼'

  const formatPrice = (p: number, curr: string): string => {
    if (curr === 'USD') return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (curr === 'GBP') return `£${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (curr === 'EUR') return `€${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`
  }

  return (
    <div ref={ref} className="rounded-xl px-4 py-3" style={cardStyle}>
      <div className="flex items-center gap-2 mb-2">
        <SourceBadge label="Yahoo Finance" />
      </div>

      <div className="flex items-baseline gap-2 mb-0.5">
        <span
          className="text-xs font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
        >
          {symbol}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {name}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span
          className="text-xl md:text-2xl font-extrabold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {formatPrice(price, currency)}
        </span>
        <span className="text-sm font-bold" style={{ color: changeColor }}>
          {arrow} {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          <span className="text-xs font-normal ml-1">
            ({change >= 0 ? '+' : ''}{formatPrice(Math.abs(change), currency)})
          </span>
        </span>
      </div>

      <ExternalLink href={url}>finance.yahoo.com</ExternalLink>
    </div>
  )
})
YahooFinanceCard.displayName = 'YahooFinanceCard'

// ── Google Trends Card ───────────────────────────────────────────────────────

const GoogleTrendsCard = forwardRef<HTMLDivElement, {
  content: Record<string, unknown>
  cardStyle: React.CSSProperties
}>(({ content, cardStyle }, ref) => {
  const query = String(content.query ?? '')
  const trend = String(content.trend ?? 'stable') as 'rising' | 'declining' | 'stable' | 'peaking'
  const currentInterest = Number(content.currentInterest ?? 0)
  const changePercent = Number(content.changePercent ?? 0)
  const peakInterest = content.peakInterest as { date: string; value: number } | undefined
  const timelineData = Array.isArray(content.timelineData)
    ? content.timelineData as Array<{ date: string; value: number }>
    : []
  const url = String(content.url ?? 'https://trends.google.com')

  const trendLabel: Record<string, string> = {
    rising: '▲ Rising',
    declining: '▼ Declining',
    stable: '→ Stable',
    peaking: '▲ Peaking',
  }
  const trendColor: Record<string, string> = {
    rising: '#16a34a',
    declining: '#dc2626',
    stable: 'var(--text-secondary)',
    peaking: 'var(--accent, #BA7517)',
  }

  const sparkline = timelineData.length > 2 ? buildSparkline(timelineData) : null

  return (
    <div ref={ref} className="rounded-xl px-4 py-3" style={cardStyle}>
      <div className="flex items-center gap-2 mb-2">
        <SourceBadge label="Google Trends" />
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Last 12 months
        </span>
      </div>

      <p
        className="text-sm font-semibold mb-2 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        &ldquo;{query}&rdquo;
      </p>

      {sparkline && (
        <div className="mb-2" style={{ height: 36 }}>
          <svg viewBox={sparkline.viewBox} className="w-full h-full" preserveAspectRatio="none">
            <path
              d={sparkline.path}
              fill="none"
              stroke="var(--accent, #BA7517)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={sparkline.areaPath}
              fill="var(--accent, #BA7517)"
              opacity="0.1"
            />
          </svg>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: trendColor[trend] }}>
          {trendLabel[trend] ?? '→ Stable'}
          {changePercent !== 0 && (
            <span className="font-normal ml-1">
              ({changePercent > 0 ? '+' : ''}{changePercent}%)
            </span>
          )}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {currentInterest}/100
          {peakInterest && ` · Peak ${peakInterest.value}`}
        </span>
      </div>

      <ExternalLink href={url}>trends.google.com</ExternalLink>
    </div>
  )
})
GoogleTrendsCard.displayName = 'GoogleTrendsCard'

// ── SVG Sparkline Helper ─────────────────────────────────────────────────────

function buildSparkline(data: Array<{ value: number }>): {
  viewBox: string
  path: string
  areaPath: string
} {
  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const width = values.length - 1
  const height = 100

  const points = values.map((v, i) => ({
    x: (i / width) * width,
    y: height - (v / max) * height,
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${path} L${width},${height} L0,${height} Z`

  return {
    viewBox: `0 0 ${width} ${height}`,
    path,
    areaPath,
  }
}
