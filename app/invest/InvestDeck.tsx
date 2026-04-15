'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'

/* ─── Design tokens ─── */
const C = {
  bg: '#FAFAF8',
  amber: '#BA7517',
  amberPale: '#FDF6E9',
  amberLight: '#F0D9A8',
  ink: '#1A1714',
  inkMid: '#3D3530',
  inkLight: '#6B6259',
  inkFaint: '#9E948A',
  border: '#E8E2D9',
  white: '#FFFFFF',
  dark: '#1A1714',
  darkCard: '#231F1B',
  green: '#16a34a',
  greenPale: '#f0fdf4',
}

const TOTAL_SLIDES = 13

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN DECK COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function InvestDeck() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)

  // Track current slide via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const slides = container.querySelectorAll<HTMLElement>('[data-slide]')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = parseInt(entry.target.getAttribute('data-slide') ?? '0', 10)
            setCurrent(idx)
          }
        }
      },
      { root: container, threshold: 0.5 }
    )

    slides.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  // Keyboard navigation
  const goTo = useCallback((idx: number) => {
    const container = containerRef.current
    if (!container) return
    const clamped = Math.max(0, Math.min(TOTAL_SLIDES - 1, idx))
    const slide = container.querySelector<HTMLElement>(`[data-slide="${clamped}"]`)
    slide?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goTo(current + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(current - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [current, goTo])

  const pad = (n: number) => String(n + 1).padStart(2, '0')

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        backgroundColor: C.bg,
      }}
    >
      {/* Wordmark — fixed top-left */}
      <Link
        href="/"
        className="no-underline"
        style={{
          position: 'fixed',
          top: 24,
          left: 28,
          zIndex: 100,
          fontFamily: 'var(--font-sora)',
          fontWeight: 700,
          fontSize: 15,
          color: C.inkFaint,
          letterSpacing: '-0.02em',
        }}
      >
        unpacked.fyi
      </Link>

      {/* Slide counter — fixed top-right */}
      <div
        style={{
          position: 'fixed',
          top: 26,
          right: 28,
          zIndex: 100,
          fontFamily: 'var(--font-outfit)',
          fontSize: 12,
          color: C.inkFaint,
          letterSpacing: '0.05em',
        }}
      >
        {pad(current)} / {pad(TOTAL_SLIDES - 1)}
      </div>

      {/* Dot navigation — fixed right */}
      <nav
        style={{
          position: 'fixed',
          right: 28,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
        aria-label="Slide navigation"
        className="max-md:hidden"
      >
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: i === current ? C.amber : C.border,
              transition: 'background-color 300ms, transform 300ms',
              transform: i === current ? 'scale(1.3)' : 'scale(1)',
              padding: 0,
            }}
          />
        ))}
      </nav>

      <Slide index={0}><SlideHook /></Slide>
      <Slide index={1}><SlideProblem /></Slide>
      <Slide index={2}><SlideWhatItDoes /></Slide>
      <Slide index={3}><SlideBuiltOnGoogle /></Slide>
      <Slide index={4}><SlideProduct /></Slide>
      <Slide index={5}><SlideDifferent /></Slide>
      <Slide index={6}><SlideTraction /></Slide>
      <Slide index={7}><SlideMarket /></Slide>
      <Slide index={8}><SlideBusinessModel /></Slide>
      <Slide index={9}><SlideGoogleAccess /></Slide>
      <Slide index={10}><SlideGTM /></Slide>
      <Slide index={11}><SlideAsk /></Slide>
      <Slide index={12}><SlideContact /></Slide>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE WRAPPER
   ═══════════════════════════════════════════════════════════════════════════════ */

function Slide({ index, children, dark }: { index: number; children: React.ReactNode; dark?: boolean }) {
  return (
    <section
      data-slide={index}
      style={{
        height: '100vh',
        scrollSnapAlign: 'start',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 32px',
        backgroundColor: dark ? C.dark : C.bg,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 960, width: '100%' }}>
        {children}
      </div>
    </section>
  )
}

/* ─── Shared helpers ─── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-outfit)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: C.amber,
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  )
}

function Headline({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-sora)',
        fontSize: 'clamp(32px, 5vw, 52px)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        color: C.ink,
        margin: '0 0 24px 0',
        ...style,
      }}
    >
      {children}
    </h2>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 1 — HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideHook() {
  return (
    <div style={{ textAlign: 'center' }}>
      <SectionLabel>Google AI Futures Fund</SectionLabel>
      <h1
        style={{
          fontFamily: 'var(--font-sora)',
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.08,
          color: C.ink,
          margin: '0 0 8px 0',
        }}
      >
        Real articles. <span style={{ color: C.amber }}>Built in minutes.</span>
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-outfit)',
          fontSize: 18,
          color: C.inkFaint,
          marginBottom: 48,
        }}
      >
        Powered by Gemini.
      </p>

      {/* Article mockup */}
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          backgroundColor: C.white,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          textAlign: 'left',
        }}
      >
        {/* Hero image placeholder */}
        <div
          style={{
            height: 200,
            background: 'linear-gradient(135deg, #2D3A4A, #1A2230)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 20,
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.amber,
                marginBottom: 6,
              }}
            >
              Buyer&apos;s Guide
            </span>
            <p
              style={{
                fontFamily: 'var(--font-sora)',
                fontSize: 20,
                fontWeight: 700,
                color: C.white,
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Best Mirrorless Cameras Under $2,500
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Verdict box */}
          <div
            style={{
              backgroundColor: '#f5f3f0',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 18 }}>🏆</span>
            <p
              style={{
                fontFamily: 'var(--font-sora)',
                fontSize: 13,
                fontWeight: 600,
                color: C.ink,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Get the Sony A7C II — best autofocus and lens ecosystem under $2,500
            </p>
          </div>

          {/* Fact-check badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 11, fontWeight: 600, color: C.green }}>
              Verified — Triple fact-checked
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 2 — THE PROBLEM
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideProblem() {
  return (
    <div>
      <SectionLabel>The problem</SectionLabel>
      <Headline>AI content is broken.</Headline>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 40, maxWidth: 720 }}>
        <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(17px, 2.2vw, 22px)', color: C.inkMid, lineHeight: 1.6, margin: 0 }}>
          AI-generated content is flooding the internet — generic, unverified, and untrusted.
        </p>
        <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(17px, 2.2vw, 22px)', color: C.inkMid, lineHeight: 1.6, margin: 0 }}>
          Quality editorial content takes days and costs thousands per article.
        </p>
        <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(17px, 2.2vw, 22px)', color: C.inkLight, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          There&apos;s nothing in between.
        </p>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-sora)',
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontWeight: 700,
          color: C.amber,
          marginTop: 48,
          lineHeight: 1.5,
          maxWidth: 640,
        }}
      >
        The world doesn&apos;t need another chatbot. It needs content people would put their name on.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 3 — WHAT UNPACKED DOES
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideWhatItDoes() {
  const features = [
    { title: 'Researched', desc: '100+ sources, Reddit, Twitter/X, live market data' },
    { title: 'Fact-checked', desc: 'Three independent AI models verify every claim' },
    { title: 'Visual', desc: 'Images, interactive charts, comparison tables, product cards' },
    { title: 'Yours', desc: 'Full editorial control. Edit, refine, publish under your name.' },
  ]

  return (
    <div>
      <SectionLabel>The product</SectionLabel>
      <Headline>Type a question. Get a published article.</Headline>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginTop: 40,
        }}
      >
        {features.map((f) => (
          <div
            key={f.title}
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: '24px 22px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-sora)', fontSize: 16, fontWeight: 700, color: C.ink, margin: '0 0 8px 0' }}>
              {f.title}
            </p>
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkLight, margin: 0, lineHeight: 1.55 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-outfit)',
          fontSize: 13,
          color: C.inkFaint,
          marginTop: 32,
          letterSpacing: '0.02em',
        }}
      >
        14 article types &middot; 12 categories &middot; ~$0.10 per article &middot; Under 3 minutes
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 4 — BUILT ON GOOGLE
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideBuiltOnGoogle() {
  const stages = [
    { n: '01', name: 'Planning', desc: 'Classifies type, structures research', provider: 'Claude Haiku', google: false },
    { n: '02', name: 'Research', desc: '100+ sources, Reddit, Twitter/X', provider: 'Brave + Google Trends', google: true },
    { n: '03', name: 'Blueprint', desc: 'Thesis, winner, section skeleton', provider: 'Gemini 2.5 Flash', google: true },
    { n: '04', name: 'Writing', desc: 'Full article with all components', provider: 'Gemini 2.5 Flash', google: true },
    { n: '05', name: 'Editorial', desc: 'Scores and rewrites weak sections', provider: 'Claude Sonnet', google: false },
    { n: '06', name: 'Images', desc: 'Sources editorial photography', provider: 'Pexels / Unsplash / Brave', google: false },
    { n: '07', name: 'Fact-check', desc: 'Three models verify every claim', provider: 'Gemini + Google Search', google: true },
    { n: '08', name: 'Social', desc: 'Ready-to-post threads', provider: 'Gemini 2.5 Flash', google: true },
  ]

  return (
    <div>
      <SectionLabel>Architecture</SectionLabel>
      <Headline>Gemini is our foundation.</Headline>
      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, color: C.inkLight, marginBottom: 36, marginTop: -8 }}>
        Google powers more of our pipeline than any other provider.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stages.map((s) => (
          <div
            key={s.n}
            className="invest-pipeline-row"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: s.google ? C.amberPale : C.white,
              border: `1px solid ${s.google ? C.amberLight : C.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 11, fontWeight: 600, color: C.inkFaint }}>{s.n}</span>
              <span style={{ fontFamily: 'var(--font-sora)', fontSize: 13, fontWeight: 700, color: C.ink }}>{s.name}</span>
              <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 11, fontWeight: 600, color: s.google ? C.amber : C.inkFaint, marginLeft: 'auto' }}>
                {s.provider}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 12, color: C.inkLight, margin: '4px 0 0 30px' }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 13, color: C.inkFaint, marginTop: 24 }}>
        5 of 8 stages powered by Google. Google Auth. Google Analytics. Google Trends.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 5 — THE PRODUCT
   ═══════════════════════════════════════════════════════════════════════════════ */

function BrowserFrame({ url, label, children }: { url: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '6px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#27C93F' }} />
          </div>
          <div style={{ flex: 1, backgroundColor: '#f5f4f2', borderRadius: 5, padding: '3px 8px', fontSize: 9, color: C.inkFaint, fontFamily: 'var(--font-outfit)' }}>
            {url}
          </div>
        </div>
        <div style={{ padding: '12px 14px', backgroundColor: C.white }}>{children}</div>
      </div>
      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 12, color: C.inkLight, marginTop: 10, textAlign: 'center' }}>{label}</p>
    </div>
  )
}

function SlideProduct() {
  return (
    <div>
      <SectionLabel>In action</SectionLabel>
      <Headline style={{ textAlign: 'center' }}>See it in action.</Headline>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 36 }}>

        {/* Card 1 — Buyer guide */}
        <BrowserFrame url="unpacked.fyi/article/iphone-17-vs-galaxy-s26" label="Buyer guide with product cards and verdict">
          <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3, backgroundColor: C.amber, color: C.white, marginBottom: 6 }}>Comparison</span>
          <p style={{ fontFamily: 'var(--font-sora)', fontSize: 12, fontWeight: 700, color: C.ink, margin: '0 0 8px 0' }}>iPhone 17 vs Samsung Galaxy S26</p>
          {/* Verdict */}
          <div style={{ backgroundColor: '#FEF3EC', borderLeft: `3px solid ${C.amber}`, borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
            <p style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: C.amber, margin: 0 }}>Verdict</p>
            <p style={{ fontFamily: 'var(--font-sora)', fontSize: 11, fontWeight: 700, color: C.ink, margin: '2px 0 0 0' }}>Get the iPhone 17</p>
            <p style={{ fontSize: 9, color: C.inkLight, margin: '2px 0 0 0' }}>Unless you want the best camera zoom.</p>
          </div>
          {/* Product cards */}
          {[
            { name: 'iPhone 17', badge: 'WINNER', badgeColor: C.amber, price: 'From $799' },
            { name: 'Galaxy S26', badge: 'BEST ZOOM', badgeColor: C.inkFaint, price: 'From $799' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f0efed', flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.ink }}>{p.name}</span>
                  <span style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', padding: '1px 4px', borderRadius: 3, backgroundColor: p.badgeColor, color: C.white }}>{p.badge}</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: C.amber }}>{p.price}</span>
              </div>
            </div>
          ))}
          {/* Head to head mini */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid #f5f4f1` }}>
            <p style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.inkFaint, marginBottom: 6 }}>Head to Head</p>
            {[{ m: 'Camera', i: 72, s: 88 }, { m: 'Battery', i: 78, s: 75 }, { m: 'Performance', i: 90, s: 88 }].map(r => (
              <div key={r.m} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 8, width: 52, textAlign: 'right', color: C.inkFaint, flexShrink: 0 }}>{r.m}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 1 }}><div style={{ height: 4, borderRadius: '2px 0 0 2px', width: `${(r.i / 100) * 90}%`, backgroundColor: r.i >= r.s ? C.amber : '#D4C9B8' }} /></div>
                  <div style={{ width: 1.5, height: 10, backgroundColor: C.inkFaint, flexShrink: 0 }} />
                  <div style={{ flex: 1, paddingLeft: 1 }}><div style={{ height: 4, borderRadius: '0 2px 2px 0', width: `${(r.s / 100) * 90}%`, backgroundColor: r.s > r.i ? '#3B82F6' : '#D4C9B8' }} /></div>
                </div>
              </div>
            ))}
          </div>
        </BrowserFrame>

        {/* Card 2 — Live data */}
        <BrowserFrame url="unpacked.fyi/article/will-bitcoin-hit-200k" label="Live data: Google Trends + Polymarket + Yahoo Finance">
          <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3, backgroundColor: '#2563EB', color: C.white, marginBottom: 6 }}>Decision Guide</span>
          <p style={{ fontFamily: 'var(--font-sora)', fontSize: 12, fontWeight: 700, color: C.ink, margin: '0 0 10px 0' }}>Will Bitcoin Hit $200K in 2026?</p>

          {/* Polymarket odds */}
          <div style={{ backgroundColor: '#f8f7f5', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: C.white }}>P</span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: C.inkMid }}>Polymarket — Live Odds</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-sora)', fontSize: 20, fontWeight: 800, color: '#16a34a', margin: 0 }}>68%</p>
                <p style={{ fontSize: 8, color: C.inkFaint, margin: 0 }}>Yes</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-sora)', fontSize: 20, fontWeight: 800, color: '#dc2626', margin: 0 }}>32%</p>
                <p style={{ fontSize: 8, color: C.inkFaint, margin: 0 }}>No</p>
              </div>
            </div>
          </div>

          {/* Stock sparkline mockup */}
          <div style={{ backgroundColor: '#f8f7f5', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: C.inkMid }}>BTC-USD</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>$104,230</span>
            </div>
            {/* Mini sparkline */}
            <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" style={{ display: 'block' }}>
              <polyline points="0,22 20,20 40,18 60,24 80,16 100,14 120,18 140,10 160,8 180,6 200,4" fill="none" stroke="#16a34a" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Google Trends mockup */}
          <div style={{ backgroundColor: '#f8f7f5', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: C.inkMid }}>Google Trends</span>
              <span style={{ fontSize: 8, fontWeight: 600, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '1px 5px', borderRadius: 3 }}>Rising</span>
            </div>
            <svg width="100%" height="24" viewBox="0 0 200 24" preserveAspectRatio="none" style={{ display: 'block' }}>
              <polyline points="0,20 25,18 50,16 75,19 100,12 125,10 150,14 175,6 200,2" fill="none" stroke="#4285F4" strokeWidth="1.5" />
            </svg>
          </div>
        </BrowserFrame>

        {/* Card 3 — Fact-check */}
        <BrowserFrame url="unpacked.fyi/article/best-robot-vacuums" label="Triple fact-check verification panel">
          <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3, backgroundColor: C.amber, color: C.white, marginBottom: 6 }}>Buyer&apos;s Guide</span>
          <p style={{ fontFamily: 'var(--font-sora)', fontSize: 12, fontWeight: 700, color: C.ink, margin: '0 0 10px 0' }}>Best Robot Vacuums Under $400</p>

          {/* Verified badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <div>
              <p style={{ fontFamily: 'var(--font-sora)', fontSize: 10, fontWeight: 700, color: '#16a34a', margin: 0 }}>Verified</p>
              <p style={{ fontSize: 8, color: '#6B7280', margin: 0 }}>All claims checked by 3 independent models</p>
            </div>
          </div>

          {/* Claims */}
          <p style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.inkFaint, marginBottom: 6 }}>Verified Claims</p>
          {[
            { claim: 'Roborock S8 MaxV has 10,000Pa suction', status: 'Confirmed' },
            { claim: 'iRobot Roomba j9+ maps rooms in a single pass', status: 'Confirmed' },
            { claim: 'Ecovacs X2 has LiDAR + 3D structured light', status: 'Confirmed' },
            { claim: 'Roborock retails from $349', status: 'Corrected to $399' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6, paddingBottom: 6, borderBottom: i < 3 ? `1px solid #f5f4f1` : 'none' }}>
              {c.status === 'Confirmed' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 9v4" /><circle cx="12" cy="17" r="1" fill={C.amber} /></svg>
              )}
              <div>
                <p style={{ fontSize: 9, color: C.ink, margin: 0, lineHeight: 1.35 }}>{c.claim}</p>
                <p style={{ fontSize: 8, color: c.status === 'Confirmed' ? '#16a34a' : C.amber, margin: '1px 0 0 0', fontWeight: 600 }}>{c.status}</p>
              </div>
            </div>
          ))}

          {/* Models used */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {['Gemini + Google Search', 'Claude Haiku', 'GPT-4o-mini'].map(m => (
              <span key={m} style={{ fontSize: 7, fontWeight: 600, color: C.inkFaint, backgroundColor: '#f5f4f2', padding: '2px 6px', borderRadius: 3 }}>{m}</span>
            ))}
          </div>
        </BrowserFrame>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 6 — WHAT MAKES IT DIFFERENT
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideDifferent() {
  const items = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'Multi-model fact-checking',
      desc: 'Three models from three providers verify independently. A writer can\'t mark its own homework. Gemini with Google Search grounding is the first line of defence.',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      title: 'Live data, not training data',
      desc: 'Polymarket prediction odds, stock prices, and Google Trends data pulled at generation time. Not recalled from memory.',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      title: 'Editorial voice',
      desc: 'Every article picks a winner. No hedging. 50+ banned phrases. Automated quality scoring. Opinions backed by evidence.',
    },
  ]

  return (
    <div>
      <SectionLabel>Differentiation</SectionLabel>
      <Headline>Not another AI writing tool.</Headline>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginTop: 36,
        }}
      >
        {items.map((item) => (
          <div
            key={item.title}
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: '28px 24px',
            }}
          >
            <div style={{ marginBottom: 16 }}>{item.icon}</div>
            <p style={{ fontFamily: 'var(--font-sora)', fontSize: 16, fontWeight: 700, color: C.ink, margin: '0 0 10px 0' }}>
              {item.title}
            </p>
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkLight, margin: 0, lineHeight: 1.6 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 7 — TRACTION
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideTraction() {
  const stats = [
    { value: '8', label: 'Pipeline stages, fully operational' },
    { value: '14', label: 'Article types with distinct structures' },
    { value: '57', label: 'API routes in production' },
    { value: '3', label: 'Independent fact-check models' },
    { value: '$0.10', label: 'Average cost per article' },
    { value: '25K', label: "Founder's LinkedIn audience" },
  ]

  return (
    <div>
      <SectionLabel>Traction</SectionLabel>
      <Headline>What&apos;s already built.</Headline>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginTop: 36,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-sora)',
                fontSize: 36,
                fontWeight: 800,
                color: C.amber,
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em',
              }}
            >
              {s.value}
            </p>
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 13, color: C.inkLight, margin: 0, lineHeight: 1.4 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkFaint, marginTop: 28, lineHeight: 1.6 }}>
        Pre-launch. Stripe integrated. 48,500+ merchant affiliate network ready to activate.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 8 — MARKET OPPORTUNITY
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideMarket() {
  return (
    <div>
      <SectionLabel>Market</SectionLabel>
      <Headline>The Wirecutter model, democratised.</Headline>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, marginTop: 40, alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sora)', fontSize: 'clamp(48px, 7vw, 72px)', fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
            $30M
          </p>
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 15, color: C.inkLight, marginTop: 6 }}>
            Wirecutter acquisition price (NYT, 2016)
          </p>
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-sora)', fontSize: 'clamp(48px, 7vw, 72px)', fontWeight: 800, color: C.amber, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
            $150M
          </p>
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 15, color: C.inkLight, marginTop: 6 }}>
            Annual e-commerce transactions at time of acquisition
          </p>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, color: C.inkMid, lineHeight: 1.65, marginTop: 36, maxWidth: 680 }}>
        Wirecutter proved that opinionated, research-backed editorial content converts readers into buyers. Unpacked gives that capability to anyone, at $0.10 per article.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
        {['Creator economy: $250B+', 'Affiliate marketing: $17B+', 'Content tools: 15%+ annual growth'].map((pill) => (
          <span
            key={pill}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-outfit)',
              fontSize: 13,
              fontWeight: 600,
              color: C.amber,
              backgroundColor: C.amberPale,
              border: `1px solid ${C.amberLight}`,
              padding: '6px 16px',
              borderRadius: 20,
            }}
          >
            {pill}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 9 — BUSINESS MODEL
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideBusinessModel() {
  const streams = [
    {
      title: 'Subscriptions',
      desc: 'Free (3/month), Standard $12 (15/month), Pro $29 (60/month)',
      status: 'Built. Stripe wired.',
      statusColor: C.green,
    },
    {
      title: 'Affiliate',
      desc: 'Skimlinks auto-converts product links across 48,500+ merchants. Every buyer guide becomes a revenue source.',
      status: 'Ready to activate.',
      statusColor: C.amber,
    },
    {
      title: 'Creator revenue share',
      desc: 'Creators earn 20-50% of affiliate revenue from their articles. Incentivises quality over volume.',
      status: 'Designed.',
      statusColor: C.inkFaint,
    },
  ]

  return (
    <div>
      <SectionLabel>Revenue</SectionLabel>
      <Headline>Three revenue streams.</Headline>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginTop: 36,
        }}
      >
        {streams.map((s) => (
          <div
            key={s.title}
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <p style={{ fontFamily: 'var(--font-sora)', fontSize: 18, fontWeight: 700, color: C.ink, margin: '0 0 10px 0' }}>
              {s.title}
            </p>
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkLight, margin: '0 0 16px 0', lineHeight: 1.6, flex: 1 }}>
              {s.desc}
            </p>
            <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 12, fontWeight: 600, color: s.statusColor }}>
              {s.status}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkFaint, marginTop: 28 }}>
        Unit economics: ~$0.10 cost per article. $12-29/month subscription. Strong margins at scale.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 10 — WHAT WE'D BUILD WITH GOOGLE
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideGoogleAccess() {
  const items = [
    {
      product: 'Imagen',
      desc: 'Replace stock photo pipeline with AI-generated editorial images. Every article gets unique, contextual visuals instead of generic stock photos.',
    },
    {
      product: 'Veo',
      desc: 'Generate 30-second video summaries of articles for social distribution. A new format no text-based platform offers.',
    },
    {
      product: 'Next-gen Gemini',
      desc: 'Better writing quality, longer context windows for deep dives, improved reasoning for fact-check verification.',
    },
    {
      product: 'Cloud credits',
      desc: 'Directly reduce per-article cost. Enables aggressive free tier and creator acquisition at scale.',
    },
  ]

  return (
    <div>
      <SectionLabel>The partnership</SectionLabel>
      <Headline>What early access unlocks.</Headline>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          marginTop: 36,
        }}
      >
        {items.map((item) => (
          <div
            key={item.product}
            style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: '28px 24px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-sora)',
                fontSize: 18,
                fontWeight: 700,
                color: C.amber,
                margin: '0 0 10px 0',
              }}
            >
              {item.product}
            </p>
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkLight, margin: 0, lineHeight: 1.6 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 11 — GO-TO-MARKET
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideGTM() {
  const phases = [
    {
      phase: 'Phase 1: Now',
      desc: "Founder's LinkedIn audience (25K followers). First to publish researched analysis of breaking tech news. 30 minutes from announcement to published article.",
    },
    {
      phase: 'Phase 2: Month 1-2',
      desc: '30 founding creators from affiliate sites, Substack, YouTube. Genuine outreach, manual onboarding.',
    },
    {
      phase: 'Phase 3: Month 3+',
      desc: 'Viral loop. Shareable articles drive reader-to-creator conversion. Reddit, LinkedIn, Twitter distribution.',
    },
  ]

  return (
    <div>
      <SectionLabel>Distribution</SectionLabel>
      <Headline>Distribution without paid ads.</Headline>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 40, position: 'relative' }}>
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: 15,
            top: 20,
            bottom: 20,
            width: 2,
            backgroundColor: C.border,
          }}
          className="max-sm:hidden"
        />

        {phases.map((p, i) => (
          <div
            key={p.phase}
            style={{
              display: 'flex',
              gap: 28,
              padding: '20px 0',
              position: 'relative',
            }}
          >
            {/* Dot on timeline */}
            <div
              className="max-sm:hidden"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: i === 0 ? C.amber : C.white,
                border: `2px solid ${i === 0 ? C.amber : C.border}`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 11, fontWeight: 700, color: i === 0 ? C.white : C.inkFaint }}>
                {i + 1}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-sora)', fontSize: 16, fontWeight: 700, color: C.ink, margin: '0 0 8px 0' }}>
                {p.phase}
              </p>
              <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 14, color: C.inkLight, margin: 0, lineHeight: 1.6 }}>
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 12 — THE ASK
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideAsk() {
  const allocation = [
    { label: 'Creator acquisition & founding cohort', pct: 40, color: C.amber },
    { label: 'Infrastructure & API costs at scale', pct: 30, color: C.inkMid },
    { label: 'Distribution & content seeding', pct: 20, color: C.inkLight },
    { label: 'Legal & operations', pct: 10, color: C.inkFaint },
  ]

  return (
    <div>
      <SectionLabel>The ask</SectionLabel>
      <Headline>Let&apos;s build this together.</Headline>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36, maxWidth: 480 }}>
        {['Equity investment', 'Google Cloud credits', 'Early access to Gemini, Imagen, and Veo'].map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.amber, flexShrink: 0 }} />
            <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 17, color: C.ink, margin: 0, fontWeight: 500 }}>
              {item}
            </p>
          </div>
        ))}
      </div>

      {/* Allocation bar */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 14 }}>
          {allocation.map((a) => (
            <div
              key={a.label}
              style={{
                width: `${a.pct}%`,
                backgroundColor: a.color,
                transition: 'width 600ms',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 14 }}>
          {allocation.map((a) => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: a.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 12, color: C.inkLight }}>
                {a.label} — {a.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-sora)',
          fontSize: 15,
          fontWeight: 700,
          color: C.amber,
          marginTop: 36,
          lineHeight: 1.5,
        }}
      >
        Target: 500 active creators, 10,000 articles, first affiliate revenue within 12 months.
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SLIDE 13 — CONTACT
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideContact() {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <SectionLabel>Get in touch</SectionLabel>

      <p
        style={{
          fontFamily: 'var(--font-sora)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: C.ink,
          margin: '0 0 4px 0',
          letterSpacing: '-0.02em',
        }}
      >
        Colin Fitzpatrick
      </p>
      <p style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, color: C.inkLight, margin: '0 0 28px 0' }}>
        Founder
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 36 }}>
        <a
          href="mailto:hello@unpacked.fyi"
          className="no-underline"
          style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, color: C.inkMid, fontWeight: 500 }}
        >
          hello@unpacked.fyi
        </a>
        <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, color: C.inkMid, fontWeight: 500 }}>
          unpacked.fyi
        </span>
        <a
          href="https://linkedin.com/in/colly"
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-outfit)', fontSize: 15, color: C.inkLight }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={C.inkLight}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </a>
        <span style={{ fontFamily: 'var(--font-outfit)', fontSize: 13, color: C.inkFaint, marginTop: 4 }}>
          BlockSol LLC, UAE
        </span>
      </div>

      <Link
        href="/"
        className="no-underline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 32px',
          borderRadius: 12,
          backgroundColor: C.amber,
          color: C.white,
          fontFamily: 'var(--font-sora)',
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Try Unpacked
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  )
}
