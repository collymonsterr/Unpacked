'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Metadata } from 'next'

/* ─── colour tokens (match reference HTML) ─── */
const C = {
  cream: '#FAFAF8', amber: '#BA7517', amberDark: '#993C1D',
  amberPale: '#FDF6E9', amberLight: '#F0D9A8',
  ink: '#1A1714', inkMid: '#3D3530', inkLight: '#6B6259',
  inkFaint: '#9E948A', border: '#E8E2D9', dark: '#1A1714',
  darkCard: '#231F1B', darkBorder: '#2E2925',
  green: '#2D7A4F', greenLight: '#E8F5EE',
}

/* ─── Section nav items ─── */
const NAV_ITEMS = [
  { id: 'problem', label: 'The problem' },
  { id: 'output', label: 'The output' },
  { id: 'why-now', label: 'Why this became possible' },
  { id: 'the-gap', label: 'The gap nobody filled' },
  { id: 'how-it-grows', label: 'How it grows' },
  { id: 'wirecutter', label: 'The proven model' },
  { id: 'business-model', label: 'Business model' },
  { id: 'profitability', label: 'Path to profitability' },
  { id: 'founder', label: 'Who built this' },
]

/* ─── Floating sidebar nav (desktop only) ─── */
function SideNav() {
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id)
  const isClickScrolling = useRef(false)

  useEffect(() => {
    const visibleSections = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio)
          } else {
            visibleSections.delete(entry.target.id)
          }
        }
        if (visibleSections.size > 0) {
          for (const item of NAV_ITEMS) {
            if (visibleSections.has(item.id)) {
              setActiveId(item.id)
              break
            }
          }
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.1, 0.5] }
    )
    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    isClickScrolling.current = true
    setActiveId(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { isClickScrolling.current = false }, 1000)
  }, [])

  return (
    <nav
      className="hidden xl:block fixed w-[160px]"
      style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 40, left: 'calc(50% - 578px)' }}
      aria-label="Page sections"
    >
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className="block w-full text-left text-[13px] leading-tight py-1.5 pl-3.5 relative transition-colors duration-300 border-none bg-transparent cursor-pointer"
                style={{
                  fontFamily: 'var(--font-outfit)',
                  color: isActive ? C.amber : C.inkFaint,
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                <span
                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-sm transition-colors duration-300"
                  style={{ background: isActive ? C.amber : 'transparent' }}
                />
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ─── Revenue calculator ─── */
function Calculator() {
  const [subs, setSubs] = useState(1000)
  const [avg, setAvg] = useState(18)
  const [views, setViews] = useState(150000)
  const [rpm, setRpm] = useState(10)
  const [comm, setComm] = useState(25)

  const subRev = subs * avg
  const affRev = Math.round((views / 1000) * rpm)
  const total = subRev + affRev
  const annual = total * 12

  const fmt = (n: number) => '$' + n.toLocaleString()
  const fmtPlain = (n: number) => n.toLocaleString()

  const sliderStyle: React.CSSProperties = {
    width: '100%', height: '4px', borderRadius: '2px',
    background: C.border, outline: 'none', cursor: 'pointer',
    WebkitAppearance: 'none', appearance: 'none' as never,
  }

  return (
    <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px 32px', margin: '28px 0' }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color: C.ink, marginBottom: '4px', fontFamily: 'var(--font-sora)' }}>Revenue calculator</div>
      <div style={{ fontSize: '13px', color: C.inkFaint, marginBottom: '24px' }}>Adjust the sliders to model different scenarios</div>

      {/* Slider rows */}
      <div style={{ marginBottom: '18px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '7px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.inkMid }}>Paying subscribers</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.amber }}>{fmtPlain(subs)}</span>
        </div>
        <input type="range" min={100} max={20000} step={100} value={subs} onChange={(e) => setSubs(Number(e.target.value))} style={sliderStyle} />
        <div className="flex justify-between" style={{ marginTop: '5px' }}><span style={{ fontSize: '11px', color: C.inkFaint }}>100</span><span style={{ fontSize: '11px', color: C.inkFaint }}>20,000</span></div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '7px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.inkMid }}>Average subscription value</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.amber }}>${avg}/mo</span>
        </div>
        <input type="range" min={12} max={29} step={1} value={avg} onChange={(e) => setAvg(Number(e.target.value))} style={sliderStyle} />
        <div className="flex justify-between" style={{ marginTop: '5px' }}><span style={{ fontSize: '11px', color: C.inkFaint }}>$12 Standard</span><span style={{ fontSize: '11px', color: C.inkFaint }}>$29 Pro</span></div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '7px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.inkMid }}>Monthly article page views</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.amber }}>{fmtPlain(views)}</span>
        </div>
        <input type="range" min={10000} max={5000000} step={10000} value={views} onChange={(e) => setViews(Number(e.target.value))} style={sliderStyle} />
        <div className="flex justify-between" style={{ marginTop: '5px' }}><span style={{ fontSize: '11px', color: C.inkFaint }}>10,000</span><span style={{ fontSize: '11px', color: C.inkFaint }}>5,000,000</span></div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '7px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.inkMid }}>Affiliate RPM (revenue per 1,000 views)</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.amber }}>${rpm}</span>
        </div>
        <input type="range" min={5} max={40} step={1} value={rpm} onChange={(e) => setRpm(Number(e.target.value))} style={sliderStyle} />
        <div className="flex justify-between" style={{ marginTop: '5px' }}><span style={{ fontSize: '11px', color: C.inkFaint }}>$5 early stage</span><span style={{ fontSize: '11px', color: C.inkFaint }}>$40 mature site</span></div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '7px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.inkMid }}>Avg commission per transaction <span style={{ fontSize: '11px', color: C.inkFaint, fontWeight: 400 }}>(for reference)</span></span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.amber }}>${comm}</span>
        </div>
        <input type="range" min={10} max={60} step={5} value={comm} onChange={(e) => setComm(Number(e.target.value))} style={sliderStyle} />
        <div className="flex justify-between" style={{ marginTop: '5px' }}><span style={{ fontSize: '11px', color: C.inkFaint }}>$10 electronics</span><span style={{ fontSize: '11px', color: C.inkFaint }}>$60 finance / travel</span></div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ margin: '24px 0 0' }}>
        <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.inkFaint, marginBottom: '6px' }}>Subscription revenue</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: C.ink, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(subRev)}</div>
          <div style={{ fontSize: '11px', color: C.inkFaint, marginTop: '3px' }}>per month</div>
        </div>
        <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.inkFaint, marginBottom: '6px' }}>Affiliate revenue</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: C.ink, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(affRev)}</div>
          <div style={{ fontSize: '11px', color: C.inkFaint, marginTop: '3px' }}>per month (est.)</div>
        </div>
        <div style={{ background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.amber, marginBottom: '6px' }}>Total monthly</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: C.amber, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(total)}</div>
          <div style={{ fontSize: '11px', color: C.inkFaint, marginTop: '3px' }}>before costs (~$700/mo)</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '14px', padding: '16px', background: C.dark, borderRadius: '10px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Projected annual revenue</div>
        <div style={{ fontSize: '34px', fontWeight: 700, color: C.amber, letterSpacing: '-1px', lineHeight: 1 }}>{fmt(annual)}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Subscription + affiliate · API and sponsorship are incremental on top</div>
      </div>

      <style>{`
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${C.amber}; cursor: pointer; }
        input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${C.amber}; border: none; cursor: pointer; }
      `}</style>
    </div>
  )
}

/* ─── Section label component ─── */
function SecLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.amber, marginBottom: '12px' }}>{children}</div>
}

/* ─── Main page ─── */
export default function HowItWorksPage() {
  return (
    <div className="hiw-root" style={{ background: C.cream, minHeight: '100vh', color: C.ink, fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '16px', lineHeight: 1.7, overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }} className="max-sm:!px-5">
        <div style={{ fontSize: '18px', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-sora)' }}>Un<span style={{ color: C.amber }}>packed.</span></div>
        <span style={{ fontSize: '12px', color: C.inkFaint, background: C.amberPale, border: `1px solid ${C.amberLight}`, padding: '4px 12px', borderRadius: '20px' }}>Not publicly linked</span>
      </nav>

      {/* Floating sidebar */}
      <SideNav />

      {/* Hero */}
      <div style={{ padding: '80px 48px 64px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.amber, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '24px', height: '1.5px', background: C.amber, display: 'block' }} />
          The thinking behind Unpacked
        </div>
        <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 60px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, color: C.ink, marginBottom: '20px', fontFamily: 'var(--font-sora)' }}>
          The internet,<br />properly <span style={{ color: C.amber }}>synthesised.</span>
        </h1>
        <p style={{ fontSize: '18px', color: C.inkLight, lineHeight: 1.65, maxWidth: '580px', margin: 0 }}>A publishing platform where anyone can build a fully researched, fact-checked article on any topic in minutes — with subscription revenue, affiliate commissions, and a built-in viral distribution loop that means the users market it for you.</p>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── The problem ─── */}
      <section id="problem" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The problem</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>AI gives you data. It doesn&apos;t help you make the decision.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Every major AI tool has the same flaw: it presents information but won&apos;t commit to an answer. It has no idea what real people think right now, can&apos;t tell you what something costs today, and whatever it produces is a wall of unformatted text you can&apos;t share, publish, or do anything useful with.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ margin: '24px 0' }}>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>No real verdict</h4>
            <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>&ldquo;Depends on your needs.&rdquo; Every AI hedges. Nobody wants a hedge — they want someone to tell them what to do.</p>
          </div>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>No real opinions</h4>
            <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>What do people who own this actually say on Reddit right now? AI has no idea. It generates sentiment rather than finding it.</p>
          </div>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>Nothing you can use</h4>
            <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>Unformatted, unverified, unshareable. It disappears the moment you close the tab. There&apos;s no article — just a conversation.</p>
          </div>
        </div>
      </section>

      {/* Breaker */}
      <div style={{ background: C.dark, padding: '52px 48px', textAlign: 'center' }} className="max-sm:!px-5">
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-1.2px', color: 'white', lineHeight: 1.1, marginBottom: '10px', fontFamily: 'var(--font-sora)' }}>We built the output <span style={{ color: C.amber }}>ChatGPT never did.</span></h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Same question. A completely different result.</p>
      </div>

      {/* ─── The output ─── */}
      <section id="output" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The output</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>An afternoon&apos;s research.<br />Compiled in three minutes.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked doesn&apos;t return a chat answer — it produces a complete article. The kind that would take several hours to research properly: live sources, current prices, real community opinions pulled directly from Reddit and forums, independent fact-checking, and a clear verdict. Laid out like a magazine — with interactive charts, product cards, comparison tables, and an editorial hero image.</p>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}><strong style={{ color: C.ink, fontWeight: 600 }}>You are the editor.</strong> Adjust the tone, change the focus, swap images, publish it under your name. Share a link that looks like something a publication spent a day on. It costs ten cents to produce.</p>

        {/* Before/After comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" style={{ margin: '28px 0' }}>
          {/* ChatGPT side */}
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: '#F3F4F6', color: '#6B7280' }}>💬 ChatGPT — iPhone 17 vs Galaxy S26?</div>
            <div style={{ padding: '16px', background: 'white', fontSize: '13px', color: '#4B5563', lineHeight: 1.6 }}>
              <div style={{ display: 'inline-block', background: '#F3F4F6', color: '#9CA3AF', fontSize: '11px', padding: '2px 8px', borderRadius: '3px', marginBottom: '8px', fontWeight: 600 }}>Great question!</div>
              <p style={{ marginBottom: '8px', fontSize: '13px' }}>Both are excellent flagships. The iPhone has the A19 chip and strong ecosystem integration. The Galaxy has a 200MP sensor. Both support fast charging but you will need to purchase a charger separately.</p>
              <div style={{ background: '#FEF2F2', borderRadius: '5px', padding: '10px 12px', margin: '8px 0', fontSize: '13px', color: '#6B7280' }}>Ultimately the best phone <strong>depends on your personal preferences</strong> and which ecosystem you are invested in.</div>
              <p style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic', marginTop: '4px', marginBottom: 0 }}>No verdict. No real opinions. Nothing to share.</p>
            </div>
          </div>
          {/* Unpacked side */}
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, borderBottom: `1px solid ${C.amberLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: C.amberPale, color: C.amberDark }}>📄 Unpacked — same question</div>
            <div style={{ padding: '16px', background: C.cream, fontSize: '13px', color: '#4B5563', lineHeight: 1.6 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: C.amber, color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', marginBottom: '12px' }}>🏆 VERDICT</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px', padding: 0 }}>
                {['iPhone 17 wins on video, ecosystem, and resale value', 'Galaxy S26 Ultra wins on camera zoom and display', 'Fly weekly? Get the iPhone. Stills-first? Get the Galaxy.'].map((t, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12.5px', color: C.inkMid, fontWeight: 500, lineHeight: 1.4 }}>
                    <span style={{ width: '6px', height: '6px', minWidth: '6px', background: C.amber, borderRadius: '50%', marginTop: '4px' }} />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" style={{ marginBottom: '10px' }}>
                <div style={{ borderRadius: '6px', padding: '8px 10px', background: C.amberPale, border: `1px solid ${C.amberLight}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>★ Winner</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: C.ink }}>iPhone 17</div>
                  <div style={{ fontSize: '11px', color: C.inkFaint }}>From $799</div>
                </div>
                <div style={{ borderRadius: '6px', padding: '8px 10px', background: 'white', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.inkFaint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Best zoom</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: C.ink }}>Galaxy S26</div>
                  <div style={{ fontSize: '11px', color: C.inkFaint }}>From $799</div>
                </div>
              </div>
              <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: C.inkFaint, marginBottom: '7px' }}>Real opinions — 3,400 Reddit discussions</div>
                {[{ name: 'iPhone 17', pct: 55, active: true }, { name: 'Galaxy S26', pct: 38, active: false }].map((r) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: r.active ? '4px' : 0 }}>
                    <span style={{ fontSize: '11px', color: C.inkLight, width: '56px' }}>{r.name}</span>
                    <div style={{ flex: 1, height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: r.active ? C.amber : '#D4C9B8', width: `${r.pct}%` }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: r.active ? C.amber : C.inkFaint, width: '28px', textAlign: 'right' }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11.5px', color: C.green, fontWeight: 600 }}>✓ Prices verified · specs confirmed against live sources</div>
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: C.inkFaint, fontStyle: 'italic', marginTop: '8px' }}>Unformatted text you cannot share. <span style={{ color: C.amber, fontWeight: 600, fontStyle: 'normal' }}>vs a polished article that travels.</span></p>

        {/* Benefit grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ margin: '28px 0' }}>
          {[
            { t: 'Researched from the live web', d: 'Current prices, recent reviews, live data. Not recycled training data — real sources searched at the moment of generation.' },
            { t: 'Real opinions from real people', d: 'Reddit, forums, review sites — community sentiment pulled and synthesised, not generated by the AI.' },
            { t: 'Independently fact-checked', d: 'A dedicated verification pass after every article. Corrections shown transparently. You know what changed and why.' },
            { t: 'Built to be shared', d: 'A beautiful link that looks like a magazine article. Designed to stand out on Reddit, LinkedIn, and Twitter/X.' },
          ].map((b) => (
            <div key={b.t} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '5px' }}>{b.t}</h4>
              <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.55 }}>{b.d}</p>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: '32px', marginBottom: '10px', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, fontFamily: 'var(--font-sora)' }}>Articles on <span style={{ color: C.amber }}>any topic, in any format.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked isn&apos;t a product review tool. It covers the full range of things people actually want to know about — and generates a completely different article structure depending on what the question requires. From product comparisons to cultural roundups, financial breakdowns to trend analysis — every format is handled automatically.</p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0' }}>
          {[
            { label: "Buyer's guides", hi: true }, { label: 'Comparisons', hi: true }, { label: 'Breaking news', hi: true }, { label: 'Explainers', hi: true },
            { label: 'Financial decisions', hi: false }, { label: 'Trend analysis', hi: false }, { label: 'Roundups & top 10s', hi: false },
            { label: 'Culture & entertainment', hi: false }, { label: 'Travel guides', hi: false },
          ].map((c) => (
            <span key={c.label} style={{
              background: c.hi ? C.amberPale : 'white',
              border: `1px solid ${c.hi ? C.amberLight : C.border}`,
              borderRadius: '20px', padding: '5px 14px', fontSize: '13px', fontWeight: c.hi ? 600 : 500,
              color: c.hi ? C.amberDark : C.inkMid,
            }}>{c.label}</span>
          ))}
        </div>

        {/* Breaking news callout */}
        <div style={{ marginTop: '20px', background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '10px', padding: '20px 22px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '10px' }}>Breaking news — a new way to cover what&apos;s happening</div>
          <p style={{ fontSize: '14px', color: C.inkMid, marginBottom: '10px', lineHeight: 1.65 }}>Unpacked has a unique ability to research everything happening right now — pulling the latest discussion from Twitter and Reddit, surveying news sources, and synthesising community consensus into a structured, shareable article within minutes of a story breaking.</p>
          <p style={{ fontSize: '14px', color: C.inkMid, marginBottom: '12px', lineHeight: 1.65 }}>What makes it genuinely different is the live data layer. Prediction market odds from Polymarket, economic indicators from FRED, real-time financial feeds, and community sentiment from forums can all be woven directly into the article at generation time. No other platform combines live data sources, real community opinion, and editorial structure into a single publishable article this quickly. The result is a format that simply hasn&apos;t existed before.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Polymarket odds', 'FRED economic data', 'Reddit sentiment', 'Twitter/X consensus', 'Live pricing feeds'].map((tag) => (
              <span key={tag} style={{ fontSize: '12px', background: 'white', border: `1px solid ${C.amberLight}`, color: C.amberDark, padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ margin: '28px 0 0' }}>
          {[
            { val: '~$0.10', lbl: 'Cost per article — and falling with every model release' },
            { val: '3 min', lbl: 'From question to published article' },
            { val: '79–92%', lbl: 'Gross margin on subscription revenue' },
          ].map((s) => (
            <div key={s.val} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: C.amber, letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{s.val}</div>
              <div style={{ fontSize: '13px', color: C.inkFaint, lineHeight: 1.4 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── Why now ─── */}
      <section id="why-now" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>Why this has only now become possible</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>The economics <span style={{ color: C.amber }}>only just started working.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Until a year ago, generating a high-quality researched article cost over $1.00 — making consumer subscription pricing loss-making from day one. The models also weren&apos;t reliable enough to produce the structured output Unpacked depends on. Both problems are now solved.</p>

        {/* Cost trend chart */}
        <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '16px' }}>Cost per article — the trajectory</div>
          {[
            { period: 'Early 2024', w: '100%', amount: '$1.00+', note: 'Unviable', noteColor: C.inkFaint },
            { period: 'Late 2024', w: '35%', amount: '$0.35', note: 'Marginal', noteColor: C.inkFaint },
            { period: 'Mid 2025', w: '18%', amount: '$0.175', note: 'Viable', noteColor: C.amber },
            { period: 'Now', w: '10%', amount: '$0.10', note: '80%+ margin', noteColor: C.green },
            { period: '2026–27', w: '4%', amount: '$0.03–05', note: '↓ falling', noteColor: C.green, barColor: C.green, amountColor: C.green },
          ].map((row) => (
            <div key={row.period} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: C.inkFaint, width: '80px', flexShrink: 0 }}>{row.period}</span>
              <div style={{ flex: 1, height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '3px', background: row.barColor || C.amber, width: row.w }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: row.amountColor || C.ink, width: '60px', textAlign: 'right' }}>{row.amount}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, width: '80px', textAlign: 'right', flexShrink: 0, color: row.noteColor }}>{row.note}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: 0 }}>Unlike almost every other business, <strong style={{ color: C.ink, fontWeight: 600 }}>Unpacked&apos;s costs fall automatically.</strong> Every new model release reduces the cost per article with no action required. The margins only improve over time.</p>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── The gap ─── */}
      <section id="the-gap" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The gap nobody filled</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Why hasn&apos;t anyone <span style={{ color: C.amber }}>done this before?</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>The people who had the technical capability to build this built chat interfaces — because that&apos;s how engineers think. Nobody with editorial instincts sat at the intersection of AI pipeline design and content business models. And nobody connected it to a proven affiliate revenue model that was already generating tens of millions of dollars a year at Wirecutter.</p>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: 0 }}><strong style={{ color: C.ink, fontWeight: 600 }}>The first-mover advantage here is real and measurable.</strong> Every article published today becomes a long-tail SEO asset that generates organic traffic for years. The content library compounds. The gap between an early entrant and a late one grows every month.</p>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── How it grows ─── */}
      <section id="how-it-grows" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>How it grows</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>The users market it.<br />The content compounds.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Every article shared is a discovery moment. Unpacked was designed for the formats where this content travels naturally — and the creator model means users are financially motivated to distribute it.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ margin: '24px 0' }}>
          {[
            { t: 'Reddit & forums', d: 'Thorough, opinionated articles with a clear verdict. Exactly what Reddit rewards. One well-placed article drives hundreds of organic visits.' },
            { t: 'Twitter/X & LinkedIn', d: 'The article preview looks like nothing else in any feed. Finance, tech, and business content travels particularly well in professional networks.' },
            { t: 'Creators & bloggers', d: 'Users publish under their name, share to their audience, and earn affiliate commission from what they create. Distribution with no marketing spend.' },
            { t: 'SEO — compounding', d: 'Every article is a long-tail keyword asset. Written once, it generates organic traffic for years. The content library is the moat.' },
          ].map((g) => (
            <div key={g.t} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>{g.t}</h4>
              <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>{g.d}</p>
            </div>
          ))}
        </div>

        {/* Viral loop diagram */}
        <div style={{ margin: '24px 0', background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '2px' }}>The viral loop</div>
            <div style={{ fontSize: '13px', color: C.inkFaint }}>Every article shared brings the next user in</div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <svg viewBox="0 0 640 220" width="100%" xmlns="http://www.w3.org/2000/svg">
              <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
              <rect x="220" y="10" width="200" height="44" rx="8" fill="#FDF6E9" stroke="#F0D9A8" strokeWidth="1"/>
              <text x="320" y="28" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="12" fontWeight="700" fill="#1A1714">Generates article</text>
              <text x="320" y="44" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="11" fill="#6B6259">any topic, any type</text>
              <rect x="456" y="86" width="168" height="44" rx="8" fill="#FDF6E9" stroke="#F0D9A8" strokeWidth="1"/>
              <text x="540" y="104" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="12" fontWeight="700" fill="#1A1714">Shares publicly</text>
              <text x="540" y="120" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="11" fill="#6B6259">earns commission</text>
              <rect x="220" y="166" width="200" height="44" rx="8" fill="#FDF6E9" stroke="#F0D9A8" strokeWidth="1"/>
              <text x="320" y="184" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="12" fontWeight="700" fill="#1A1714">New visitor discovers</text>
              <text x="320" y="200" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="11" fill="#6B6259">clicks through to Unpacked</text>
              <rect x="16" y="86" width="168" height="44" rx="8" fill="#FDF6E9" stroke="#F0D9A8" strokeWidth="1"/>
              <text x="100" y="104" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="12" fontWeight="700" fill="#1A1714">Signs up, tries it</text>
              <text x="100" y="120" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="11" fill="#6B6259">generates their own</text>
              <text x="320" y="116" textAnchor="middle" fontFamily="var(--font-outfit), DM Sans, sans-serif" fontSize="16" fontWeight="700" fill="#BA7517">↻</text>
              <path d="M398 28 C468 28 508 64 508 86" fill="none" stroke="#BA7517" strokeWidth="1.5" markerEnd="url(#arr)"/>
              <path d="M508 130 C508 168 430 182 420 182" fill="none" stroke="#BA7517" strokeWidth="1.5" markerEnd="url(#arr)"/>
              <path d="M220 188 C155 188 118 162 118 130" fill="none" stroke="#BA7517" strokeWidth="1.5" markerEnd="url(#arr)"/>
              <path d="M118 86 C118 58 196 28 220 28" fill="none" stroke="#BA7517" strokeWidth="1.5" markerEnd="url(#arr)"/>
            </svg>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── Wirecutter section ─── */}
      <section id="wirecutter" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>A proven model — modernised</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Wirecutter proved it works.<br /><span style={{ color: C.amber }}>Unpacked removes every constraint.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Wirecutter was founded in 2011: deep research, one clear recommendation, affiliate commission on every purchase. In five years it drove $150 million in e-commerce annually. The New York Times acquired it for $30 million in 2016. By 2018 it was generating over $20 million a year for the Times. Bootstrapped throughout.</p>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>It did all of that with 60 full-time journalists, one content category, English only, with articles that took days to produce.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" style={{ margin: '24px 0' }}>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.inkFaint, marginBottom: '10px' }}>Wirecutter</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
              {['60 journalists, one content type, one language', 'Days to research and write each article', 'No community, no user distribution', 'Costs scale with headcount'].map((t) => (
                <li key={t} style={{ fontSize: '13px', color: C.inkLight, display: 'flex', gap: '8px' }}><span style={{ color: '#D1C9C0', flexShrink: 0, marginTop: '2px' }}>—</span>{t}</li>
              ))}
            </ul>
          </div>
          <div style={{ background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.amber, marginBottom: '10px' }}>Unpacked</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
              {[
                'No journalists — $0.10/article, fully automated',
                'Any topic — products, finance, news, culture, health',
                'Community of creators who distribute for you',
                'Costs fall as models improve. Margins only grow.',
              ].map((t) => (
                <li key={t} style={{ fontSize: '13px', color: C.inkMid, display: 'flex', gap: '8px' }}><span style={{ color: C.green, flexShrink: 0, marginTop: '2px' }}>✓</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Business model (dark section) ─── */}
      <div id="business-model" style={{ background: C.dark, padding: '64px 0' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 48px' }} className="max-sm:!px-5">
          <SecLabel><span style={{ color: 'rgba(186,117,23,0.7)' }}>Business model</span></SecLabel>
          <h2 style={{ color: 'white', marginBottom: '10px', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'var(--font-sora)' }}>Starts lean. Builds layers.</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 0, fontSize: '16px', lineHeight: 1.75 }}>Subscriptions from day one. Affiliate commissions when traffic makes them meaningful. Everything else follows a growing content library.</p>

          <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Layer 1 - amber */}
            <div style={{ background: C.amber, borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', minWidth: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>1</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '3px' }}>Subscriptions</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>Free tier (3 articles, no card). Standard $12/month for 15 articles. Pro $29/month for 60. At $0.10/article, gross margins run 79–92%. Break-even at 150 paying subscribers.</div>
              </div>
            </div>
            {/* Layers 2-4 - dark card */}
            {[
              { num: '2', t: 'Affiliate commissions', d: 'Every product recommendation links to a retailer. Zero additional content cost. Finance and insurance leads pay $50–120 per conversion. Electronics, travel, health — all categories built in from the start.' },
              { num: '3', t: 'Sponsored articles & API access', d: 'Brands sponsor categories (same model as Wirecutter pre-acquisition). Publishers access the pipeline via API at $0.50–1.00 per article vs $0.10 cost. 80–90% margin, zero sales overhead.' },
              { num: '4', t: 'Creator revenue share', d: 'Creators earn a share of the affiliate commission their articles generate. Financially motivated creators share widely, drive traffic, and bring new users in — without any marketing spend from Unpacked.' },
            ].map((layer) => (
              <div key={layer.num} style={{ background: C.darkCard, border: `1px solid ${C.darkBorder}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', minWidth: '28px', background: 'rgba(186,117,23,0.15)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: C.amber }}>{layer.num}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '3px' }}>{layer.t}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{layer.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Path to profitability ─── */}
      <section id="profitability" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>Path to profitability</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Profitable at a surprisingly small scale.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Strong margins from a very small user base. These milestones assume subscription revenue only — affiliate, API, and sponsorship are incremental on top.</p>

        <ul style={{ listStyle: 'none', margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
          {[
            { num: '150 users', text: <><strong style={{ color: C.ink }}>Break-even.</strong> All infrastructure and API costs covered. Self-sustaining.</> },
            { num: '400 users', text: <><strong style={{ color: C.ink }}>Ramen profitable.</strong> Costs plus founder salary. Growth funded from revenue.</> },
            { num: '1,000 users', text: <><strong style={{ color: C.ink }}>Real business.</strong> Subscription revenue substantial. Affiliate activated. Multiple streams contributing.</> },
            { num: '5,000 users', text: <><strong style={{ color: C.ink }}>Scale.</strong> All revenue streams active. International expansion viable.</> },
          ].map((m) => (
            <li key={m.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.amber, minWidth: '70px', paddingTop: '1px' }}>{m.num}</span>
              <span style={{ fontSize: '14px', color: C.inkLight, lineHeight: 1.5 }}>{m.text}</span>
            </li>
          ))}
        </ul>

        <Calculator />

        <p style={{ fontSize: '13px', color: C.inkFaint, textAlign: 'center', marginTop: '8px' }}>RPM = revenue per 1,000 views. $5–15 is typical for a growing content site, $20–40 for an established review platform.</p>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── Founder ─── */}
      <section id="founder" style={{ padding: '56px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>Who built this</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Built by someone who needed it.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked started as a tool built to solve a personal frustration. The moment it produced its first article, it was clear that people loved it — not just because it worked, but because it was genuinely beautiful. Then came the realisation that every article shared was bringing someone new to the platform. And that the same content driving that growth could generate serious revenue. The product, the viral loop, and the business model all emerged from the same starting point.</p>

        <div className="flex flex-col sm:flex-row gap-5" style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '24px', margin: '24px 0', alignItems: 'flex-start' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.amberPale, border: `2px solid ${C.amberLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: C.amber, flexShrink: 0 }}>CF</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.ink, marginBottom: '2px' }}>Colin Fitzpatrick</div>
            <div style={{ fontSize: '13px', color: C.inkFaint, marginBottom: '10px' }}>Founder · unpacked.fyi · Dubai &amp; Ireland</div>
            <p style={{ fontSize: '14px', color: C.inkLight, lineHeight: 1.65, margin: 0 }}>Twenty years across Oracle, Salesforce, and HubSpot, followed by five years as a founder, entrepreneur, and startup adviser. Launched multiple ventures including a metaverse project in 2023 that reached a $300 million market cap at launch. An AI thought leader with 25,000 followers on LinkedIn — one of the most widely-read writers on AI and emerging technology on the platform. Has built several AI-based products and advised multiple startups on growth strategy and go-to-market.</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
              <a href="https://colinfitzpatrick.io" style={{ fontSize: '13px', color: C.amber, textDecoration: 'none', fontWeight: 600 }}>colinfitzpatrick.io →</a>
              <a href="https://linkedin.com/in/colly" style={{ fontSize: '13px', color: C.amber, textDecoration: 'none', fontWeight: 600 }}>linkedin.com/in/colly →</a>
            </div>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── CTA ─── */}
      <div style={{ textAlign: 'center', padding: '80px 48px', maxWidth: '780px', margin: '0 auto' }} className="max-sm:!px-5">
        <h2 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.8px', marginBottom: '12px', fontFamily: 'var(--font-sora)', color: C.ink }}>If this resonates, let&apos;s talk.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, marginBottom: '28px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>Not raising a formal round. Just looking to connect with a small number of people who understand this space — whether as an adviser, an early partner, or someone who wants to be involved as it grows.</p>
        <a href="mailto:colin@unpacked.fyi" style={{ display: 'inline-block', background: C.amber, color: 'white', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>Get in touch →</a>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <a href="/about" style={{ fontSize: '14px', color: C.inkFaint, textDecoration: 'underline' }}>See the product</a>
          <a href="/" style={{ fontSize: '14px', color: C.inkFaint, textDecoration: 'underline' }}>Browse articles</a>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row justify-between items-center gap-2" style={{ borderTop: `1px solid ${C.border}`, padding: '22px 48px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-sora)' }}>Un<span style={{ color: C.amber }}>packed.</span></div>
        <p style={{ fontSize: '13px', color: C.inkFaint, margin: 0 }}>Not publicly linked · unpacked.fyi</p>
      </footer>

      {/* Scoped overrides — enforce reference HTML sizes against Tailwind preflight */}
      <style>{`
        .hiw-root { font-size: 16px !important; line-height: 1.7 !important; }
        .hiw-root p { font-size: 16px !important; line-height: 1.75 !important; }
        .hiw-root h1 { font-size: clamp(38px, 5.5vw, 60px) !important; font-weight: 700 !important; letter-spacing: -2px !important; line-height: 1.05 !important; }
        .hiw-root h2 { font-size: 26px !important; font-weight: 700 !important; letter-spacing: -0.5px !important; line-height: 1.2 !important; }
        .hiw-root h4 { font-size: 14px !important; font-weight: 700 !important; }
        .hiw-root section { padding-top: 56px !important; padding-bottom: 56px !important; }
      `}</style>
    </div>
  )
}
