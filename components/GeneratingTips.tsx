'use client'

import { useState, useEffect } from 'react'

const TIPS = [
  {
    icon: '📰',
    text: 'Each article is researched from scratch — no templates, no recycled content.',
  },
  {
    icon: '🔍',
    text: 'We cross-reference multiple sources to find details most articles miss.',
  },
  {
    icon: '💬',
    text: 'Real opinions from Reddit, forums, and verified buyers shape our verdicts.',
  },
  {
    icon: '📊',
    text: 'Charts and comparison tables are generated from live data, not stock graphics.',
  },
  {
    icon: '🧠',
    text: 'Every article includes an editorial opinion — not just a list of specs.',
  },
  {
    icon: '⚖️',
    text: 'We weigh up the trade-offs so you don\'t have to open 15 browser tabs.',
  },
  {
    icon: '🎯',
    text: 'Articles are tailored to your exact query — budget, use case, and all.',
  },
  {
    icon: '✨',
    text: 'Product images are sourced from official retailers for accuracy.',
  },
  {
    icon: '📋',
    text: 'Structured sections make it easy to skip to what matters most to you.',
  },
  {
    icon: '🏆',
    text: 'Our verdicts highlight the best pick, the value pick, and the one to avoid.',
  },
]

export default function GeneratingTips() {
  const [tipIndex, setTipIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % TIPS.length)
        setVisible(true)
      }, 400)
    }, 4500)

    return () => clearInterval(interval)
  }, [])

  const tip = TIPS[tipIndex]

  return (
    <div
      className="rounded-xl px-5 py-4 mt-6"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
      >
        Did you know?
      </p>
      <p
        className="text-sm font-medium transition-all duration-400"
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-outfit)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          minHeight: '2.5em',
        }}
      >
        <span className="mr-2">{tip.icon}</span>
        {tip.text}
      </p>
    </div>
  )
}
