'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const QUESTIONS = [
  {
    text: 'Which mirrorless camera should I buy under $2,500?',
    type: "Buyer's guide",
    title: 'Best Mirrorless Cameras Under $2,500 (2026)',
    bg: 'linear-gradient(135deg,#2D3A4A,#1A2230)',
    icon: '📷',
    stats: [
      { value: '6', label: 'TESTED' },
      { value: '14', label: 'SOURCES' },
      { value: '847', label: 'DISCUSSIONS' },
    ],
    verdict: 'Get the Sony A7C II — best autofocus and lens ecosystem under $2,500',
    chips: [
      { label: '🏆 Verdict', color: '#BA7517', bg: '#FDF6E9' },
      { label: '📊 Performance chart', color: '#2563EB', bg: '#EFF6FF' },
      { label: '📋 Specs table', color: '#BA7517', bg: '#FDF6E9' },
      { label: '💬 Community', color: '#059669', bg: '#ECFDF5' },
    ],
  },
  {
    text: 'Is it cheaper to rent or buy in London right now?',
    type: 'Decision guide',
    title: 'Should I Rent or Buy in London? The 2026 Breakdown',
    bg: 'linear-gradient(135deg,#2D4A3E,#1A2E26)',
    icon: '🏠',
    stats: [
      { value: '3.4yr', label: 'BREAK-EVEN' },
      { value: '22', label: 'SOURCES' },
      { value: '1,240', label: 'DISCUSSIONS' },
    ],
    verdict: 'Renting wins until year 3.4 at current rates — depends on your deposit size',
    chips: [
      { label: '🏆 Verdict', color: '#BA7517', bg: '#FDF6E9' },
      { label: '🧮 Calculator', color: '#2563EB', bg: '#EFF6FF' },
      { label: '📊 Cost chart', color: '#BA7517', bg: '#FDF6E9' },
      { label: '💬 Community', color: '#059669', bg: '#ECFDF5' },
    ],
  },
  {
    text: "What's the real cost of owning a dog in 2026?",
    type: 'Finance',
    title: 'The Real Cost of Owning a Dog in 2026',
    bg: 'linear-gradient(135deg,#3A4A2D,#22301A)',
    icon: '🐕',
    stats: [
      { value: '$3,200', label: 'ANNUAL' },
      { value: '18', label: 'SOURCES' },
      { value: '2,100', label: 'DISCUSSIONS' },
    ],
    verdict: 'Budget $3,200/year minimum — most owners underestimate by 40%',
    chips: [
      { label: '🏆 Verdict', color: '#BA7517', bg: '#FDF6E9' },
      { label: '🧮 Cost calculator', color: '#2563EB', bg: '#EFF6FF' },
      { label: '📊 Annual breakdown', color: '#BA7517', bg: '#FDF6E9' },
      { label: '💬 Owner reviews', color: '#059669', bg: '#ECFDF5' },
    ],
  },
  {
    text: 'Best running shoes under $160 for daily training?',
    type: "Buyer's guide",
    title: 'Best Running Shoes Under $160 (March 2026)',
    bg: 'linear-gradient(135deg,#4A3A2D,#30221A)',
    icon: '👟',
    stats: [
      { value: '6', label: 'TESTED' },
      { value: '11', label: 'SOURCES' },
      { value: '3,400', label: 'DISCUSSIONS' },
    ],
    verdict: 'ASICS Gel-Contend 8 at $85 — 400mi durability, beats shoes costing twice as much',
    chips: [
      { label: '🏆 Verdict', color: '#BA7517', bg: '#FDF6E9' },
      { label: '📊 Rating chart', color: '#2563EB', bg: '#EFF6FF' },
      { label: '📋 Specs table', color: '#BA7517', bg: '#FDF6E9' },
      { label: '💬 Runners', color: '#059669', bg: '#ECFDF5' },
    ],
  },
]

const CHIPS = ['Best robot vacuums under $400', 'Should I rent or buy?', 'iPhone 17 vs Galaxy S26']

export default function AboutHero() {
  const [qIdx, setQIdx] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [cardVisible, setCardVisible] = useState(true)
  const [activeDot, setActiveDot] = useState(0)
  const phase = useRef<'typing' | 'pause' | 'deleting'>('typing')
  const charIdx = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = QUESTIONS[qIdx]

  const tick = useCallback(() => {
    const question = QUESTIONS[qIdx]
    if (phase.current === 'typing') {
      charIdx.current++
      setDisplayText(question.text.slice(0, charIdx.current))
      if (charIdx.current >= question.text.length) {
        phase.current = 'pause'
        timerRef.current = setTimeout(tick, 2800)
        return
      }
      timerRef.current = setTimeout(tick, 42)
    } else if (phase.current === 'pause') {
      phase.current = 'deleting'
      tick()
    } else if (phase.current === 'deleting') {
      charIdx.current = Math.max(0, charIdx.current - 2)
      setDisplayText(QUESTIONS[qIdx].text.slice(0, charIdx.current))
      if (charIdx.current <= 0) {
        // Fade card out, switch question, fade in
        setCardVisible(false)
        setTimeout(() => {
          const next = (qIdx + 1) % QUESTIONS.length
          setQIdx(next)
          setActiveDot(next)
          phase.current = 'typing'
          charIdx.current = 0
          setDisplayText('')
          setTimeout(() => setCardVisible(true), 50)
          timerRef.current = setTimeout(() => {
            // restart typing for the NEW question
            charIdx.current = 0
            phase.current = 'typing'
            // We need to call tick for the new question — but qIdx won't be updated yet in this closure
            // So we trigger a re-render and let the effect handle it
          }, 100)
        }, 300)
        return
      }
      timerRef.current = setTimeout(tick, 16)
    }
  }, [qIdx])

  // Start typing when qIdx changes
  useEffect(() => {
    phase.current = 'typing'
    charIdx.current = 0
    setDisplayText('')
    timerRef.current = setTimeout(tick, 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [qIdx, tick])

  return (
    <>
      <style>{`
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce) { .anim-fade { animation: none !important; opacity: 1 !important; } }
      `}</style>
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 pt-12 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-10 items-start">
          {/* Left column */}
          <div>
            <h1
              className="anim-fade"
              style={{
                fontFamily: 'var(--font-sora)',
                fontSize: 'clamp(26px, 3.5vw, 34px)',
                fontWeight: 700,
                letterSpacing: '-1px',
                lineHeight: 1.12,
                marginBottom: '14px',
                color: '#1A1714',
                animation: 'fadeUp 0.5s ease-out both',
              }}
            >
              A fully researched,<br />
              fact-checked article<br />
              on <span style={{ color: '#BA7517' }}>anything</span> — <span style={{ color: '#B0A89E' }}>in three minutes.</span>
            </h1>

            <p
              className="anim-fade"
              style={{
                fontSize: '14px',
                color: '#6B6259',
                lineHeight: 1.65,
                marginBottom: '22px',
                paddingBottom: '22px',
                borderBottom: '0.5px solid #E8E2D9',
                animation: 'fadeUp 0.5s ease-out 0.2s both',
              }}
            >
              Beautifully structured with images, interactive charts, and real opinions from real people — all collated into one polished article you can share.
            </p>

            {/* TRY IT NOW label */}
            <p
              className="anim-fade"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: '#BA7517',
                textTransform: 'uppercase' as const,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeUp 0.5s ease-out 0.35s both',
              }}
            >
              <span style={{ width: '14px', height: '1.5px', backgroundColor: '#BA7517', display: 'inline-block' }} />
              Try it now
            </p>

            {/* Input mock */}
            <div
              className="anim-fade"
              style={{
                background: '#fff',
                border: '1.5px solid #BA7517',
                borderRadius: '10px',
                padding: '15px 18px',
                boxShadow: '0 0 0 4px rgba(186,117,23,0.07)',
                minHeight: '62px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'fadeUp 0.5s ease-out 0.35s both',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <div style={{ flex: 1, minHeight: '20px', fontSize: '14px', color: '#1A1714', lineHeight: 1.5 }}>
                {displayText}
                <span style={{ display: 'inline-block', width: '2px', height: '16px', backgroundColor: '#BA7517', marginLeft: '1px', verticalAlign: 'text-bottom', animation: 'blink 0.75s step-end infinite' }} />
              </div>
            </div>

            {/* Hint */}
            <p
              className="anim-fade"
              style={{ fontSize: '12px', color: '#B0A89E', marginTop: '10px', marginBottom: '24px', animation: 'fadeUp 0.5s ease-out 0.5s both' }}
            >
              ↓ Your complete article appears in ~3 minutes
            </p>

            {/* Suggestion chips */}
            <div className="anim-fade flex flex-wrap gap-2" style={{ animation: 'fadeUp 0.5s ease-out 0.5s both' }}>
              {CHIPS.map(c => (
                <span key={c} style={{ background: '#fff', border: '0.5px solid #E8E2D9', borderRadius: '20px', padding: '6px 13px', fontSize: '12px', color: '#6B6259' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Right column — article preview card */}
          <div className="anim-fade" style={{ animation: 'fadeUp 0.5s ease-out 0.4s both' }}>
            <div
              style={{
                background: '#fff',
                border: '0.5px solid #E8E2D9',
                borderRadius: '12px',
                overflow: 'hidden',
                opacity: cardVisible ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            >
              {/* Thumbnail */}
              <div style={{ height: '128px', background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '42px' }}>{q.icon}</span>
              </div>
              {/* Body */}
              <div style={{ padding: '14px 16px' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ background: '#FDF6E9', color: '#BA7517', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', padding: '3px 8px', borderRadius: '4px' }}>
                    {q.type}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>✓ Fact-checked</span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1714', lineHeight: 1.3, marginBottom: '10px' }}>{q.title}</p>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {q.stats.map(s => (
                    <div key={s.label} style={{ background: '#FAFAF8', border: '0.5px solid #E8E2D9', borderRadius: '6px', padding: '7px 8px', textAlign: 'center' as const }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#BA7517' }}>{s.value}</p>
                      <p style={{ fontSize: '10px', color: '#9E948A', textTransform: 'uppercase' as const }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Verdict */}
                <div style={{ background: '#FDF6E9', border: '1px solid #F0D9A8', borderRadius: '8px', padding: '9px 12px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#BA7517', marginBottom: '3px' }}>🏆 VERDICT</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#1A1714', lineHeight: 1.3 }}>{q.verdict}</p>
                </div>
                {/* Component chips */}
                <div className="flex flex-wrap gap-1">
                  {q.chips.map(c => (
                    <span key={c.label} style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '3px', background: c.bg, color: c.color }}>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Footer with dots + hint */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1.5">
                {QUESTIONS.map((_, i) => (
                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: i === activeDot ? '#BA7517' : '#E8E2D9', transition: '0.3s' }} />
                ))}
              </div>
              <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#C4B9AE' }}>Updates with each question →</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
