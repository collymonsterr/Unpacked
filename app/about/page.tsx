'use client'

import { useState } from 'react'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import SearchForm from '@/components/SearchForm'
import Link from 'next/link'
import QuickVerdict from '@/components/sections/QuickVerdict'

// ── Sample data for live component demos ──

const SAMPLE_VERDICT = {
  bullets: [
    'Sony WH-1000XM6 wins on noise cancellation and sound quality — the best all-rounder under $350',
    'Bose QC45 is more comfortable for 8+ hour wear but loses on bass response and ANC performance',
    'If you fly weekly, get the Sony. If you wear them all day at a desk, get the Bose.',
  ],
  one_liner: 'The Sony WH-1000XM6 is the better headphone for most people — but Bose wins on pure comfort.',
}

const SAMPLE_PRODUCT_CARDS = [
  {
    name: 'Sony WH-1000XM6',
    price: '$348',
    verdict: 'TOP PICK',
    specs: { 'ANC': 'Industry-leading', 'Battery': '40 hours', 'Weight': '254g' },
  },
  {
    name: 'Bose QuietComfort 45',
    price: '$279',
    verdict: 'RUNNER UP',
    specs: { 'ANC': 'Very good', 'Battery': '24 hours', 'Weight': '238g' },
  },
  {
    name: 'Apple AirPods Max 2',
    price: '$549',
    verdict: 'PREMIUM PICK',
    specs: { 'ANC': 'Excellent', 'Battery': '20 hours', 'Weight': '384g' },
  },
]

const SAMPLE_CORRECTIONS = [
  { original: 'Sony WH-1000XM6 price: $329', corrected: 'Current price: $348 (verified March 2026)' },
  { original: 'Bose QC45 battery: 22 hours', corrected: 'Actual battery: 24 hours (from Bose spec sheet)' },
]

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline" style={{ color: 'var(--text-secondary)' }}>
            Home
          </Link>
          <UserMenu />
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5"
          style={{ fontFamily: 'var(--font-sora)', color: '#1A1A1A' }}
        >
          Build a fully researched, fact-checked article in three minutes.
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#6B6B6B' }}>
          Beautifully structured with images, interactive charts, and real opinions from real people — all collated into one polished article you can share.
        </p>
        <Link
          href="/"
          className="inline-block px-7 py-3 rounded-xl text-base font-semibold no-underline"
          style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}
        >
          Generate your first article →
        </Link>
      </section>

      {/* ═══ CHALLENGER LINE (dark section) ═══ */}
      <section className="w-full py-16" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-3"
            style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}
          >
            We built the interface ChatGPT never did.
          </h2>
          <p className="text-lg" style={{ color: '#94918D' }}>
            Same question. Completely different result.
          </p>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — three steps ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              num: '01',
              title: 'Ask anything',
              desc: 'Type any question, buying decision, or comparison. Any topic, any depth.',
            },
            {
              num: '02',
              title: 'We research',
              desc: 'We search the live web, Reddit, forums, and expert reviews. Real data, not recycled training data.',
            },
            {
              num: '03',
              title: 'You\'re the editor',
              desc: 'We hand you the first draft. Refine the tone, swap images, adjust sections, and publish something that\'s genuinely yours — under your name.',
            },
          ].map((step) => (
            <div key={step.num} className="text-center md:text-left">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: '#BA7517' }}
              >
                Step {step.num}
              </span>
              <h3
                className="text-xl font-bold mt-2 mb-2"
                style={{ fontFamily: 'var(--font-sora)', color: '#1A1A1A' }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6B6B6B' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURE BLOCKS — alternating layout ═══ */}

      {/* Feature 01: Verdict */}
      <FeatureBlock
        number="01"
        title="A clear verdict. Every time."
        description="No hedging. No &ldquo;it depends on your preferences.&rdquo; Every article picks a winner and tells you why — like a senior product journalist with 15 years of experience."
        align="left"
      >
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E3DC' }}>
          <div className="p-4 md:p-6" style={{ backgroundColor: '#fff' }}>
            <QuickVerdict data={SAMPLE_VERDICT} />
          </div>
        </div>
      </FeatureBlock>

      {/* Feature 02: Calculator */}
      <FeatureBlock
        number="02"
        title="Real calculators. Built into every article."
        description="Interactive tools that let you plug in your own numbers — mortgage payments, retirement savings, commute costs. Not static text. Real calculators that update as you move the sliders."
        align="right"
      >
        <RentBuyCalculator />
      </FeatureBlock>

      {/* Feature 03: Product Cards */}
      <FeatureBlock
        number="03"
        title="Real product cards, automatically sourced."
        description="Every product gets a card with images, specs, price, and an editorial opinion. Sourced from live web search — not training data from 2024."
        align="left"
      >
        <div className="space-y-3">
          {SAMPLE_PRODUCT_CARDS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl p-4 flex items-start gap-4"
              style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}
            >
              <div
                className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}
              >
                {p.verdict.split(' ')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{p.name}</h4>
                  <span className="text-sm font-bold" style={{ color: '#BA7517' }}>{p.price}</span>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}
                >
                  {p.verdict}
                </span>
                <div className="flex gap-4 mt-2 text-xs" style={{ color: '#6B6B6B' }}>
                  {Object.entries(p.specs).map(([k, v]) => (
                    <span key={k}><strong>{k}:</strong> {v}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </FeatureBlock>

      {/* Feature 04: Image Control */}
      <FeatureBlock
        number="04"
        title="You control the images."
        description="Not happy with a product photo? Click to search for a better one, or upload your own. Every image in the article is replaceable — hero images, product shots, everything."
        align="right"
      >
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-lg flex items-center justify-center text-xs"
                style={{
                  backgroundColor: i === 1 ? '#FEF3EC' : '#F5F4F1',
                  border: i === 1 ? '2px solid #BA7517' : '1px solid #E8E3DC',
                  color: i === 1 ? '#BA7517' : '#94918D',
                }}
              >
                {i === 1 ? '✓ Selected' : `Option ${i}`}
              </div>
            ))}
          </div>
          <div
            className="rounded-lg py-6 text-center text-xs"
            style={{
              border: '2px dashed #E8E3DC',
              color: '#94918D',
            }}
          >
            📁 Or upload your own image
          </div>
        </div>
      </FeatureBlock>

      {/* Feature 05: Community Opinions */}
      <FeatureBlock
        number="05"
        title="Real opinions from real people."
        description="We search Reddit, Twitter/X, and specialist forums. You see what actual owners and experts think — not AI-generated fake reviews."
        align="left"
      >
        <div className="space-y-3">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}
          >
            <div className="pl-3 py-1 mb-2" style={{ borderLeft: '3px solid #BA7517' }}>
              <p className="text-sm italic" style={{ color: '#1A1A1A' }}>
                &ldquo;Had both. The Sony wins on everything except comfort for 8+ hours. The Bose feels like pillows on your ears.&rdquo;
              </p>
              <p className="text-xs mt-1" style={{ color: '#BA7517' }}>r/headphones</p>
            </div>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}
          >
            <div className="pl-3 py-1 mb-2" style={{ borderLeft: '3px solid #BA7517' }}>
              <p className="text-sm italic" style={{ color: '#1A1A1A' }}>
                &ldquo;For commuting the Sony ANC is unbeatable. I can&apos;t hear the tube at all. Bose lets some low rumble through.&rdquo;
              </p>
              <p className="text-xs mt-1" style={{ color: '#BA7517' }}>r/headphoneadvice</p>
            </div>
          </div>
          {/* Sentiment bar */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B6B6B' }}>Community recommendation across 847 discussions</p>
            <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#F5F4F1' }}>
              <div style={{ width: '62%', backgroundColor: '#BA7517' }} />
              <div style={{ width: '31%', backgroundColor: '#D4A843' }} />
              <div style={{ width: '7%', backgroundColor: '#D3D1C7' }} />
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: '#6B6B6B' }}>
              <span>Sony 62%</span>
              <span>Bose 31%</span>
              <span>Other 7%</span>
            </div>
          </div>
        </div>
      </FeatureBlock>

      {/* Feature 06: Fact-checking */}
      <FeatureBlock
        number="06"
        title="Independently fact-checked after every article."
        description="A second AI — completely separate from the one that wrote it — verifies every price, spec, and claim against live sources. You see exactly what was corrected."
        align="right"
      >
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E3DC', backgroundColor: '#fff' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #E8E3DC', backgroundColor: '#f0fdf4' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: '#059669' }}>
              Fact-check complete — 2 corrections applied
            </span>
          </div>
          <div className="p-4 space-y-3">
            {SAMPLE_CORRECTIONS.map((c, i) => (
              <div key={i} className="text-sm">
                <p className="line-through mb-0.5" style={{ color: '#dc2626', opacity: 0.6 }}>{c.original}</p>
                <p style={{ color: '#059669' }}>{c.corrected}</p>
              </div>
            ))}
          </div>
        </div>
      </FeatureBlock>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section className="w-full py-12 mt-10" style={{ backgroundColor: '#BA7517' }}>
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-extrabold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>
              100+
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Articles generated
            </p>
          </div>
          <div>
            <p className="text-3xl font-extrabold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>
              94%
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Fact-check pass rate
            </p>
          </div>
          <div>
            <p className="text-3xl font-extrabold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>
              ~2 min
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Average generation time
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2
          className="text-3xl md:text-4xl font-extrabold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: '#1A1A1A' }}
        >
          Your question. A complete article. Three minutes.
        </h2>
        <div className="mt-8">
          <SearchForm autoFocus={false} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs" style={{ color: '#94918D', borderTop: '1px solid #E8E3DC' }}>
        <div className="flex items-center justify-center gap-4">
          <Link href="/about" className="no-underline" style={{ color: '#94918D' }}>About</Link>
          <Link href="/creators" className="no-underline" style={{ color: '#94918D' }}>Creators</Link>
          <span>unpacked.fyi</span>
        </div>
      </footer>
    </div>
  )
}

// ── Feature block layout ──

function FeatureBlock({
  number,
  title,
  description,
  align,
  children,
}: {
  number: string
  title: string
  description: string
  align: 'left' | 'right'
  children: React.ReactNode
}) {
  const textContent = (
    <div className="flex-1">
      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#BA7517' }}>
        Feature {number}
      </span>
      <h3
        className="text-2xl md:text-3xl font-extrabold mt-2 mb-3"
        style={{ fontFamily: 'var(--font-sora)', color: '#1A1A1A' }}
      >
        {title}
      </h3>
      <p className="text-base leading-relaxed" style={{ color: '#6B6B6B' }} dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  )

  const visual = <div className="flex-1">{children}</div>

  return (
    <section className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-14">
      <div className={`flex flex-col md:flex-row gap-8 md:gap-14 items-start ${align === 'right' ? 'md:flex-row-reverse' : ''}`}>
        {textContent}
        {visual}
      </div>
    </section>
  )
}

// ── Rent vs Buy Calculator ──

function RentBuyCalculator() {
  const [rent, setRent] = useState(1500)
  const [price, setPrice] = useState(350000)
  const [deposit, setDeposit] = useState(10)
  const [term, setTerm] = useState(25)

  const loanAmount = price * (1 - deposit / 100)
  const monthlyRate = 0.055 / 12 // 5.5% mortgage rate
  const payments = term * 12
  const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1)

  // Break-even: when total rent paid > total buying cost (mortgage + deposit - equity)
  let breakEvenYears = 0
  const depositAmount = price * (deposit / 100)
  for (let year = 1; year <= 40; year++) {
    const totalRent = rent * 12 * year
    const totalBuying = monthlyMortgage * 12 * year + depositAmount
    if (totalRent > totalBuying) {
      breakEvenYears = year
      break
    }
  }
  if (breakEvenYears === 0) breakEvenYears = 40

  const totalRentAtBreakeven = rent * 12 * breakEvenYears
  const totalBuyingAtBreakeven = monthlyMortgage * 12 * breakEvenYears + depositAmount

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
      <div className="space-y-5">
        <CalcSlider
          label="Monthly rent"
          value={rent}
          min={500}
          max={5000}
          step={50}
          format={(v) => `£${v.toLocaleString()}`}
          onChange={setRent}
        />
        <CalcSlider
          label="Home purchase price"
          value={price}
          min={100000}
          max={1000000}
          step={10000}
          format={(v) => `£${v.toLocaleString()}`}
          onChange={setPrice}
        />
        <CalcSlider
          label="Deposit saved"
          value={deposit}
          min={5}
          max={30}
          step={1}
          format={(v) => `${v}%`}
          onChange={setDeposit}
        />
        {/* Term toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Mortgage term</span>
          </div>
          <div className="flex gap-2">
            {[15, 20, 25, 30].map((t) => (
              <button
                key={t}
                onClick={() => setTerm(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: term === t ? '#BA7517' : '#F5F4F1',
                  color: term === t ? '#fff' : '#6B6B6B',
                  cursor: 'pointer',
                  border: term === t ? '1px solid #BA7517' : '1px solid #E8E3DC',
                }}
              >
                {t} years
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E8E3DC' }}>
        <p
          className="text-3xl font-extrabold text-center"
          style={{ color: '#BA7517', fontFamily: 'var(--font-sora)' }}
        >
          You break even in {breakEvenYears} years
        </p>
        <div className="flex justify-center gap-8 mt-3 text-xs" style={{ color: '#6B6B6B' }}>
          <span>Total rent: £{Math.round(totalRentAtBreakeven).toLocaleString()}</span>
          <span>Total buying: £{Math.round(totalBuyingAtBreakeven).toLocaleString()}</span>
        </div>
      </div>

      <p className="text-[10px] text-center mt-4" style={{ color: '#94918D' }}>
        This calculator was generated automatically inside an Unpacked article.
      </p>
    </div>
  )
}

function CalcSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{label}</span>
        <span className="text-sm font-bold" style={{ color: '#BA7517' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#BA7517]"
        style={{ cursor: 'pointer' }}
      />
      <div className="flex justify-between text-[10px]" style={{ color: '#94918D' }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}
