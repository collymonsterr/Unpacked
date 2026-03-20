'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { StatCardsSection } from '@/types/article'

function AnimatedValue({ value, visible }: { value: string; visible: boolean }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (!visible) return

    // Try to extract a number to animate
    const match = value.match(/^([^0-9]*)([0-9,.]+)(.*)$/)
    if (!match) {
      setDisplay(value)
      return
    }

    const prefix = match[1]
    const numStr = match[2]
    const suffix = match[3]
    const target = parseFloat(numStr.replace(/,/g, ''))

    if (isNaN(target)) {
      setDisplay(value)
      return
    }

    const hasCommas = numStr.includes(',')
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0
    const duration = 1000
    const steps = 40
    const stepTime = duration / steps

    let step = 0
    const interval = setInterval(() => {
      step++
      const progress = step / steps
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = target * eased

      let formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString()
      if (hasCommas) {
        const parts = formatted.split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        formatted = parts.join('.')
      }

      setDisplay(`${prefix}${formatted}${suffix}`)

      if (step >= steps) {
        clearInterval(interval)
        setDisplay(value) // Ensure exact final value
      }
    }, stepTime)

    return () => clearInterval(interval)
  }, [value, visible])

  return <>{display}</>
}

export default function StatCards({ section }: { section: StatCardsSection }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const trendArrow = useCallback((trend?: 'up' | 'down' | null) => {
    if (trend === 'up') return <span style={{ color: '#22c55e', marginLeft: 4 }}>&#9650;</span>
    if (trend === 'down') return <span style={{ color: '#ef4444', marginLeft: 4 }}>&#9660;</span>
    return null
  }, [])

  return (
    <div ref={ref} className="mb-8">
      <h3
        className="text-lg font-bold mb-3"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {section.cards.map((card, i) => (
          <div
            key={i}
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.4s ease ${i * 100}ms, transform 0.4s ease ${i * 100}ms`,
            }}
          >
            <p
              className="text-2xl md:text-3xl font-extrabold mb-1"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
            >
              <AnimatedValue value={card.value} visible={visible} />
              {trendArrow(card.trend)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {section.source && (
        <p className="text-xs mt-3 italic" style={{ color: 'var(--text-secondary)' }}>
          {section.source}
        </p>
      )}
    </div>
  )
}
