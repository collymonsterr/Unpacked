'use client'

import { useState, useCallback } from 'react'
import type { DecisionToolData } from '@/types/article'

interface Props {
  data: DecisionToolData
}

export default function DecisionTool({ data }: Props) {
  const [currentQuestionId, setCurrentQuestionId] = useState(data.questions?.[0]?.id ?? '')
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [recommendationId, setRecommendationId] = useState<string | null>(null)

  // Guard: bail out if data is structurally invalid
  if (!data.questions?.length || !data.recommendations?.length) {
    return null
  }

  const currentQuestion = data.questions.find(q => q.id === currentQuestionId)
  const recommendation = recommendationId
    ? data.recommendations.find(r => r.id === recommendationId)
    : null

  const progress = recommendation
    ? 100
    : (selectedPath.length / data.questions.length) * 100

  const handleSelect = useCallback((option: { label: string; next: string | null; recommendation_id?: string }) => {
    setSelectedPath(prev => [...prev, option.label])
    if (option.next === null || option.recommendation_id) {
      setRecommendationId(option.recommendation_id ?? data.recommendations[0]?.id ?? null)
    } else {
      // Verify the target question exists — if not, fall back to first recommendation
      const nextExists = data.questions.some(q => q.id === option.next)
      if (nextExists) {
        setCurrentQuestionId(option.next!)
      } else {
        setRecommendationId(data.recommendations[0]?.id ?? null)
      }
    }
  }, [data.recommendations, data.questions])

  const handleRestart = useCallback(() => {
    setCurrentQuestionId(data.questions[0]?.id ?? '')
    setSelectedPath([])
    setRecommendationId(null)
  }, [data.questions])

  return (
    <div>
      {/* Progress bar */}
      <div
        className="mb-5 rounded-full overflow-hidden"
        style={{ height: 4, backgroundColor: '#E8E2D9' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: '#BA7517',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Question flow — if currentQuestion is null (orphaned ID), show fallback */}
      {!recommendation && !currentQuestion && (
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: '#6B6259' }}>
            {data.recommendations[0]?.name
              ? `Based on the article's analysis, we recommend: ${data.recommendations[0].name}`
              : 'See the article above for our recommendation.'}
          </p>
          {selectedPath.length > 0 && (
            <button
              onClick={handleRestart}
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{ color: '#BA7517', border: '1px solid #E8E2D9', cursor: 'pointer', backgroundColor: 'transparent' }}
            >
              Start over
            </button>
          )}
        </div>
      )}

      {!recommendation && currentQuestion && (
        <div>
          <p
            className="text-xs font-medium mb-2"
            style={{ color: '#6B6259' }}
          >
            Question {selectedPath.length + 1} of {data.questions.length}
          </p>
          <h4
            className="text-lg font-bold mb-4"
            style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}
          >
            {currentQuestion.text}
          </h4>
          <div className="space-y-2">
            {currentQuestion.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelect(option)}
                className="w-full text-left rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E2D9',
                  color: '#1A1714',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#BA7517'
                  e.currentTarget.style.backgroundColor = '#FDF6E9'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E8E2D9'
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation result */}
      {recommendation && (
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center mb-3"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: '#FDF6E9',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: '#BA7517' }}
          >
            Our pick for you
          </p>
          <h4
            className="text-xl font-bold mb-3"
            style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}
          >
            {recommendation.name}
          </h4>
          <p
            className="text-sm leading-relaxed mb-5 mx-auto"
            style={{ color: '#6B6259', maxWidth: 480 }}
          >
            {recommendation.reason}
          </p>

          {/* Path summary */}
          <div
            className="rounded-xl px-4 py-3 mb-4 mx-auto"
            style={{ backgroundColor: '#F5F4F2', maxWidth: 400 }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: '#6B6259' }}>
              Based on your answers:
            </p>
            <p className="text-xs" style={{ color: '#94918D' }}>
              {selectedPath.join(' \u2192 ')}
            </p>
          </div>

          <button
            onClick={handleRestart}
            className="text-xs font-semibold px-4 py-2 rounded-full transition-colors duration-150"
            style={{
              color: '#BA7517',
              border: '1px solid #E8E2D9',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            Start over
          </button>
        </div>
      )}
    </div>
  )
}
