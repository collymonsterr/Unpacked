'use client'

import { useEffect, useState } from 'react'
import type { ArticlePlan } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'

interface Props {
  plan: ArticlePlan
}

export default function ArticleSkeleton({ plan }: Props) {
  const [queryIndex, setQueryIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const queries = plan.research_queries
    if (queries.length === 0) return

    const cycle = () => {
      setVisible(false)
      setTimeout(() => {
        setQueryIndex((i) => (i + 1) % queries.length)
        setVisible(true)
      }, 400)
    }

    const interval = setInterval(cycle, 3500)
    return () => clearInterval(interval)
  }, [plan.research_queries])

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

      {/* Research status */}
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-4 mb-8"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
      >
        <LoadingDots />
        <p
          className="text-sm font-medium transition-opacity duration-300"
          style={{
            color: 'var(--accent)',
            opacity: visible ? 1 : 0,
          }}
        >
          {plan.research_queries[queryIndex] ?? 'Researching…'}
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
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1 shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: 'var(--accent)',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
