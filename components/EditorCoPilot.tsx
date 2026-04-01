'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  EntityCard,
  ResearchSynthesis,
  ArticleBlueprint,
  BlueprintSection,
} from '@/types/article'
import FindingCard from '@/components/editor/FindingCard'
import RewriteControls from '@/components/editor/RewriteControls'

interface Finding {
  id: string
  source: string
  source_type: 'web' | 'reddit' | 'twitter'
  url: string
  content: string
  used_in_article: boolean
}

interface ResearchData {
  research_findings: Finding[]
  entity_cards: EntityCard[]
  synthesis: ResearchSynthesis | null
  blueprint: ArticleBlueprint | null
  live_data: Record<string, unknown>[]
  alternative_types: string[]
  article_type: string | null
}

interface EditorCoPilotProps {
  articleId: string
  articleSlug: string
  articleType: string
}

export default function EditorCoPilot({ articleId, articleSlug, articleType }: EditorCoPilotProps) {
  const [data, setData] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Co-pilot state
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set())
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set())
  const [instructions, setInstructions] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [rewriteResult, setRewriteResult] = useState<{ success: boolean; newSlug?: string; error?: string } | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)

  // Collapsible sections
  const [usedExpanded, setUsedExpanded] = useState(false)
  const [availableExpanded, setAvailableExpanded] = useState(true)

  // Fetch research data on mount
  useEffect(() => {
    async function fetchResearch() {
      try {
        const res = await fetch(`/api/articles/${articleId}/research`)
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError('You don\'t have permission to view this data.')
          } else {
            setError('Failed to load research data.')
          }
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Failed to load research data.')
      } finally {
        setLoading(false)
      }
    }
    fetchResearch()
  }, [articleId])

  const toggleAdd = useCallback((findingId: string) => {
    setSelectedToAdd(prev => {
      const next = new Set(prev)
      if (next.has(findingId)) next.delete(findingId)
      else next.add(findingId)
      return next
    })
    setRewriteResult(null)
  }, [])

  const toggleRemove = useCallback((findingId: string) => {
    setSelectedToRemove(prev => {
      const next = new Set(prev)
      if (next.has(findingId)) next.delete(findingId)
      else next.add(findingId)
      return next
    })
    setRewriteResult(null)
  }, [])

  const handleRewrite = useCallback(async () => {
    setIsRewriting(true)
    setRewriteResult(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: instructions || undefined,
          add_findings: Array.from(selectedToAdd),
          remove_findings: Array.from(selectedToRemove),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Rewrite failed' }))
        setRewriteResult({ success: false, error: err.error || 'Rewrite failed' })
        return
      }
      const result = await res.json()
      setRewriteResult({ success: true, newSlug: result.newSlug })
    } catch {
      setRewriteResult({ success: false, error: 'Something went wrong. Please try again.' })
    } finally {
      setIsRewriting(false)
    }
  }, [articleId, instructions, selectedToAdd, selectedToRemove])

  const handleSwitchType = useCallback(async (newType: string) => {
    setIsSwitching(true)
    setRewriteResult(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: `Rewrite this article as a ${newType.replace(/_/g, ' ')}`,
          switch_type: newType,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Type switch failed' }))
        setRewriteResult({ success: false, error: err.error || 'Type switch failed' })
        return
      }
      const result = await res.json()
      setRewriteResult({ success: true, newSlug: result.newSlug })
    } catch {
      setRewriteResult({ success: false, error: 'Something went wrong. Please try again.' })
    } finally {
      setIsSwitching(false)
    }
  }, [articleId])

  // ── Loading state ──
  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl h-24 animate-pulse"
              style={{ backgroundColor: '#f0efed' }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    )
  }

  // ── Empty state (old articles without research data) ──
  if (!data || data.research_findings.length === 0) {
    return (
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: '#FEF3EC' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
          Research data isn&apos;t available for this article
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Articles generated after the research pipeline update include full research data for the editor co-pilot.
        </p>
      </div>
    )
  }

  // ── Split findings into used/available ──
  const usedFindings = data.research_findings.filter(f => f.used_in_article)
  // TODO: Sort by actual relevance_score once entity extraction assigns scores to findings.
  // Currently sorting by content length as a proxy — longer findings tend to be higher quality.
  const availableFindings = data.research_findings
    .filter(f => !f.used_in_article)
    .sort((a, b) => b.content.length - a.content.length)

  // Build a map of finding_id → section heading from the blueprint evidence map
  const findingSectionMap: Record<string, string> = {}
  if (data.blueprint?.evidence_map) {
    for (const [sectionId, findingIds] of Object.entries(data.blueprint.evidence_map)) {
      const section = data.blueprint.sections.find((s: BlueprintSection) => s.id === sectionId)
      if (section) {
        for (const fId of findingIds) {
          findingSectionMap[fId] = section.heading
        }
      }
    }
  }

  const { synthesis } = data

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      {/* ── Section A: Research Overview ── */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}
      >
        <h2
          className="text-lg font-bold mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Research Overview
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Total findings */}
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              {data.research_findings.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>sources researched</p>
          </div>
          {/* Used vs available */}
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              {usedFindings.length}
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                {' '}/ {data.research_findings.length}
              </span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>used in article</p>
          </div>
          {/* Entity cards */}
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              {data.entity_cards.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>entities extracted</p>
          </div>
          {/* Available to add */}
          <div>
            <p className="text-2xl font-bold" style={{ color: '#BA7517', fontFamily: 'var(--font-sora)' }}>
              {availableFindings.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>available to add</p>
          </div>
        </div>

        {/* Source quality + thesis */}
        {synthesis && (
          <div className="space-y-2">
            {synthesis.source_quality && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Source quality:</span>{' '}
                {synthesis.source_quality}
              </p>
            )}
            {synthesis.thesis_direction && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Thesis:</span>{' '}
                {synthesis.thesis_direction}
              </p>
            )}
            {data.blueprint?.verdict_statement && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Verdict:</span>{' '}
                {data.blueprint.verdict_statement}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Section B: Research Findings ── */}

      {/* Used findings (collapsed by default) */}
      <div className="mb-4">
        <button
          onClick={() => setUsedExpanded(!usedExpanded)}
          className="flex items-center gap-2 mb-3 w-full text-left"
          style={{ cursor: 'pointer' }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: 'var(--text-secondary)',
              transform: usedExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
          >
            Used in this article ({usedFindings.length})
          </span>
        </button>

        {usedExpanded && (
          <div className="space-y-2 pl-5">
            {usedFindings.map(f => (
              <div key={f.id} className="group">
                <FindingCard
                  finding={f}
                  isUsed
                  isSelectedForAdd={false}
                  isSelectedForRemove={selectedToRemove.has(f.id)}
                  sectionName={findingSectionMap[f.id]}
                  onToggle={() => toggleRemove(f.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available findings (expanded by default) */}
      <div className="mb-4">
        <button
          onClick={() => setAvailableExpanded(!availableExpanded)}
          className="flex items-center gap-2 mb-3 w-full text-left"
          style={{ cursor: 'pointer' }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: 'var(--text-secondary)',
              transform: availableExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
          >
            Not included ({availableFindings.length})
          </span>
          {availableFindings.length > 0 && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}
            >
              Select findings to add
            </span>
          )}
        </button>

        {availableExpanded && (
          <div className="space-y-2 pl-5">
            {availableFindings.length === 0 ? (
              <p className="text-sm py-4" style={{ color: 'var(--text-secondary)' }}>
                All research findings were used in this article. Nice coverage!
              </p>
            ) : (
              availableFindings.map(f => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  isUsed={false}
                  isSelectedForAdd={selectedToAdd.has(f.id)}
                  isSelectedForRemove={false}
                  onToggle={() => toggleAdd(f.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Section C: Rewrite Controls ── */}
      <RewriteControls
        articleId={articleId}
        addCount={selectedToAdd.size}
        removeCount={selectedToRemove.size}
        instructions={instructions}
        onInstructionsChange={v => { setInstructions(v); setRewriteResult(null) }}
        onRewrite={handleRewrite}
        isRewriting={isRewriting}
        rewriteResult={rewriteResult}
        currentSlug={articleSlug}
        currentType={articleType}
        alternativeTypes={data.alternative_types}
        onSwitchType={handleSwitchType}
        isSwitching={isSwitching}
      />

      {/* Mobile sticky bar — shows when changes are selected */}
      {(selectedToAdd.size > 0 || selectedToRemove.size > 0) && !rewriteResult?.success && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 p-3 md:hidden"
          style={{
            backgroundColor: '#fff',
            borderTop: '1px solid #E8E3DC',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <button
            onClick={handleRewrite}
            disabled={isRewriting}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              backgroundColor: isRewriting ? '#d4c9b8' : '#BA7517',
              color: '#fff',
              cursor: isRewriting ? 'wait' : 'pointer',
              fontFamily: 'var(--font-sora)',
            }}
          >
            {isRewriting ? 'Rewriting...' : `Rewrite with ${selectedToAdd.size + selectedToRemove.size} change${selectedToAdd.size + selectedToRemove.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
