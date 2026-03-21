'use client'

import { useEffect, useState, useMemo } from 'react'
import type { ArticlePlan, ArticleType } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'
import GeneratingTips from './GeneratingTips'

interface Props {
  plan: ArticlePlan
}

// Contextual messages based on article type
function getStatusMessages(articleType: ArticleType, researchQueries: string[]): string[] {
  const base = researchQueries.map((q) => `Researching: "${q}"`)

  const typeMessages: Record<string, string[]> = {
    buyer_guide: [
      'Comparing prices across major retailers...',
      'Reading verified buyer reviews...',
      'Checking for common complaints and dealbreakers...',
      'Cross-referencing specs with real-world performance...',
      'Looking for hidden gems reviewers missed...',
      'Analysing value-for-money across price points...',
      'Checking warranty and return policies...',
      'Building comparison charts...',
    ],
    comparison: [
      'Running side-by-side spec analysis...',
      'Reading head-to-head reviews from experts...',
      'Checking benchmark scores and real-world tests...',
      'Comparing what actual owners say on Reddit...',
      'Finding where each product wins and loses...',
      'Building the comparison matrix...',
    ],
    decision_guide: [
      'Mapping out the key decision factors...',
      'Gathering price and availability data...',
      'Checking what enthusiasts recommend...',
      'Weighing the trade-offs between options...',
      'Identifying the best choice for each use case...',
    ],
    explainer: [
      'Gathering the latest research and data...',
      'Finding the clearest way to explain this...',
      'Building data visualisations...',
      'Checking facts against primary sources...',
      'Creating worked examples...',
      'Making complex concepts simple...',
    ],
    planning: [
      'Checking the latest reviews and ratings...',
      'Looking up practical tips from locals...',
      'Mapping out the best options...',
      'Cross-referencing recommendations...',
      'Finding insider tips most guides miss...',
    ],
    trend_analysis: [
      'Pulling the latest market data...',
      'Analysing trends over time...',
      'Building data visualisations...',
      'Checking multiple data sources for accuracy...',
      'Identifying the key takeaways...',
    ],
    tutorial: [
      'Finding the most effective approach...',
      'Checking for common mistakes to avoid...',
      'Building step-by-step instructions...',
      'Gathering tips from practitioners...',
    ],
    news: [
      'Checking multiple sources for accuracy...',
      'Finding expert analysis and commentary...',
      'Building a timeline of events...',
      'Separating facts from speculation...',
    ],
  }

  const extra = typeMessages[articleType] ?? typeMessages.buyer_guide!

  // Interleave research queries with type-specific messages
  const merged: string[] = []
  let qi = 0
  let ei = 0
  for (let i = 0; i < base.length + extra.length; i++) {
    if (i % 2 === 0 && qi < base.length) {
      merged.push(base[qi++])
    } else if (ei < extra.length) {
      merged.push(extra[ei++])
    } else if (qi < base.length) {
      merged.push(base[qi++])
    }
  }

  // Always end with these
  merged.push('Forming an editorial opinion...')
  merged.push('Writing the final article — almost done...')

  return merged
}

export default function ArticleSkeleton({ plan }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  const messages = useMemo(
    () => getStatusMessages(plan.article_type, plan.research_queries),
    [plan.article_type, plan.research_queries]
  )

  // Cycle through status messages — 5s per message, loops back from start
  useEffect(() => {
    const cycle = () => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length)
        setVisible(true)
      }, 300)
    }

    const interval = setInterval(cycle, 5000)
    return () => clearInterval(interval)
  }, [messages.length])

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    : `${seconds}s`

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      {/* Badge */}
      <div className="mb-4">
        <ArticleTypeBadge type={plan.article_type} />
      </div>

      {/* Title */}
      <h1
        className="text-3xl md:text-4xl font-extrabold leading-tight mb-6"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {plan.title}
      </h1>

      {/* Live status panel */}
      <div
        className="rounded-xl px-5 py-4 mb-8"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <PulsingDot />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent)' }}
            >
              Generating article
            </span>
          </div>
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: 'var(--accent)', opacity: 0.7 }}
          >
            {timeStr}
          </span>
        </div>

        {/* Progress bar — time-based, designed for 2-3 minute generation */}
        <div
          className="h-1 rounded-full mb-3 overflow-hidden"
          style={{ backgroundColor: 'rgba(224, 122, 58, 0.15)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-[2000ms] ease-out"
            style={{
              backgroundColor: 'var(--accent)',
              // Logarithmic curve: fast start, slows dramatically
              // 30s → ~35%, 60s → ~55%, 90s → ~67%, 120s → ~75%, 180s → ~85%, never exceeds 92%
              width: `${Math.min(92, 20 * Math.log(1 + elapsed / 15))}%`,
            }}
          />
        </div>

        {/* Current status message */}
        <p
          className="text-sm font-medium transition-all duration-300"
          style={{
            color: 'var(--accent)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(4px)',
          }}
        >
          {messages[msgIndex]}
        </p>
      </div>

      {/* Quick verdict skeleton */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
      >
        <div className="skeleton h-4 w-16 mb-3 rounded-full" />
        <div className="skeleton h-6 w-3/4 mb-2" />
        <div className="skeleton h-4 w-1/2" />
      </div>

      {/* Section skeletons */}
      <div className="space-y-6">
        {plan.sections_outline.map((heading, i) => (
          <div key={i}>
            <h2
              className="text-lg font-bold mb-3"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-secondary)' }}
            >
              {heading}
            </h2>
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              {i % 3 === 0 && <div className="skeleton h-4 w-2/3" />}
            </div>
          </div>
        ))}
      </div>

      {/* Rotating tips while waiting */}
      <GeneratingTips />
    </div>
  )
}

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: 'var(--accent)' }}
      />
    </span>
  )
}
