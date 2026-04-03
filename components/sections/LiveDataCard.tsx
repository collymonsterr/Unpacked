'use client'

import { useRef, useState, useEffect } from 'react'
import { forwardRef } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts'

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

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
    padding: '16px 20px',
  }

  switch (section.data_source) {
    case 'polymarket': {
      const outcomes = Array.isArray(section.content.outcomes) ? section.content.outcomes.map(String) : []
      const isBinary = outcomes.length === 2
      return isBinary
        ? <PolymarketBinaryCard content={section.content} cardStyle={cardStyle} ref={ref} />
        : <PolymarketMultiCard content={section.content} cardStyle={cardStyle} ref={ref} />
    }
    case 'yahoo_finance': {
      // Detect grouped format: content has nested objects instead of flat fields
      const isGrouped = !section.content.symbol && !section.content.price &&
        Object.values(section.content).some(v => typeof v === 'object' && v !== null && 'price' in (v as Record<string, unknown>))
      if (isGrouped) {
        const items = Object.values(section.content).filter(
          (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && 'price' in v
        )
        return (
          <div ref={ref}>
            <YahooFinanceGrid items={items} cardStyle={cardStyle} />
          </div>
        )
      }
      return <YahooFinanceGrid items={[section.content]} cardStyle={cardStyle} ref={ref} />
    }
    case 'google_trends':
      return <GoogleTrendsCard content={section.content} cardStyle={cardStyle} ref={ref} />
    default:
      return null
  }
}

// ── Shared Components ───────────────────────────────────────────────────────

function SourcePill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: color,
        color: '#fff',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  )
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] mt-3 pt-2"
      style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}
    >
      {children}
    </div>
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

const formatVolume = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

// ── Bar colours for multi-outcome ───────────────────────────────────────────

const OUTCOME_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#9CA3AF', '#9CA3AF', '#9CA3AF']

// ══════════════════════════════════════════════════════════════════════════════
// Component 1: Polymarket Multi-Outcome
// ══════════════════════════════════════════════════════════════════════════════

const PolymarketMultiCard = forwardRef<HTMLDivElement, {
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

  // Sort by probability descending for display
  const indexed = outcomes.map((o, i) => ({ outcome: o, prob: probabilities[i] ?? 0, idx: i }))
  indexed.sort((a, b) => b.prob - a.prob)

  return (
    <div ref={ref} style={cardStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <SourcePill label="Polymarket" color="#4A2E8A" />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {formatVolume(volume)} volume
        </span>
      </div>

      {/* Question title */}
      <p
        className="text-base font-bold mb-4 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {question}
      </p>

      {/* Outcome bars */}
      <div className="space-y-2.5 mb-3">
        {indexed.map(({ outcome, prob, idx }) => {
          const pct = Math.round(prob * 100)
          const colorIdx = Math.min(idx, OUTCOME_COLORS.length - 1)
          const barColor = OUTCOME_COLORS[colorIdx]
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--text-primary)', maxWidth: '200px' }}
                >
                  {outcome}
                </span>
                <span
                  className="text-xs font-bold ml-2 flex-shrink-0"
                  style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                >
                  {pct}%
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <CardFooter>
        <ExternalLink href={url}>polymarket.com</ExternalLink>
      </CardFooter>
    </div>
  )
})
PolymarketMultiCard.displayName = 'PolymarketMultiCard'


// ══════════════════════════════════════════════════════════════════════════════
// Component 2: Polymarket Binary with Trend Chart
// ══════════════════════════════════════════════════════════════════════════════

const PolymarketBinaryCard = forwardRef<HTMLDivElement, {
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

  const yesProb = Math.round((probabilities[0] ?? 0) * 100)
  const noProb = Math.round((probabilities[1] ?? 0) * 100)
  const yesLabel = outcomes[0] ?? 'Yes'
  const noLabel = outcomes[1] ?? 'No'
  const isDominantYes = yesProb >= noProb

  // NOTE: Polymarket API does not provide historical odds time series.
  // The binary card renders without a trend chart. When historical data
  // becomes available (e.g. via a snapshot service), add chart here.
  const hasHistoricalData = false

  return (
    <div ref={ref} style={cardStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <SourcePill label="Polymarket" color="#4A2E8A" />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {formatVolume(volume)} volume
        </span>
      </div>

      {/* Question title */}
      <p
        className="text-base font-bold mb-4 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {question}
      </p>

      {/* Main probability display */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span
            className="text-4xl font-extrabold"
            style={{
              fontFamily: 'var(--font-sora)',
              color: isDominantYes ? '#22C55E' : '#EF4444',
            }}
          >
            {isDominantYes ? yesProb : noProb}%
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            probability of {isDominantYes ? yesLabel.toLowerCase() : noLabel.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Placeholder for trend chart when historical data becomes available */}
      {hasHistoricalData && (
        <div className="mb-4" style={{ height: 120 }}>
          {/* TODO: Recharts AreaChart with historical probability data */}
        </div>
      )}

      {/* Two-column split: Yes / No */}
      <div
        className="grid grid-cols-2 gap-3 mb-3 pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {yesLabel}
          </span>
          <p
            className="text-xl font-extrabold mt-0.5"
            style={{ fontFamily: 'var(--font-sora)', color: '#22C55E' }}
          >
            {yesProb}%
          </p>
        </div>
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {noLabel}
          </span>
          <p
            className="text-xl font-extrabold mt-0.5"
            style={{ fontFamily: 'var(--font-sora)', color: '#EF4444' }}
          >
            {noProb}%
          </p>
        </div>
      </div>

      {/* Combined bar */}
      <div
        className="h-2.5 rounded-full overflow-hidden flex mb-3"
        style={{ backgroundColor: 'var(--border)' }}
      >
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{ width: `${yesProb}%`, backgroundColor: '#22C55E' }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{ width: `${noProb}%`, backgroundColor: '#EF4444', opacity: 0.6 }}
        />
      </div>

      <CardFooter>
        <div className="flex items-center justify-between">
          <span>{formatVolume(volume)} total volume</span>
          <ExternalLink href={url}>polymarket.com</ExternalLink>
        </div>
      </CardFooter>
    </div>
  )
})
PolymarketBinaryCard.displayName = 'PolymarketBinaryCard'


// ══════════════════════════════════════════════════════════════════════════════
// Component 3: Google Trends
// ══════════════════════════════════════════════════════════════════════════════

const GoogleTrendsCard = forwardRef<HTMLDivElement, {
  content: Record<string, unknown>
  cardStyle: React.CSSProperties
}>(({ content, cardStyle }, ref) => {
  const query = String(content.query ?? '')
  const trend = String(content.trend ?? 'stable') as 'rising' | 'declining' | 'stable' | 'peaking'
  const currentInterest = Number(content.currentInterest ?? 0)
  const changePercent = Number(content.changePercent ?? 0)
  const timelineData = Array.isArray(content.timelineData)
    ? content.timelineData as Array<{ date: string; value: number }>
    : []
  const url = String(content.url ?? 'https://trends.google.com')

  // Build chart data for Recharts
  const chartData = timelineData.map((d, i) => ({
    index: i,
    value: d.value,
    date: d.date,
  }))

  const changeArrow = changePercent > 10 ? '↑' : changePercent < -10 ? '↓' : '~'
  const changeColor = changePercent > 10 ? '#16a34a' : changePercent < -10 ? '#dc2626' : 'var(--text-secondary)'

  return (
    <div ref={ref} style={cardStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <SourcePill label="Google Trends" color="#4285F4" />
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Updated daily
        </span>
      </div>

      {/* Title */}
      <p
        className="text-base font-bold mb-3 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Search interest: &ldquo;{query}&rdquo;
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3">
        <div>
          <span className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            {currentInterest}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>/100</span>
        </div>
        <div>
          <span className="text-sm font-bold" style={{ color: changeColor }}>
            {changeArrow} {changePercent > 0 ? '+' : ''}{changePercent}%
          </span>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>vs prior 3 months</p>
        </div>
      </div>

      {/* Area chart */}
      {chartData.length >= 3 && (
        <div className="mb-3" style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trendsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[0, 100]} hide />
              <XAxis dataKey="index" hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <span className="font-semibold">{d.value}/100</span>
                      {d.date && <span className="ml-1" style={{ color: 'var(--text-secondary)' }}>{d.date}</span>}
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#trendsFill)"
                dot={false}
                activeDot={{ r: 3, fill: '#F59E0B' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <CardFooter>
        <div className="flex items-center justify-between">
          <span>100 = peak search interest in period</span>
          <ExternalLink href={url}>trends.google.com</ExternalLink>
        </div>
      </CardFooter>
    </div>
  )
})
GoogleTrendsCard.displayName = 'GoogleTrendsCard'


// ══════════════════════════════════════════════════════════════════════════════
// Component 4: Yahoo Finance Grid
// ══════════════════════════════════════════════════════════════════════════════

const YahooFinanceGrid = forwardRef<HTMLDivElement, {
  items: Record<string, unknown>[]
  cardStyle: React.CSSProperties
}>(({ items, cardStyle }, ref) => {
  const validItems = items.filter(item => Number(item.price ?? 0) > 0)
  if (validItems.length === 0) return null

  return (
    <div ref={ref} style={cardStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <SourcePill label="Yahoo Finance" color="#6001D2" />
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          15 min delay
        </span>
      </div>

      {/* Grid of ticker cards */}
      <div className={`grid gap-3 ${validItems.length >= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {validItems.map((item, i) => (
          <TickerCard key={i} content={item} />
        ))}
      </div>

      <CardFooter>
        <ExternalLink href="https://finance.yahoo.com">finance.yahoo.com</ExternalLink>
      </CardFooter>
    </div>
  )
})
YahooFinanceGrid.displayName = 'YahooFinanceGrid'


// ── Individual Ticker Card (inside Yahoo Finance Grid) ──────────────────────

function TickerCard({ content }: { content: Record<string, unknown> }) {
  const symbol = String(content.symbol ?? '')
  const name = String(content.name ?? '')
  const price = Number(content.price ?? 0)
  const change = Number(content.change ?? 0)
  const changePercent = Number(content.changePercent ?? 0)
  const currency = String(content.currency ?? 'USD')
  const url = String(content.url ?? 'https://finance.yahoo.com')
  const sparkline = Array.isArray(content.sparkline)
    ? content.sparkline.filter((v): v is number => typeof v === 'number' && v > 0)
    : []

  const isPositive = change >= 0
  const changeColor = isPositive ? '#16a34a' : '#dc2626'
  const changeBg = isPositive ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)'

  const formatPrice = (p: number, curr: string): string => {
    const prefix = curr === 'USD' ? '$' : curr === 'GBP' ? '£' : curr === 'EUR' ? '€' : ''
    const suffix = !prefix ? ` ${curr}` : ''
    return `${prefix}${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`
  }

  // Build mini sparkline SVG path
  const sparklineSvg = sparkline.length >= 3 ? buildSparklinePath(sparkline, 100, 32) : null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg p-3 transition-colors"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Symbol & name */}
      <div className="mb-1.5">
        <span
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: 'var(--text-secondary)' }}
        >
          {symbol}
        </span>
        <p
          className="text-xs truncate"
          style={{ color: 'var(--text-secondary)', maxWidth: '160px' }}
        >
          {name}
        </p>
      </div>

      {/* Price */}
      <p
        className="text-lg font-extrabold mb-1"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {formatPrice(price, currency)}
      </p>

      {/* Change badge */}
      <div
        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md mb-2"
        style={{ backgroundColor: changeBg, color: changeColor }}
      >
        <span>{change >= 0 ? '+' : ''}{formatPrice(Math.abs(change), currency)}</span>
        <span>({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
      </div>

      {/* Sparkline */}
      {sparklineSvg && (
        <div style={{ height: 32 }}>
          <svg
            viewBox={`0 0 100 32`}
            className="w-full"
            style={{ height: 32 }}
            preserveAspectRatio="none"
          >
            <path
              d={sparklineSvg}
              fill="none"
              stroke={isPositive ? '#16a34a' : '#dc2626'}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </a>
  )
}

/**
 * Build a simple SVG path string for a sparkline.
 */
function buildSparklinePath(values: number[], width: number, height: number): string {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((v - min) / range) * (height * 0.85) - height * 0.075
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
