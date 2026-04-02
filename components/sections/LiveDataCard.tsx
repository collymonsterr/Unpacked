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
    case 'yahoo_finance': {
      // Detect grouped format: content has nested objects instead of flat fields
      const isGrouped = !section.content.symbol && !section.content.price &&
        Object.values(section.content).some(v => typeof v === 'object' && v !== null && 'price' in (v as Record<string, unknown>))
      if (isGrouped) {
        const items = Object.values(section.content).filter(
          (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && 'price' in v
        )
        return (
          <div ref={ref} className="flex flex-col gap-3">
            {items.map((item, i) => (
              <YahooFinanceCard key={i} content={item} cardStyle={cardStyle} />
            ))}
          </div>
        )
      }
      return <YahooFinanceCard content={section.content} cardStyle={cardStyle} ref={ref} />
    }
    case 'google_trends':
      return <GoogleTrendsCard content={section.content} cardStyle={cardStyle} ref={ref} />
    default:
      return null
  }
}

// ── Shared Components ───────────────────────────────────────────────────────

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

// ── Chart with Gridlines ────────────────────────────────────────────────────

/**
 * Shared SVG chart component with horizontal gridlines and Y-axis labels.
 * Used by both Yahoo Finance and Google Trends cards.
 */
function ChartWithGrid({
  values,
  labels,
  color,
  height = 80,
  yMin: forcedMin,
  yMax: forcedMax,
  formatLabel,
}: {
  values: number[]
  /** Y-axis tick labels (bottom to top). If not provided, auto-generates min/mid/max. */
  labels?: string[]
  color: string
  height?: number
  yMin?: number
  yMax?: number
  formatLabel?: (v: number) => string
}) {
  if (values.length < 2) return null

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)

  // Use forced bounds or auto with 5% padding
  const range = dataMax - dataMin || 1
  const yMin = forcedMin ?? dataMin - range * 0.05
  const yMax = forcedMax ?? dataMax + range * 0.05
  const yRange = yMax - yMin || 1

  const chartWidth = 300
  const chartHeight = height
  const labelWidth = 44 // space for Y-axis labels
  const totalWidth = chartWidth + labelWidth

  // Generate gridlines (3 lines: bottom, middle, top)
  const gridValues = [yMin, yMin + yRange / 2, yMax]
  const defaultFormat = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    if (v >= 100) return v.toFixed(0)
    if (v >= 1) return v.toFixed(1)
    return v.toFixed(2)
  }
  const fmt = formatLabel ?? defaultFormat
  const gridLabels = labels ?? gridValues.map(fmt)

  // Build path
  const points = values.map((v, i) => ({
    x: labelWidth + (i / (values.length - 1)) * chartWidth,
    y: chartHeight - ((v - yMin) / yRange) * chartHeight,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${chartHeight} L${labelWidth},${chartHeight} Z`

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${chartHeight}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      {/* Horizontal gridlines */}
      {gridValues.map((gv, i) => {
        const y = chartHeight - ((gv - yMin) / yRange) * chartHeight
        return (
          <g key={i}>
            <line
              x1={labelWidth}
              y1={y}
              x2={totalWidth}
              y2={y}
              stroke="var(--border, #e5e5e5)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={labelWidth - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-secondary, #999)"
              fontSize="9"
              fontFamily="var(--font-sora), system-ui, sans-serif"
            >
              {gridLabels[i]}
            </text>
          </g>
        )
      })}
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity="0.08" />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={color}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {formatVolume(volume)} traded
        </span>
      </div>

      <p
        className="text-sm font-semibold mb-3 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {question}
      </p>

      {isBinary ? (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold" style={{ color: 'var(--accent, #BA7517)' }}>
              <span style={{ fontFamily: 'var(--font-sora)' }}>{Math.round((probabilities[0] ?? 0) * 100)}%</span>
              <span className="font-medium ml-1" style={{ color: 'var(--text-secondary)' }}>{outcomes[0]}</span>
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium mr-1">{outcomes[1]}</span>
              <span style={{ fontFamily: 'var(--font-sora)' }}>{Math.round((probabilities[1] ?? 0) * 100)}%</span>
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden flex"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <div
              className="h-full rounded-l-full transition-all duration-700"
              style={{
                width: `${Math.round((probabilities[0] ?? 0) * 100)}%`,
                backgroundColor: 'var(--accent, #BA7517)',
              }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-700"
              style={{
                width: `${Math.round((probabilities[1] ?? 0) * 100)}%`,
                backgroundColor: 'var(--text-secondary, #999)',
                opacity: 0.4,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 mb-3">
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
                    style={{ fontFamily: 'var(--font-sora)', color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
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

      <ExternalLink href={url}>polymarket.com</ExternalLink>
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
  const sparkline = Array.isArray(content.sparkline)
    ? content.sparkline.filter((v): v is number => typeof v === 'number' && v > 0)
    : []

  const isPositive = change >= 0
  const changeColor = isPositive ? '#16a34a' : '#dc2626'
  const arrow = isPositive ? '▲' : '▼'

  const formatPrice = (p: number, curr: string): string => {
    if (curr === 'USD') return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (curr === 'GBP') return `£${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (curr === 'EUR') return `€${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`
  }

  const formatYLabel = (v: number): string => {
    const prefix = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : ''
    if (v >= 1000) return `${prefix}${(v / 1000).toFixed(1)}k`
    if (v >= 100) return `${prefix}${v.toFixed(0)}`
    return `${prefix}${v.toFixed(2)}`
  }

  return (
    <div ref={ref} className="rounded-xl px-4 py-3" style={cardStyle}>
      <div className="flex items-center gap-2 mb-1.5">
        <SourceBadge label="Yahoo Finance" />
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          1 month
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-0.5">
        <span
          className="text-xs font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
        >
          {symbol}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {name}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span
          className="text-lg font-extrabold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {formatPrice(price, currency)}
        </span>
        <span className="text-xs font-bold" style={{ color: changeColor }}>
          {arrow} {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          <span className="text-[10px] font-normal ml-0.5">
            ({change >= 0 ? '+' : ''}{formatPrice(Math.abs(change), currency)})
          </span>
        </span>
      </div>

      {sparkline.length >= 3 ? (
        <div className="mb-2">
          <ChartWithGrid
            values={sparkline}
            color={isPositive ? '#16a34a' : '#dc2626'}
            height={120}
            formatLabel={formatYLabel}
          />
        </div>
      ) : (
        <div className="mb-2" />
      )}

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

  const values = timelineData.map(d => d.value)

  return (
    <div ref={ref} className="rounded-xl px-4 py-3" style={cardStyle}>
      <div className="flex items-center gap-2 mb-1.5">
        <SourceBadge label="Google Trends" />
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Last 12 months
        </span>
      </div>

      <p
        className="text-sm font-semibold mb-1 leading-snug"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        &ldquo;{query}&rdquo;
      </p>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold" style={{ color: trendColor[trend] }}>
          {trendLabel[trend] ?? '→ Stable'}
          {changePercent !== 0 && (
            <span className="font-normal ml-1">
              ({changePercent > 0 ? '+' : ''}{changePercent}%)
            </span>
          )}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Current: {currentInterest}/100
        </span>
      </div>

      {values.length >= 3 ? (
        <div className="mb-2">
          <ChartWithGrid
            values={values}
            color="var(--accent, #BA7517)"
            height={80}
            yMin={0}
            yMax={100}
            labels={['0', '50', '100']}
          />
        </div>
      ) : (
        <div className="mb-2" />
      )}

      <ExternalLink href={url}>trends.google.com</ExternalLink>
    </div>
  )
})
GoogleTrendsCard.displayName = 'GoogleTrendsCard'
