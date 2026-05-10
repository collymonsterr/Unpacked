'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * ArticlePreviewCard — self-contained rotating article preview card.
 *
 * Cycles through 4 example articles, each shown for ~6 seconds with a fade
 * transition. Used in the marketing homepage hero and reusable elsewhere as
 * a "show what an article looks like" demo.
 *
 * The hero on /about uses its own inlined version because it links the card
 * rotation to a typing animation in the left column. This standalone version
 * is for places where the card is the only animated element.
 */

interface QuestionPreview {
  text: string
  type: string
  title: string
  bg: string
  icon: string
  image: string
  stats: { value: string; label: string }[]
  verdict: string
  chips: { label: string; color: string; bg: string }[]
  community: { label: string; pct: number }[]
  quote: { source: string; text: string }
}

const QUESTIONS: QuestionPreview[] = [
  {
    text: 'Which mirrorless camera should I buy under $2,500?',
    type: "Buyer's guide",
    title: 'Best Mirrorless Cameras Under $2,500 (2026)',
    bg: 'linear-gradient(135deg,#2D3A4A,#1A2230)',
    icon: '📷',
    image: 'https://images-na.ssl-images-amazon.com/images/I/71xMB0--4yL.jpg',
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
    community: [{ label: 'Sony A7C II', pct: 64 }, { label: 'Fujifilm X-T5', pct: 28 }],
    quote: { source: 'r/mirrorless', text: 'The A7C II autofocus is genuinely scary good. Nothing touches it at this price.' },
  },
  {
    text: 'Is it cheaper to rent or buy in London right now?',
    type: 'Decision guide',
    title: 'Should I Rent or Buy in London? The 2026 Breakdown',
    bg: 'linear-gradient(135deg,#2D4A3E,#1A2E26)',
    icon: '🏠',
    image: 'https://obyywahmmkrpsimjbdua.supabase.co/storage/v1/object/public/article-images/heroes/c573ab2b-528a-4ec7-82c8-9d4b9dca31f8-1774126013769.jpg',
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
    community: [{ label: 'Renting', pct: 58 }, { label: 'Buying', pct: 34 }],
    quote: { source: 'r/HousingUK', text: 'Ran the numbers three times. Renting wins clearly until at least year 4 in London.' },
  },
  {
    text: "What's the real cost of owning a dog in 2026?",
    type: 'Finance',
    title: 'The Real Cost of Owning a Dog in 2026',
    bg: 'linear-gradient(135deg,#3A4A2D,#22301A)',
    icon: '🐕',
    image: 'https://worldanimalfoundation.org/wp-content/uploads/2023/08/cost_of_owning_a_dog_calculator.jpg',
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
    community: [{ label: 'Worth it', pct: 71 }, { label: 'Too expensive', pct: 22 }],
    quote: { source: 'r/dogs', text: 'Budgeted £1,500/year. Actual first year cost: £3,200. The vet bills alone...' },
  },
  {
    text: 'Best running shoes under $160 for daily training?',
    type: "Buyer's guide",
    title: 'Best Running Shoes Under $160 (2026)',
    bg: 'linear-gradient(135deg,#4A3A2D,#30221A)',
    icon: '👟',
    image: 'https://runtothefinish.com/wp-content/uploads/2023/09/running-shoe-lights.jpg',
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
    community: [{ label: 'ASICS', pct: 67 }, { label: 'Nike', pct: 24 }],
    quote: { source: 'r/running', text: 'Gel-Contend 8 at 400 miles and still going. Beats shoes costing twice as much.' },
  },
]

const ROTATE_MS = 6500
const FADE_MS = 320

export default function ArticlePreviewCard() {
  const [qIdx, setQIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setQIdx(prev => (prev + 1) % QUESTIONS.length)
        setVisible(true)
      }, FADE_MS)
    }, ROTATE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [qIdx])

  const q = QUESTIONS[qIdx]

  return (
    <div>
      <div
        style={{
          background: '#fff',
          border: '0.5px solid #E8E2D9',
          borderRadius: '12px',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms`,
        }}
      >
        {/* Thumbnail — real image with gradient/emoji fallback */}
        <div style={{ height: '128px', background: q.bg, position: 'relative', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={q.image}
            alt=""
            style={{ width: '100%', height: '128px', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '42px', pointerEvents: 'none' }}>{q.icon}</span>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ background: '#FDF6E9', color: '#BA7517', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', padding: '3px 8px', borderRadius: '4px' }}>
              {q.type}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>✓ Verified</span>
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

          {/* Community preference bars */}
          <div style={{ borderTop: '0.5px solid #E8E2D9', marginTop: '10px', paddingTop: '10px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#BA7517', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Community preference</p>
            {q.community.map((bar, bi) => (
              <div key={bar.label} className="flex items-center gap-2 mb-1.5">
                <span style={{ fontSize: '11px', color: '#6B6259', width: '80px', flexShrink: 0, textAlign: 'right' as const }}>{bar.label}</span>
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: '#E8E2D9', overflow: 'hidden' }}>
                  <div style={{ width: `${bar.pct}%`, height: '100%', backgroundColor: '#BA7517', borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: bi === 0 ? '#BA7517' : '#9E948A', width: '32px' }}>{bar.pct}%</span>
              </div>
            ))}
          </div>

          {/* Reddit quote */}
          <div style={{ marginTop: '10px', borderLeft: '3px solid rgba(255,69,0,0.4)', borderRadius: '0 6px 6px 0', backgroundColor: '#fff', padding: '8px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#FF4500', marginBottom: '3px' }}>{q.quote.source}</p>
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#6B6259', lineHeight: 1.4 }}>&ldquo;{q.quote.text}&rdquo;</p>
          </div>
        </div>
      </div>

      {/* Footer with dots */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: i === qIdx ? '#BA7517' : '#E8E2D9', transition: '0.3s' }} />
          ))}
        </div>
        <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#C4B9AE' }}>Real articles. Real verdicts.</span>
      </div>
    </div>
  )
}
