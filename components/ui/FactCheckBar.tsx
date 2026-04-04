'use client'

import { useState, useEffect } from 'react'
import type { FactCheckResult, FactCheckAudit, FactCheckAuditClaim } from '@/types/article'

interface Props {
  status: 'checking' | 'verified'
  factCheck?: FactCheckResult | null
  audit?: FactCheckAudit | null
}

// ── Model display config ──
const MODELS = [
  { key: 'gemini', name: 'Gemini', bg: '#E1F5EE', color: '#085041', barColor: '#22C55E' },
  { key: 'grok', name: 'Grok', bg: '#E6F1FB', color: '#0C447C', barColor: '#3B82F6' },
  { key: 'perplexity', name: 'Perplexity', bg: '#EEEDFE', color: '#3C3489', barColor: '#8B5CF6' },
] as const

/** Compute per-model stats from audit claims */
function computeModelStats(audit: FactCheckAudit) {
  const claims = audit.claims ?? []
  const total = claims.length
  if (total === 0) return []

  // Stage 1 (Gemini): verified = stage1_verdict is 'verified'
  const s1Confirmed = claims.filter(c => c.stage1_verdict === 'verified').length
  const s1Corrected = claims.filter(c => c.stage1_verdict === 'flagged' || c.stage1_verdict === 'insufficient').length

  // Stage 2 (Grok): confirmed = stage2_review exists and agrees
  const s2Claims = claims.filter(c => c.stage2_review)
  const s2Confirmed = s2Claims.filter(c => c.stage2_review!.agrees).length
  const s2Corrected = s2Claims.filter(c => !c.stage2_review!.agrees).length

  // Stage 3 (Perplexity): only if arbitration ran
  const s3Claims = claims.filter(c => c.stage3_arbitration)
  const s3Confirmed = s3Claims.filter(c => c.stage3_arbitration!.verdict === 'verified').length
  const s3Corrected = s3Claims.filter(c => c.stage3_arbitration!.verdict !== 'verified').length

  const stats = [
    { ...MODELS[0], confirmed: s1Confirmed, corrected: s1Corrected, total, active: true },
    { ...MODELS[1], confirmed: s2Confirmed, corrected: s2Corrected, total: s2Claims.length, active: s2Claims.length > 0 },
    { ...MODELS[2], confirmed: s3Confirmed, corrected: s3Corrected, total: s3Claims.length, active: s3Claims.length > 0 },
  ]

  // Only return active models (that actually ran)
  return stats.filter(s => s.active)
}

/** Get disputed/corrected claims with human-readable explanations */
function getDisputedClaims(audit: FactCheckAudit) {
  const claims = audit.claims ?? []
  return claims
    .filter(c => c.final_verdict === 'corrected' || c.final_verdict === 'softened')
    .map(c => {
      let explanation = ''
      if (c.final_verdict === 'corrected') {
        if (c.stage2_review && !c.stage2_review.agrees && c.stage2_review.concerns) {
          explanation = c.stage2_review.concerns
        } else if (c.stage3_arbitration?.reasoning) {
          explanation = c.stage3_arbitration.reasoning
        } else if (c.action_taken) {
          explanation = c.action_taken.replace(/^Corrected:\s*/, '')
        } else {
          explanation = 'One verification model flagged this claim as inaccurate. The article has been updated.'
        }
      } else {
        // softened
        if (c.stage2_review?.concerns) {
          explanation = c.stage2_review.concerns
        } else {
          explanation = 'One verification model flagged this claim as potentially overstated. The language has been softened.'
        }
      }
      return { text: c.text, explanation, verdict: c.final_verdict, action: c.action_taken }
    })
}

export default function FactCheckBar({ status, factCheck, audit }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [slideIn, setSlideIn] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setSlideIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Auto-dismiss after 8s if verified with no issues
  useEffect(() => {
    if (status === 'verified' && !factCheck?.issues_found) {
      const timer = setTimeout(() => setDismissed(true), 8000)
      return () => clearTimeout(timer)
    }
  }, [status, factCheck])

  if (dismissed) return null

  const corrections = factCheck?.issues?.filter(i => i.severity !== 'note') ?? []
  const stagesRun = audit?.stages_run ?? (factCheck ? 1 : 0)
  const totalClaims = (audit?.total_claims && audit.total_claims > 0)
    ? audit.total_claims
    : (factCheck?.checks_performed ?? 0)

  return (
    <>
      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out"
        style={{
          transform: slideIn ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Main bar */}
        <div
          className="px-4 py-3"
          style={{
            backgroundColor: status === 'verified' && !factCheck?.issues_found
              ? '#f0fdf4'
              : 'var(--card)',
            borderTop: status === 'verified' && !factCheck?.issues_found
              ? '1px solid #bbf7d0'
              : '1px solid var(--border)',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div className="max-w-[900px] mx-auto flex items-center gap-3">
            {status === 'checking' ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
                <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
                    Triple-checking
                  </span>
                  <span className="hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                    {' '}— verifying with 3 independent models...
                  </span>
                  <span className="sm:hidden" style={{ color: 'var(--text-secondary)' }}>
                    {' '}against live sources...
                  </span>
                </p>
                <span className="text-sm" style={{ color: 'var(--accent)' }}>
                  <span className="animate-pulse">···</span>
                </span>
              </>
            ) : !factCheck?.issues_found ? (
              <>
                <ShieldCheck />
                <p className="text-sm flex-1" style={{ color: '#15803d' }}>
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
                    Triple-Verified
                  </span>
                  <span className="hidden sm:inline">
                    {totalClaims > 0
                      ? ` — ${totalClaims} claims checked across ${stagesRun} verification stages`
                      : ` — checked across ${stagesRun} verification stages`}
                  </span>
                  <span className="sm:hidden">
                    {totalClaims > 0
                      ? ` — ${totalClaims} claims verified`
                      : ' — all claims verified'}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{
                      color: '#15803d',
                      backgroundColor: '#dcfce7',
                      cursor: 'pointer',
                    }}
                  >
                    {expanded ? 'Close' : 'Details'}
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="text-xs flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ color: '#15803d', opacity: 0.6, minWidth: '44px', minHeight: '44px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : (
              <>
                <ShieldCheck />
                <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>
                    Triple-Verified
                  </span>
                  {' — '}
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>
                    {corrections.length} correction{corrections.length !== 1 ? 's' : ''}
                  </span>
                  <span className="hidden sm:inline"> applied across {stagesRun} verification stages</span>
                  <span className="sm:hidden"> applied</span>
                </p>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {expanded ? 'Close' : 'See details'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && status === 'verified' && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setExpanded(false)}
          />
          {/* Panel */}
          <div className="fixed bottom-12 left-0 right-0 z-50 px-4 pb-2">
            <div
              className="max-w-[600px] mx-auto rounded-xl p-5 max-h-[70vh] overflow-y-auto"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4
                  className="text-sm font-bold"
                  style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                >
                  Verification Report
                </h4>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {totalClaims > 0 ? `${totalClaims} claims checked` : 'Claims checked'}
                </span>
              </div>

              {/* Explainer block */}
              <div
                className="rounded-lg p-3.5 mb-4 flex items-start gap-3"
                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
              >
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  {/* Gemini logo dot */}
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{ width: '22px', height: '22px', backgroundColor: '#E1F5EE' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#085041" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {/* Claude logo dot */}
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{ width: '22px', height: '22px', backgroundColor: '#FEF3C7' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug mb-1" style={{ color: '#15803d', fontFamily: 'var(--font-sora)' }}>
                    Every claim independently verified
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#166534' }}>
                    After writing, every factual claim in this article was extracted and checked by Google Gemini with live web search, then reviewed by Claude for credibility. When they disagree, a third model arbitrates. Corrections are applied automatically.
                  </p>
                </div>
              </div>

              {/* Three-stage checklist */}
              <div className="space-y-2.5 mb-4">
                <StageRow
                  completed={status === 'verified'}
                  label="Source Verification"
                  detail={totalClaims > 0 ? `${totalClaims} claims checked against live web sources` : 'Claims checked against live web sources'}
                />
                <StageRow
                  completed={status === 'verified' && stagesRun >= 2}
                  label="Credibility Review"
                  detail="Sources evaluated for reliability and consistency"
                />
                <StageRow
                  completed={stagesRun >= 3}
                  skipped={stagesRun < 3}
                  label="Independent Audit"
                  detail={stagesRun >= 3
                    ? 'Verified by a third independent model'
                    : 'Skipped — not required for this article type'
                  }
                />
              </div>

              {/* Per-model breakdown */}
              {audit && audit.claims && audit.claims.length > 0 && (
                <ModelBreakdown audit={audit} />
              )}

              {/* Audit summary */}
              {audit && (
                <div
                  className="flex items-center gap-3 text-xs py-2 px-3 rounded-lg mb-3"
                  style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E3DC' }}
                >
                  {audit.summary.corrected > 0 && (
                    <span style={{ color: 'var(--accent)' }}>
                      {audit.summary.corrected} claim{audit.summary.corrected !== 1 ? 's' : ''} corrected
                    </span>
                  )}
                  {audit.summary.softened > 0 && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {audit.summary.softened} softened
                    </span>
                  )}
                  {audit.summary.disagreements > 0 && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {audit.summary.disagreements} disagreement{audit.summary.disagreements !== 1 ? 's' : ''} resolved
                    </span>
                  )}
                  {audit.summary.corrected === 0 && audit.summary.softened === 0 && audit.summary.disagreements === 0 && (
                    <span style={{ color: '#15803d' }}>All claims verified — no corrections needed</span>
                  )}
                </div>
              )}

              {/* Disputed claims callout */}
              {audit && audit.claims && audit.claims.length > 0 && (() => {
                const disputed = getDisputedClaims(audit)
                if (disputed.length === 0) return null
                return (
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: '#92400E' }}>
                        Disputed claims
                      </span>
                    </div>
                    <div className="space-y-2">
                      {disputed.map((d, i) => (
                        <div
                          key={i}
                          className="rounded-lg px-3 py-2"
                          style={{ backgroundColor: '#FEF3C7' }}
                        >
                          <p className="text-xs font-medium mb-1" style={{ color: '#78350F' }}>
                            &ldquo;{d.text}&rdquo;
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                            {d.explanation}
                          </p>
                          {d.verdict === 'corrected' && d.action && (
                            <p className="text-xs mt-1 font-medium" style={{ color: '#15803d' }}>
                              Updated: {d.action.replace(/^Corrected:\s*/, '')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Corrections list (legacy single-stage, if any) */}
              {corrections.length > 0 && !audit?.claims?.length && (
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {corrections.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <span
                        className="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: issue.severity === 'critical' ? '#dc2626'
                            : issue.severity === 'minor' ? 'var(--accent)'
                            : '#94918D',
                        }}
                      />
                      <div>
                        {issue.entity_name && (
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {issue.entity_name}:{' '}
                          </span>
                        )}
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {issue.correction}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setExpanded(false); setDismissed(true) }}
                className="mt-2 w-full text-center text-xs font-semibold py-2 rounded-lg"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer' }}
              >
                Got it, dismiss
              </button>
            </div>
          </div>
        </>
      )}

      {/* Spacer so content isn't hidden behind the fixed bar */}
      <div className="h-12" />
    </>
  )
}

// ── Per-model breakdown ──

function ModelBreakdown({ audit }: { audit: FactCheckAudit }) {
  const stats = computeModelStats(audit)
  if (stats.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        Per-model breakdown
      </p>
      {stats.map((model) => {
        const pct = model.total > 0 ? Math.round((model.confirmed / model.total) * 100) : 0
        return (
          <div key={model.key} className="flex items-center gap-2">
            {/* Model pill */}
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: model.bg, color: model.color, minWidth: '64px', textAlign: 'center' }}
            >
              {model.name}
            </span>
            {/* Progress bar */}
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: '6px', backgroundColor: '#F0EDE8', minWidth: '80px' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: model.barColor }}
              />
            </div>
            {/* Count */}
            <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>
              {model.confirmed} confirmed{model.corrected > 0 ? ` · ${model.corrected} flagged` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Stage row for the verification checklist ──

function StageRow({
  completed,
  skipped,
  label,
  detail,
}: {
  completed: boolean
  skipped?: boolean
  label: string
  detail: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      {completed ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ) : skipped ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94918D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ) : (
        <div
          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0 mt-0.5"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      )}
      <div>
        <p className="text-sm font-medium" style={{ color: completed ? '#15803d' : skipped ? '#94918D' : 'var(--text-primary)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {detail}
        </p>
      </div>
    </div>
  )
}

// ── Shield check icon ──

function ShieldCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

/**
 * Small badge shown near the article title.
 * Always shows "Triple-Verified" when audit data exists (multi-stage pipeline ran).
 * Falls back to "Verified" for single-stage checks.
 * When audit claims data exists, the badge is clickable and toggles the claims panel.
 */
export function FactCheckBadge({
  factCheck,
  audit,
  expanded,
  onToggle,
}: {
  factCheck?: FactCheckResult | null
  audit?: FactCheckAudit | null
  expanded?: boolean
  onToggle?: () => void
}) {
  if (!factCheck) return null

  const stagesRun = audit?.stages_run ?? (factCheck ? 1 : 0)
  const totalClaims = (audit?.total_claims && audit.total_claims > 0)
    ? audit.total_claims
    : (factCheck.checks_performed ?? 0)
  const isTriple = stagesRun >= 2
  const hasClaimsData = audit && audit.claims && audit.claims.length > 0
  const isExpandable = Boolean(hasClaimsData && onToggle)

  return (
    <button
      type="button"
      onClick={isExpandable ? onToggle : undefined}
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-150"
      style={{
        backgroundColor: expanded ? '#dcfce7' : '#f0fdf4',
        color: '#16a34a',
        border: expanded ? '1px solid #86efac' : '1px solid #bbf7d0',
        cursor: isExpandable ? 'pointer' : 'default',
        outline: 'none',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      {isTriple ? 'Triple-Verified' : 'Verified'}
      {totalClaims > 0 && <span style={{ opacity: 0.7 }}> · {totalClaims} claims</span>}
      {isExpandable && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            marginLeft: '2px',
            transition: 'transform 150ms ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  )
}

// ── Claims Panel ──────────────────────────────────────────────────────────────

function getAgreementStatus(claim: FactCheckAuditClaim): {
  label: string
  color: string
} {
  const s1 = claim.stage1_verdict
  const s2 = claim.stage2_review
  const s3 = claim.stage3_arbitration

  // If stage 3 didn't run, check if stages 1 and 2 agree
  if (!s3) {
    if (!s2) return { label: 'Unanimous', color: '#16a34a' }
    // Stage 2 agrees with stage 1
    if (s2.agrees) return { label: 'Unanimous', color: '#16a34a' }
    // Stage 2 disagrees but no arbitration was needed — majority not applicable, show as disputed
    return { label: 'Disputed', color: '#dc2626' }
  }

  // Stage 3 ran — determine agreement
  const s1Verdict = s1 // 'verified' | 'flagged' | 'insufficient'
  const s2Agrees = s2?.agrees ?? true
  const s3Verdict = s3.verdict

  // Map to a common boolean: is the claim considered OK?
  const s1Ok = s1Verdict === 'verified'
  const s2Ok = s2Agrees ? s1Ok : !s1Ok // if disagrees, flips
  const s3Ok = s3Verdict === 'verified'

  const agreementCount = [s1Ok, s2Ok, s3Ok].filter(Boolean).length

  if (agreementCount === 3 || agreementCount === 0) {
    return { label: 'Unanimous', color: '#16a34a' }
  }
  return { label: 'Majority', color: '#d97706' }
}

function getVerdictIndicator(verdict: string): {
  icon: 'check' | 'minus' | 'x'
  color: string
  bg: string
} {
  switch (verdict) {
    case 'verified':
      return { icon: 'check', color: '#16a34a', bg: '#f0fdf4' }
    case 'corrected':
      return { icon: 'x', color: '#dc2626', bg: '#fef2f2' }
    case 'softened':
    case 'insufficient':
      return { icon: 'minus', color: '#d97706', bg: '#fffbeb' }
    default:
      return { icon: 'check', color: '#16a34a', bg: '#f0fdf4' }
  }
}

function VerdictIcon({ type, color }: { type: 'check' | 'minus' | 'x'; color: string }) {
  if (type === 'check') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (type === 'x') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  // minus
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function ClaimsPanel({ audit, onClose }: { audit: FactCheckAudit; onClose: () => void }) {
  const claims = audit.claims
  if (!claims || claims.length === 0) return null

  const verified = claims.filter(c => c.final_verdict === 'verified')
  const corrected = claims.filter(c => c.final_verdict === 'corrected')
  const softened = claims.filter(c => c.final_verdict === 'softened' || c.final_verdict === 'insufficient')

  // Build the summary parts for the stats line
  // Determine which are unanimous vs majority
  const unanimousVerified = verified.filter(c => getAgreementStatus(c).label === 'Unanimous').length
  const majorityVerified = verified.filter(c => getAgreementStatus(c).label === 'Majority').length

  const summaryParts: Array<{ text: string; color: string }> = []
  if (unanimousVerified > 0) {
    summaryParts.push({ text: `${unanimousVerified} verified unanimously`, color: '#16a34a' })
  }
  if (majorityVerified > 0) {
    summaryParts.push({ text: `${majorityVerified} verified by majority`, color: '#d97706' })
  }
  if (corrected.length > 0) {
    summaryParts.push({ text: `${corrected.length} corrected`, color: '#dc2626' })
  }
  if (softened.length > 0) {
    summaryParts.push({ text: `${softened.length} inconclusive`, color: '#d97706' })
  }

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{
        backgroundColor: '#FAFAF8',
        borderRadius: '12px',
        border: '1px solid #E8E3DC',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #E8E3DC' }}
      >
        <h4
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Claim-by-Claim Verification
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center rounded-md transition-colors"
          style={{
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: '28px',
            height: '28px',
            background: 'none',
            border: 'none',
          }}
          aria-label="Close claims panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Explainer */}
      <div
        className="px-4 py-3 flex items-start gap-2.5"
        style={{ borderBottom: '1px solid #E8E3DC', backgroundColor: '#F0FDF4' }}
      >
        <ShieldCheck />
        <p className="text-xs leading-relaxed" style={{ color: '#166534' }}>
          Every factual claim was extracted and checked by Google Gemini with live web search, then reviewed by Claude for credibility. Corrections are applied automatically.
        </p>
      </div>

      {/* Summary stats */}
      {summaryParts.length > 0 && (
        <div
          className="flex items-center gap-2 flex-wrap px-4 py-2.5 text-xs font-medium"
          style={{ borderBottom: '1px solid #E8E3DC' }}
        >
          {summaryParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: '#D4CFC7' }}>·</span>}
              <span style={{ color: part.color }}>{part.text}</span>
            </span>
          ))}
        </div>
      )}

      {/* Per-model breakdown (inside claims panel too) */}
      {audit.claims.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E3DC' }}>
          <ModelBreakdown audit={audit} />
        </div>
      )}

      {/* Disputed claims callout */}
      {(() => {
        const disputed = getDisputedClaims(audit)
        if (disputed.length === 0) return null
        return (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E3DC' }}>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: '#92400E' }}>
                  Disputed claims
                </span>
              </div>
              <div className="space-y-2">
                {disputed.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2"
                    style={{ backgroundColor: '#FEF3C7' }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: '#78350F' }}>
                      &ldquo;{d.text}&rdquo;
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                      {d.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Claims list */}
      <div className="max-h-[320px] overflow-y-auto">
        {claims.map((claim, i) => {
          const verdict = getVerdictIndicator(claim.final_verdict)
          const agreement = getAgreementStatus(claim)

          return (
            <div
              key={claim.id || i}
              className="flex items-start gap-3 px-4 py-2.5"
              style={{
                borderBottom: i < claims.length - 1 ? '1px solid #F0EDE8' : 'none',
              }}
            >
              {/* Verdict indicator */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full mt-0.5"
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: verdict.bg,
                }}
              >
                <VerdictIcon type={verdict.icon} color={verdict.color} />
              </div>

              {/* Claim content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {claim.text}
                </p>

                {/* Correction detail */}
                {claim.final_verdict === 'corrected' && claim.action_taken && (
                  <p
                    className="text-xs mt-1 leading-snug"
                    style={{ color: '#dc2626' }}
                  >
                    {claim.action_taken.replace(/^Corrected:\s*/, '')}
                  </p>
                )}

                {/* Agreement status + category */}
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: agreement.color }}
                  >
                    {agreement.label}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                    {claim.category}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
