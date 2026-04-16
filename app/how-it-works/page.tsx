'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Logo from '@/components/ui/Logo'

/* ─── colour tokens ─── */
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
  { id: 'formats', label: 'Any topic, any format' },
  { id: 'pipeline', label: 'How it\u2019s built' },
  { id: 'why-now', label: 'Why now' },
  { id: 'the-gap', label: 'The gap' },
  { id: 'wirecutter', label: 'The proven model' },
  { id: 'business', label: 'The business' },
  { id: 'founder', label: 'Who\u2019s building it' },
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
      style={{ top: '45%', transform: 'translateY(-50%)', zIndex: 40, left: 'calc(50% - 700px)' }}
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

/* ─── Fade-in-on-view wrapper ─── */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin: '-40px 0px', threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Revenue calculator (unchanged — preserved verbatim) ─── */
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

/* ─── Section label ─── */
function SecLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.amber, marginBottom: '12px' }}>{children}</div>
}

/* ─── Main page ─── */
export default function HowItWorksPage() {
  return (
    <div className="hiw-root" style={{ background: C.cream, minHeight: '100vh', color: C.ink, fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '16px', lineHeight: 1.7, overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }} className="max-sm:!px-5">
        <Logo size="md" />
        <span style={{ fontSize: '12px', color: C.inkFaint, background: C.amberPale, border: `1px solid ${C.amberLight}`, padding: '4px 12px', borderRadius: '20px' }}>Not publicly linked</span>
      </nav>

      {/* Floating sidebar */}
      <SideNav />

      {/* Hero */}
      <div style={{ padding: '80px 48px 64px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.amber, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '24px', height: '1.5px', background: C.amber, display: 'block' }} />
          The thinking behind Unpacked
        </div>
        <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 60px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, color: C.ink, marginBottom: '20px', fontFamily: 'var(--font-sora)' }}>
          The internet,<br />properly <span style={{ color: C.amber }}>synthesised.</span>
        </h1>
        <p style={{ fontSize: '20px', color: C.inkLight, lineHeight: 1.65, maxWidth: '780px', margin: '0 0 20px 0' }}>A system that produces, ranks, and distributes the best answers to questions people already care about &mdash; with a creator ecosystem, a viral distribution loop, and economics that only improve over time.</p>
        <p style={{ fontSize: '17px', color: C.inkLight, lineHeight: 1.7, maxWidth: '720px', margin: 0 }}>A publishing platform where anyone can publish a fully researched, fact-checked article on any topic in minutes &mdash; earning affiliate commissions, building their reputation, and sharing content that travels.</p>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 1. The problem ─── */}
      <section id="problem" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The problem</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>AI gives you data. It doesn&rsquo;t help you make the decision.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Every major AI tool has the same flaw: it presents information but won&rsquo;t commit to an answer. It has no idea what real people think right now, can&rsquo;t tell you what something costs today, and whatever it produces is a wall of unformatted text you can&rsquo;t share, publish, or do anything useful with.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ margin: '24px 0' }}>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>No real verdict</h4>
            <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>&ldquo;Depends on your needs.&rdquo; Every AI hedges. Nobody wants a hedge &mdash; they want someone to tell them what to do.</p>
          </div>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>No real opinions</h4>
            <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>What do people who own this actually say on Reddit right now? AI has no idea. It generates sentiment rather than finding it.</p>
          </div>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>Nothing you can use</h4>
            <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.5 }}>Unformatted, unverified, unshareable. It disappears the moment you close the tab. There&rsquo;s no article &mdash; just a conversation.</p>
          </div>
        </div>
      </section>

      {/* ─── Stats strip ─── */}
      <section style={{ padding: '36px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <FadeIn>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px 20px' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
              {[
                { val: '$0.10', lbl: 'Average cost per article' },
                { val: '5', lbl: 'Core pipeline stages' },
                { val: '3', lbl: 'Independent fact-checkers' },
                { val: '9', lbl: 'Article types' },
                { val: '48,500+', lbl: 'Affiliate merchants' },
                { val: '<3 min', lbl: 'Generation time' },
              ].map((s) => (
                <div key={s.lbl} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 700, color: C.amber, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '6px', fontFamily: 'var(--font-sora)' }}>{s.val}</div>
                  <div style={{ fontSize: '11px', color: C.inkFaint, lineHeight: 1.35, letterSpacing: '0.3px' }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Breaker */}
      <div style={{ background: C.dark, padding: '52px 48px', textAlign: 'center' }} className="max-sm:!px-5">
        <h2 style={{ fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-1.5px', color: 'white', lineHeight: 1.1, marginBottom: '12px', fontFamily: 'var(--font-sora)' }}>We built the output <span style={{ color: C.amber }}>ChatGPT never did.</span></h2>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Same question. A completely different result.</p>
      </div>

      {/* ─── 2. The output ─── */}
      <section id="output" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The output</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>An afternoon&rsquo;s research.<br />Compiled in three minutes.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked doesn&rsquo;t return a chat answer &mdash; it produces a complete article. The kind that would take several hours to research properly: live sources, current prices, real community opinions pulled directly from Reddit and forums, independent fact-checking, and a clear verdict. Laid out like a magazine &mdash; with interactive charts, product cards, comparison tables, and an editorial hero image.</p>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}><strong style={{ color: C.ink, fontWeight: 600 }}>You are the editor.</strong> Adjust the tone, change the focus, swap images, publish it under your name. Share a link that looks like something a publication spent a day on. It costs ten cents to produce.</p>

        {/* Beat 1 — ChatGPT vs Unpacked */}
        <div style={{ margin: '36px 0' }}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4" style={{ alignItems: 'stretch' }}>
            <div className="md:col-span-2" style={{ borderRadius: '14px', overflow: 'hidden', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: '#F3F4F6', color: '#6B7280' }}>💬 ChatGPT</div>
              <div style={{ padding: '20px', background: 'white', fontSize: '14px', color: '#4B5563', lineHeight: 1.65, flex: 1 }}>
                <div style={{ display: 'inline-block', background: '#F3F4F6', color: '#9CA3AF', fontSize: '11px', padding: '3px 10px', borderRadius: '4px', marginBottom: '12px', fontWeight: 600 }}>Great question!</div>
                <p style={{ marginBottom: '12px', fontSize: '14px' }}>Both are excellent flagships. The iPhone has the A19 chip and strong ecosystem integration. The Galaxy has a 200MP sensor. Both support fast charging but you will need to purchase a charger separately.</p>
                <div style={{ background: '#FEF2F2', borderRadius: '8px', padding: '14px 16px', margin: '12px 0', fontSize: '14px', color: '#6B7280' }}>Ultimately the best phone <strong>depends on your personal preferences</strong> and which ecosystem you are invested in.</div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginTop: '8px', marginBottom: 0, borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>No verdict. No real opinions. Nothing to share.</p>
              </div>
            </div>
            <div className="md:col-span-3" style={{ borderRadius: '14px', overflow: 'hidden', border: `2px solid ${C.amberLight}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, borderBottom: `1px solid ${C.amberLight}`, display: 'flex', alignItems: 'center', gap: '8px', background: C.amberPale, color: C.amberDark }}>📄 Unpacked &mdash; same question</div>
              <div style={{ padding: '22px', background: C.cream, flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: C.amber, color: 'white', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '5px', marginBottom: '14px' }}>🏆 VERDICT</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: 0 }}>
                  {['iPhone 17 wins on video, ecosystem, and resale value', 'Galaxy S26 Ultra wins on camera zoom and display', 'Fly weekly? Get the iPhone. Stills-first? Get the Galaxy.'].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: C.inkMid, fontWeight: 500, lineHeight: 1.45 }}>
                      <span style={{ width: '7px', height: '7px', minWidth: '7px', background: C.amber, borderRadius: '50%', marginTop: '5px' }} />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: '14px' }}>
                  <div style={{ borderRadius: '8px', padding: '12px 14px', background: C.amberPale, border: `1px solid ${C.amberLight}` }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>★ Winner</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>iPhone 17</div>
                    <div style={{ fontSize: '12px', color: C.inkFaint, marginTop: '2px' }}>From $799</div>
                  </div>
                  <div style={{ borderRadius: '8px', padding: '12px 14px', background: 'white', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: C.inkFaint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Best zoom</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink }}>Galaxy S26</div>
                    <div style={{ fontSize: '12px', color: C.inkFaint, marginTop: '2px' }}>From $799</div>
                  </div>
                </div>
                <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: C.inkFaint, marginBottom: '10px' }}>Real opinions &mdash; 3,400 Reddit discussions</div>
                  {[{ name: 'iPhone 17', pct: 55, active: true }, { name: 'Galaxy S26', pct: 38, active: false }].map((r) => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: r.active ? '6px' : 0 }}>
                      <span style={{ fontSize: '12px', color: C.inkLight, width: '70px' }}>{r.name}</span>
                      <div style={{ flex: 1, height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '3px', background: r.active ? C.amber : '#D4C9B8', width: `${r.pct}%` }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: r.active ? C.amber : C.inkFaint, width: '32px', textAlign: 'right' }}>{r.pct}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: C.inkFaint, marginBottom: '10px' }}>Key specs compared</div>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}`, color: C.inkFaint, fontWeight: 600, textAlign: 'left' }}></th>
                        <th style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}`, color: C.amber, fontWeight: 700, textAlign: 'center' }}>iPhone 17</th>
                        <th style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}`, color: C.inkMid, fontWeight: 600, textAlign: 'center' }}>Galaxy S26</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Camera', '48MP Fusion', '200MP Wide'],
                        ['Chip', 'A19 Pro', 'Snapdragon 8+'],
                        ['Battery', '4,800 mAh', '5,000 mAh'],
                        ['Price', '$799', '$799'],
                      ].map(([label, a, b]) => (
                        <tr key={label}>
                          <td style={{ padding: '6px 0', color: C.inkFaint, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{label}</td>
                          <td style={{ padding: '6px 0', color: C.ink, fontWeight: 500, textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>{a}</td>
                          <td style={{ padding: '6px 0', color: C.ink, fontWeight: 500, textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>{b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: '13px', color: C.green, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: C.greenLight, fontSize: '10px' }}>✓</span>
                  Prices verified · specs confirmed against live sources
                </div>
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '13px', color: C.inkFaint, fontStyle: 'italic', marginTop: '12px' }}>Unformatted text you cannot share. <span style={{ color: C.amber, fontWeight: 600, fontStyle: 'normal' }}>vs a polished article that travels.</span></p>
        </div>

        {/* Beat 2 — Four proof-points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ margin: '28px 0' }}>
          {[
            { t: 'Researched from the live web', d: 'Current prices, recent reviews, live data. Not recycled training data &mdash; real sources searched at the moment of generation.' },
            { t: 'Real opinions from real people', d: 'Reddit, forums, X/Twitter &mdash; community sentiment pulled and synthesised, not generated by the AI. Every viewpoint attributed.' },
            { t: 'Triple fact-checked', d: 'A dedicated verification stack &mdash; deliberately different models from the writer &mdash; independently checks every price, spec, and claim. Corrections shown transparently.' },
            { t: 'Built to be shared', d: 'A beautiful link that looks like a magazine article. Auto-generated threads, LinkedIn posts, Reddit summaries, and image cards ship with every piece.' },
          ].map((b) => (
            <div key={b.t} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '5px' }}>{b.t}</h4>
              <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: b.d }} />
            </div>
          ))}
        </div>

        {/* Beat 3 — Six-point differentiation grid */}
        <FadeIn>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '26px 28px', margin: '28px 0 0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '4px' }}>Not a chatbot. Not a content tool.</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '20px', fontFamily: 'var(--font-sora)', letterSpacing: '-0.3px' }}>Six things no competitor combines.</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { t: 'Picks a winner', d: 'Every article commits to a verdict. No &ldquo;it depends.&rdquo; 50+ banned hedge phrases are enforced.' },
                { t: 'Triple fact-check', d: 'Three independent models verify claims. Corrections applied transparently before publish.' },
                { t: 'Real community sentiment', d: 'Reddit threads and X posts pulled live, classified by stance, attributed to the source.' },
                { t: 'Live market data', d: 'Polymarket odds, stock prices, and Google Trends embedded at the moment of generation.' },
                { t: 'Interactive tools', d: 'Bespoke decision trees, calculators, and scenario simulators generated per article type.' },
                { t: 'Creator-first', d: 'Every article publishes under a creator&rsquo;s name, carries their affiliate links, and earns them revenue.' },
              ].map((d) => (
                <div key={d.t} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>{d.t}</div>
                  <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: d.d }} />
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 3. Any topic, any format ─── */}
      <section id="formats" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>Any topic, any format</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Not a product review tool. <span style={{ color: C.amber }}>A format engine.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked classifies every question into one of nine article types and generates a completely different structure for each. A buyer&rsquo;s guide gets product cards, spec tables, and a winner. An explainer gets a narrative arc. A breaking news piece gets live data and sentiment. The structure matches the question &mdash; automatically.</p>

        {/* 9-card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" style={{ margin: '24px 0' }}>
          {[
            { t: 'Buyer\u2019s guides', d: 'Product cards, spec tables, winner pick.' },
            { t: 'Comparisons', d: 'Side-by-side with a clear verdict.' },
            { t: 'Explainers', d: 'Narrative arc, no hedging.' },
            { t: 'Decision guides', d: 'Branch logic, scenarios, outcomes.' },
            { t: 'How-tos', d: 'Step-by-step with verified detail.' },
            { t: 'Roundups', d: 'Top picks, ranked and justified.' },
            { t: 'News analysis', d: 'Live data, sentiment, stakes.' },
            { t: 'Trend analysis', d: 'Google Trends plus expert context.' },
            { t: 'Breaking news', d: 'Odds, markets, Reddit in one briefing.' },
          ].map((card) => (
            <div key={card.t} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '3px' }}>{card.t}</div>
              <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.45 }}>{card.d}</p>
            </div>
          ))}
        </div>

        {/* Breaking news breakout */}
        <FadeIn>
          <div style={{ background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '14px', padding: '24px 28px', margin: '28px 0 0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '6px' }}>Breaking news &mdash; a format that doesn&rsquo;t exist anywhere else</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '10px', fontFamily: 'var(--font-sora)', letterSpacing: '-0.3px' }}>Five live sources. One briefing. Three minutes.</h3>
            <p style={{ fontSize: '14px', color: C.inkLight, lineHeight: 1.65, marginBottom: '18px' }}>Every other platform that covers breaking news is reactive. A journalist files hours after the event. An AI summariser pulls headlines from RSS. Neither tells you the real-money probability, the live market reaction, or what people are saying right now. Unpacked pulls from all of them at the moment of generation.</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { t: 'Polymarket', d: 'Real-money odds' },
                { t: 'Yahoo Finance', d: 'Live stock impact' },
                { t: 'Google Trends', d: 'Interest velocity' },
                { t: 'Reddit', d: 'Community sentiment' },
                { t: 'X / Twitter', d: 'Reactions, attributed' },
              ].map((s) => (
                <div key={s.t} style={{ background: 'white', border: `1px solid ${C.amberLight}`, borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: C.ink, marginBottom: '2px' }}>{s.t}</div>
                  <div style={{ fontSize: '10px', color: C.inkFaint, lineHeight: 1.3 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 4. How it's built ─── */}
      <section id="pipeline" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>How it&rsquo;s built</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Five stages. <span style={{ color: C.amber }}>Three minutes.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '24px' }}>Every article runs through the same five-stage pipeline. A deliberately different model handles each step, which keeps errors from compounding and makes fact-checking a genuinely independent pass. Research, writing, and verification never share the same model.</p>

        {/* 5-stage horizontal pipeline */}
        <FadeIn>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px 20px', marginBottom: '24px' }}>
            <div className="flex flex-col md:flex-row gap-3 md:gap-2 md:items-stretch">
              {[
                { n: '1', t: 'Plan', d: 'Classify type, pick structure, generate research manifest.' },
                { n: '2', t: 'Research', d: 'Brave + Reddit + X + live data, all in parallel.' },
                { n: '3', t: 'Blueprint', d: 'Thesis, winner, section skeleton, word budgets.' },
                { n: '4', t: 'Write', d: 'Full article generated with JSON validation.' },
                { n: '5', t: 'Fact-check', d: 'Three independent models verify every claim.' },
              ].map((stage, i, arr) => (
                <div key={stage.n} className="flex md:flex-col items-start md:items-stretch gap-2 flex-1 relative">
                  <div style={{ background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '10px', padding: '14px 14px', flex: 1, width: '100%' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', background: C.amber, color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stage.n}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: C.ink }}>{stage.t}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.4 }}>{stage.d}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="hidden md:flex items-center justify-center absolute" style={{ right: '-11px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Behind the scenes */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.inkFaint, marginBottom: '10px' }}>Also happening behind the scenes</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { t: 'Editorial pass', d: '15-check quality scoring and section-level rewrites before anything ships.' },
              { t: 'Image sourcing', d: 'Routed multi-source hero + section images, filtered for staged stock and text overlays.' },
              { t: 'Social content', d: 'Auto-generated X thread, LinkedIn post, Reddit summary, and shareable image cards.' },
              { t: 'Live data', d: 'Polymarket odds, Yahoo Finance quotes, Google Trends velocity &mdash; filtered for relevance.' },
            ].map((b) => (
              <div key={b.t} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '3px' }}>{b.t}</div>
                <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: b.d }} />
              </div>
            ))}
          </div>
        </div>

        {/* 3-step user view */}
        <div style={{ background: C.cream, border: `1px dashed ${C.border}`, borderRadius: '12px', padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.inkFaint, marginBottom: '12px' }}>What the user sees</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: 'Ask', d: 'Type any question.' },
              { n: 'Wait', d: 'Roughly three minutes.' },
              { n: 'Edit', d: 'Shape it. Publish it under your name.' },
            ].map((step) => (
              <div key={step.n} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink, marginBottom: '2px' }}>{step.n}</div>
                <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.45 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 5. Why now ─── */}
      <section id="why-now" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>Why this has only now become possible</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>The economics <span style={{ color: C.amber }}>only just started working.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Until a year ago, generating a high-quality researched article cost over $1.00 &mdash; making consumer subscription pricing loss-making from day one. The models also weren&rsquo;t reliable enough to produce the structured output Unpacked depends on. Both problems are now solved.</p>

        <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '16px' }}>Cost per article &mdash; the trajectory</div>
          {[
            { period: 'Early 2024', w: '100%', amount: '$1.00+', note: 'Unviable', noteColor: C.inkFaint },
            { period: 'Late 2024', w: '35%', amount: '$0.35', note: 'Marginal', noteColor: C.inkFaint },
            { period: 'Mid 2025', w: '18%', amount: '$0.175', note: 'Viable', noteColor: C.amber },
            { period: 'Now', w: '10%', amount: '~$0.10', note: '~80%+ margin', noteColor: C.green },
            { period: '2026&ndash;27', w: '4%', amount: '$0.03&ndash;05', note: '↓ projected', noteColor: C.green, barColor: C.green, amountColor: C.green, dashed: true },
          ].map((row) => (
            <div key={row.period} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: C.inkFaint, width: '80px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: row.period }} />
              <div style={{ flex: 1, height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden', opacity: row.dashed ? 0.5 : 1 }}>
                <div style={{ height: '100%', borderRadius: '3px', background: row.barColor || C.amber, width: row.w }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: row.amountColor || C.ink, width: '64px', textAlign: 'right' }} dangerouslySetInnerHTML={{ __html: row.amount }} />
              <span style={{ fontSize: '11px', fontWeight: 600, width: '86px', textAlign: 'right', flexShrink: 0, color: row.noteColor }}>{row.note}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: 0 }}>Unlike almost every other business, <strong style={{ color: C.ink, fontWeight: 600 }}>Unpacked&rsquo;s costs fall automatically.</strong> Every new model release reduces the cost per article with no action required. The margins only improve over time.</p>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 6. The gap ─── */}
      <section id="the-gap" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The gap nobody filled</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Why hasn&rsquo;t anyone <span style={{ color: C.amber }}>done this before?</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>The people with the technical capability to build this built chat interfaces &mdash; because that&rsquo;s how engineers think. Nobody with editorial instincts sat at the intersection of AI pipeline design and content business models. And nobody connected it to a proven affiliate revenue model that was already generating tens of millions of dollars a year at Wirecutter.</p>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: 0 }}><strong style={{ color: C.ink, fontWeight: 600 }}>The first-mover advantage here is real and measurable.</strong> Every article published today becomes a long-tail SEO asset that generates organic traffic for years. The content library compounds. The gap between an early entrant and a late one grows every month.</p>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 7. Wirecutter ─── */}
      <section id="wirecutter" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>A proven model &mdash; modernised</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>What if Wirecutter&rsquo;s editorial process was <span style={{ color: C.amber }}>automated &mdash; and anyone could use it?</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Wirecutter was founded in 2011: deep research, one clear recommendation, affiliate commission on every purchase. In five years it drove $150 million in e-commerce annually. The New York Times acquired it for $30 million in 2016. By 2018 it was generating over $20 million a year for the Times. Bootstrapped throughout.</p>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>It did all of that with 60 full-time journalists, one content category, English only, with articles that took days to produce.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" style={{ margin: '24px 0' }}>
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.inkFaint, marginBottom: '10px' }}>Wirecutter</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
              {['60 journalists, one content type, one language', 'Days to research and write each article', 'No community, no user distribution', 'Costs scale with headcount'].map((t) => (
                <li key={t} style={{ fontSize: '13px', color: C.inkFaint, display: 'flex', gap: '8px', textDecoration: 'line-through', textDecorationColor: '#D1C9C0' }}>
                  <span style={{ color: '#D1C9C0', flexShrink: 0, marginTop: '2px', textDecoration: 'none' }}>—</span>
                  <span style={{ textDecoration: 'inherit' }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: C.amber, marginBottom: '10px' }}>Unpacked</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
              {[
                'No journalists &mdash; $0.10/article, fully automated',
                'Any topic &mdash; products, finance, news, culture, health',
                'Community of creators who distribute for you',
                'Costs fall as models improve. Margins only grow.',
              ].map((t) => (
                <li key={t} style={{ fontSize: '13px', color: C.inkMid, display: 'flex', gap: '8px' }}>
                  <span style={{ color: C.green, flexShrink: 0, marginTop: '2px' }}>✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t }} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p style={{ fontSize: '15px', color: C.inkMid, lineHeight: 1.65, fontStyle: 'italic', textAlign: 'center', margin: '20px auto 0', maxWidth: '640px' }}>That&rsquo;s Unpacked.</p>
      </section>

      {/* ─── 8. The business ─── */}
      <section id="business" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>The business</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Three customers. One article. <span style={{ color: C.amber }}>Two revenue lines on every piece.</span></h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '32px' }}>Subscriptions from day one. Affiliate commissions the moment traffic makes them meaningful. Everything else follows a growing content library.</p>

        {/* 8a. Who pays */}
        <div style={{ marginBottom: '44px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '8px' }}>Who pays</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)', letterSpacing: '-0.3px' }}>Readers, retailers, and later &mdash; publishers.</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: '20px' }}>
            {[
              { tag: 'Readers', price: '$12&ndash;29/mo', d: 'Free tier: 3 articles, no card. Standard $12/mo for 15 articles. Pro $29/mo for 60. Subscription from day one.' },
              { tag: 'Retailers', price: 'Affiliate %', d: 'Commission on product recommendations that convert. Reader pays nothing extra. Amazon, booking sites, credit cards ($50&ndash;200 per signup), insurers.' },
              { tag: 'Publishers & brands', price: 'Later', d: 'API access at $0.50&ndash;1.00 per article vs $0.10 cost. Sponsored category placement. Month 6 and beyond.' },
            ].map((c) => (
              <div key={c.tag} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.amber, marginBottom: '4px' }}>{c.tag}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.ink, marginBottom: '8px', fontFamily: 'var(--font-sora)' }} dangerouslySetInnerHTML={{ __html: c.price }} />
                <p style={{ fontSize: '13px', color: C.inkLight, margin: 0, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: c.d }} />
              </div>
            ))}
          </div>

          {/* 12-category tiered grid */}
          <FadeIn>
            <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.inkFaint, marginBottom: '4px' }}>Category economics</div>
              <div style={{ fontSize: '14px', color: C.inkMid, marginBottom: '16px', lineHeight: 1.55 }}>Not all categories monetise equally. High-intent ones drive affiliate directly. Traffic categories convert readers into creators.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { tier: 'Highest affiliate', cats: ['Finance', 'Tech'], accent: C.amber, bg: C.amberPale, border: C.amberLight },
                  { tier: 'High affiliate', cats: ['Home', 'Health', 'Automotive', 'Business'], accent: C.amberDark, bg: '#FCF1E4', border: C.amberLight },
                  { tier: 'Medium affiliate', cats: ['Travel', 'Entertainment'], accent: C.inkMid, bg: C.cream, border: C.border },
                  { tier: 'Traffic & creator pipeline', cats: ['News', 'AI', 'Culture', 'Science'], accent: C.inkFaint, bg: C.cream, border: C.border },
                ].map((tier) => (
                  <div key={tier.tier} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: tier.accent, minWidth: '180px' }}>{tier.tier}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {tier.cats.map((cat) => (
                        <span key={cat} style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: '16px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, color: tier.accent }}>{cat}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Callout */}
          <div style={{ background: C.dark, borderRadius: '12px', padding: '22px 26px', textAlign: 'center' }}>
            <p style={{ fontSize: '17px', color: 'white', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>Every article earns from <span style={{ color: C.amber, fontWeight: 700 }}>readers AND retailers</span> simultaneously. One buyer&rsquo;s guide is both a subscription deliverable and an affiliate revenue source.</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '8px 0 0', fontWeight: 500 }}>Gross margins: 79&ndash;92%.</p>
          </div>
        </div>

        {/* 8b. Creators as distribution */}
        <div style={{ marginBottom: '44px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '8px' }}>Who brings them in</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)', letterSpacing: '-0.3px' }}>Creators are the distribution.</h3>

          <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked lets a creator publish something that looks like a magazine spent a day on it, under their name, in three minutes. For a Substack writer, a niche site owner, a LinkedIn creator &mdash; that production quality is the initial sell. They couldn&rsquo;t produce this output alone.</p>

          <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '20px' }}>Every product recommendation in their articles carries an affiliate link. When readers click and buy, the creator earns a share &mdash; <strong style={{ color: C.ink, fontWeight: 600 }}>20% initially, scaling to 30&ndash;50% for Verified Creators.</strong> Creators are financially motivated to share widely, bring their audience, and publish more. Unpacked gets content, traffic, and conversion without marketing spend. The point Wirecutter couldn&rsquo;t do: <strong style={{ color: C.ink, fontWeight: 600 }}>a workforce that markets itself and earns on performance.</strong></p>

          {/* 3 distribution engines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { t: 'Tweet-to-Article', d: 'Paste any tweet URL and Unpacked extracts the claim, researches it, and builds a full article around it. Every viral tweet becomes evergreen content with a creator&rsquo;s name on it.' },
              { t: 'Creator Acquisition', d: 'Substack writers, niche site owners, LinkedIn creators bring their existing audiences. They publish under their name, earn affiliate revenue, and drive traffic back. No marketing spend required.' },
              { t: 'Viral → Buyer Guide Funnel', d: 'Viral formats (myth busters, ranked lists, breaking news) drive discovery traffic. The bottom-of-page CTA converts readers into creators. Creators make buyer guides that monetise. Top of funnel becomes the revenue machine.' },
            ].map((e) => (
              <div key={e.t} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>{e.t}</div>
                <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: e.d }} />
              </div>
            ))}
          </div>
        </div>

        {/* 8c. Flywheel */}
        <div style={{ marginBottom: '44px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '8px' }}>The flywheel</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)', letterSpacing: '-0.3px' }}>Creators publish. Articles travel. Revenue returns.</h3>

          <FadeIn>
            <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { num: '1', t: 'Creator publishes under their name', d: 'Any topic, 3 minutes, full editorial control' },
                    { num: '2', t: 'One-click repurposing', d: 'X thread, LinkedIn post, Reddit summary, image cards' },
                    { num: '3', t: 'Creator shares to their audience', d: 'Screenshots carry Unpacked branding wherever they land' },
                    { num: '4', t: 'Readers arrive', d: 'Via social, Reddit, search, or embed' },
                    { num: '5', t: 'Some subscribe, some click and buy', d: 'Subscription revenue + affiliate commission' },
                    { num: '6', t: 'Creator earns their share', d: '20% of affiliate initially &mdash; 30&ndash;50% when Verified' },
                    { num: '7', t: 'Some readers become creators', d: 'Bottom-of-page CTA converts traffic into supply' },
                    { num: '8', t: 'Library compounds', d: 'Canonical topics, SEO moat, every article earns for years' },
                  ].map((step) => (
                    <div key={step.num} style={{ background: C.amberPale, border: `1px solid ${C.amberLight}`, borderRadius: '10px', padding: '14px 16px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', background: C.amber, color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{step.num}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{step.t}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: C.inkLight, margin: 0, lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: step.d }} />
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '24px', color: C.amber }}>↻</span>
                  <span style={{ fontSize: '12px', color: C.inkFaint, marginLeft: '8px' }}>Cycle repeats &mdash; each creator strengthens the next</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 8d. The numbers */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.amber, marginBottom: '8px' }}>The numbers</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)', letterSpacing: '-0.3px' }}>Profitable at a surprisingly small scale.</h3>

          {/* Revenue streams timeline */}
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '14px' }}>Five revenue streams &mdash; rolling out in order</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { s: 'Subscriptions', status: 'Live', color: C.green, bg: C.greenLight, borderC: '#B6E1C7' },
                { s: 'Affiliate (Skimlinks)', status: 'Next', color: C.amber, bg: C.amberPale, borderC: C.amberLight },
                { s: 'Creator revenue share', status: 'Planned', color: C.amberDark, bg: '#FCF1E4', borderC: C.amberLight },
                { s: 'Sponsored categories', status: 'Month 6+', color: C.inkMid, bg: C.cream, borderC: C.border },
                { s: 'API access', status: 'Month 12+', color: C.inkFaint, bg: C.cream, borderC: C.border },
              ].map((r) => (
                <div key={r.s} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: r.bg, border: `1px solid ${r.borderC}`, borderRadius: '8px' }}>
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: C.ink }}>{r.s}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: r.color }}>{r.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Profitability milestones */}
          <ul style={{ listStyle: 'none', margin: '0 0 8px', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
            {[
              { num: '150 users', text: <><strong style={{ color: C.ink }}>Break-even.</strong> All infrastructure and API costs covered. Self-sustaining.</> },
              { num: '400 users', text: <><strong style={{ color: C.ink }}>Ramen profitable.</strong> Costs plus founder salary. Growth funded from revenue.</> },
              { num: '1,000 users', text: <><strong style={{ color: C.ink }}>Real business.</strong> Subscription revenue substantial. Affiliate activated. Multiple streams contributing.</> },
              { num: '5,000 users', text: <><strong style={{ color: C.ink }}>Scale.</strong> All revenue streams active. International expansion viable.</> },
            ].map((m) => (
              <li key={m.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', background: 'white', border: `1px solid ${C.border}`, borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.amber, minWidth: '80px', paddingTop: '1px' }}>{m.num}</span>
                <span style={{ fontSize: '14px', color: C.inkLight, lineHeight: 1.5 }}>{m.text}</span>
              </li>
            ))}
          </ul>

          <Calculator />

          <p style={{ fontSize: '13px', color: C.inkFaint, textAlign: 'center', marginTop: '8px' }}>RPM = revenue per 1,000 views. $5&ndash;15 is typical for a growing content site, $20&ndash;40 for an established review platform.</p>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 9. Founder ─── */}
      <section id="founder" style={{ padding: '56px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <SecLabel>Who&rsquo;s building it</SecLabel>
        <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: C.ink, marginBottom: '14px', fontFamily: 'var(--font-sora)' }}>Built by someone who needed it.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, lineHeight: 1.75, marginBottom: '16px' }}>Unpacked started as a tool built to solve a personal frustration. The moment it produced its first article, it was clear that people loved it &mdash; not just because it worked, but because it was genuinely beautiful. Then came the realisation that every article shared was bringing someone new to the platform. And that the same content driving that growth could generate serious revenue. The product, the viral loop, and the business model all emerged from the same starting point.</p>

        <div className="flex flex-col sm:flex-row gap-5" style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '24px', margin: '24px 0', alignItems: 'flex-start' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.amberPale, border: `2px solid ${C.amberLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: C.amber, flexShrink: 0 }}>CF</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.ink, marginBottom: '2px' }}>Colin Fitzpatrick</div>
            <div style={{ fontSize: '13px', color: C.inkFaint, marginBottom: '10px' }}>Founder · unpacked.fyi · Dubai &amp; Ireland</div>
            <p style={{ fontSize: '14px', color: C.inkLight, lineHeight: 1.65, margin: 0 }}>Twenty years across Oracle, Salesforce, and HubSpot. Five years as a founder and startup adviser. Launched a metaverse project in 2023 that reached a $300 million market cap at launch. 25,000 followers on LinkedIn &mdash; one of the most widely-read writers on AI and emerging technology on the platform. Multiple AI products shipped.</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
              <a href="https://colinfitzpatrick.io" style={{ fontSize: '13px', color: C.amber, textDecoration: 'none', fontWeight: 600 }}>colinfitzpatrick.io →</a>
              <a href="https://linkedin.com/in/colly" style={{ fontSize: '13px', color: C.amber, textDecoration: 'none', fontWeight: 600 }}>linkedin.com/in/colly →</a>
            </div>
          </div>
        </div>

        {/* Tech stack row */}
        <div style={{ background: C.cream, border: `1px dashed ${C.border}`, borderRadius: '12px', padding: '18px 22px', margin: '0 0 8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.inkFaint, marginBottom: '12px' }}>The stack</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { cat: 'Platform', items: ['Next.js 16', 'Supabase', 'Vercel'] },
              { cat: 'Models', items: ['Claude Haiku', 'Gemini Flash', 'Claude Sonnet', 'GPT-4o-mini'] },
              { cat: 'Research', items: ['Brave Search', 'Reddit', 'Twitter/X'] },
              { cat: 'Live data', items: ['Polymarket', 'Yahoo Finance', 'Google Trends'] },
              { cat: 'Payments', items: ['Stripe'] },
            ].map((row) => (
              <div key={row.cat} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: C.inkFaint, minWidth: '80px' }}>{row.cat}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {row.items.map((item) => (
                    <span key={item} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '3px 10px', fontSize: '12px', fontWeight: 500, color: C.inkMid, fontFamily: 'var(--font-outfit)' }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}` }} />

      {/* ─── 10. Close ─── */}
      <div style={{ textAlign: 'center', padding: '80px 48px', maxWidth: '960px', margin: '0 auto' }} className="max-sm:!px-5">
        <h2 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.8px', marginBottom: '12px', fontFamily: 'var(--font-sora)', color: C.ink }}>If this resonates, let&rsquo;s talk.</h2>
        <p style={{ fontSize: '16px', color: C.inkLight, marginBottom: '28px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>Not raising a formal round. Just looking to connect with a small number of people who understand this space &mdash; whether as an adviser, an early partner, or someone who wants to be involved as it grows.</p>
        <a href="mailto:colin@unpacked.fyi" style={{ display: 'inline-block', background: C.amber, color: 'white', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>Get in touch →</a>
      </div>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row justify-between items-center gap-2" style={{ borderTop: `1px solid ${C.border}`, padding: '22px 48px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: C.ink, fontFamily: 'var(--font-sora)' }}>Un<span style={{ color: C.amber }}>packed.</span></div>
        <p style={{ fontSize: '13px', color: C.inkFaint, margin: 0 }}>Not publicly linked · unpacked.fyi</p>
      </footer>

      {/* Scoped overrides */}
      <style>{`
        .hiw-root { font-size: 18px !important; line-height: 1.7 !important; }
        .hiw-root p { font-size: 18px !important; line-height: 1.75 !important; }
        .hiw-root h1 { font-size: clamp(44px, 6vw, 72px) !important; font-weight: 700 !important; letter-spacing: -2.5px !important; line-height: 1.05 !important; }
        .hiw-root h2 { font-size: 32px !important; font-weight: 700 !important; letter-spacing: -0.8px !important; line-height: 1.15 !important; }
        .hiw-root h3 { font-size: 22px !important; font-weight: 700 !important; }
        .hiw-root h4 { font-size: 16px !important; font-weight: 700 !important; }
        .hiw-root section { padding-top: 64px !important; padding-bottom: 64px !important; }
      `}</style>
    </div>
  )
}
