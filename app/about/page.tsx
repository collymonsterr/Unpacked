import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import SearchForm from '@/components/SearchForm'
import QuickVerdict from '@/components/sections/QuickVerdict'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { ArticleRow } from '@/types/article'

export const metadata: Metadata = {
  title: 'About Unpacked — Build a researched article in three minutes',
  description: 'We built the interface ChatGPT never did. Structured, visual, opinionated articles with real research and independent fact-checking.',
}

async function getFeaturedArticles(): Promise<ArticleRow[]> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('id, slug, article, view_count, status, verified_at, created_at')
      .in('status', ['complete', 'verified'])
      .order('view_count', { ascending: false })
      .limit(6)
    return (data ?? []) as ArticleRow[]
  } catch {
    return []
  }
}

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buying Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', news: 'News', planning: 'Travel & Living',
  trend_analysis: 'Trend Analysis', tutorial: 'Tutorial',
}

export default async function AboutPage() {
  const featuredArticles = await getFeaturedArticles()

  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline" style={{ color: '#94918D' }}>Home</Link>
          <UserMenu />
        </div>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Build a fully<br />researched,<br />fact-checked article<br /><span style={{ color: '#BA7517' }}>in three minutes.</span>
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#6B6B6B' }}>
          Beautifully structured with images, interactive charts, and real opinions from real people — all collated into one polished article you can share.
        </p>
        <Link href="/" className="inline-block px-7 py-3 rounded-xl text-base font-semibold no-underline" style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}>
          Generate your first article →
        </Link>
      </section>

      {/* ═══ 2. CHALLENGER LINE ═══ */}
      <section className="w-full py-16" style={{ backgroundColor: '#1A1714' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            We built the interface<br /><span style={{ color: '#BA7517' }}>ChatGPT never did.</span>
          </h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>Same question. Completely different result.</p>
        </div>
      </section>

      {/* ═══ 3. PROBLEM GRID ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Every AI answer looks the same.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[700px] mx-auto">
          {[
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9E948A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>, title: 'Wall of text', desc: '800 words of plain text. No images, no structure, no design. It looks like an email.' },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9E948A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, title: 'Generic generated output', desc: "Every AI writes the same thing. Safe, bland, forgettable, and won't pick a winner. You've read it a hundred times." },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9E948A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, title: 'Unverified and unchecked', desc: "The AI states prices and facts confidently. Are they real? Are they current? It won't tell you — and it won't check for you." },
            { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9E948A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 21V14l4-4 4 4v7"/><circle cx="16" cy="8" r="2"/><line x1="2" y1="2" x2="22" y2="22"/></svg>, title: 'Useless images', desc: "You might get a random thumbnail at the top. Not beautiful, not relevant, not something you'd want to share." },
          ].map((tile) => (
            <div key={tile.title} className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
              <div className="w-9 h-9 flex items-center justify-center mb-3">{tile.icon}</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: '#1A1714' }}>{tile.title}</h3>
              <p className="text-sm" style={{ color: '#6B6B6B' }}>{tile.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 4. PIVOT HEADING ═══ */}
      <section className="text-center py-16 px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          So we built<br /><span style={{ color: '#BA7517' }}>something different.</span>
        </h2>
        <p className="text-lg" style={{ color: '#6B6B6B' }}>The research done. The structure built. The answer given. In three minutes.</p>
      </section>

      {/* ═══ 5. SIDE-BY-SIDE COMPARISON ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.1em' }}>The difference</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>See it for yourself</h2>
        <p className="text-base mb-8 text-center" style={{ color: '#6B6B6B' }}>Ask the same question to ChatGPT and to Unpacked. This is what you get.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ChatGPT panel */}
          <div className="rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid #E8E3DC' }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#f5f5f4', borderBottom: '1px solid #E8E3DC' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#94918D' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94918D' }}>Typical AI Response</span>
            </div>
            <div className="p-5 text-sm leading-relaxed flex-1" style={{ backgroundColor: '#fff', color: '#6B6B6B' }}>
              <p className="mb-3">Great question! Both the <strong>iPhone 17</strong> and the <strong>Samsung Galaxy S26</strong> are excellent flagship smartphones. Here&apos;s a comparison to help you decide: 📱</p>
              <p className="mb-3"><strong>iPhone 17</strong> — Apple&apos;s latest flagship features the A19 Pro chip, a 48MP main camera with improved computational photography, and the familiar iOS ecosystem. It offers excellent performance, strong privacy features, and seamless integration with other Apple devices like MacBooks, AirPods, and Apple Watch. The build quality is premium with a titanium frame and ceramic shield front. ✅</p>
              <p className="mb-3"><strong>Samsung Galaxy S26</strong> — Samsung&apos;s flagship comes with the Snapdragon 8 Elite Gen 2 processor, a versatile triple camera system with a 200MP main sensor, and a stunning Dynamic AMOLED display. Galaxy AI features are deeply integrated, and the phone offers more customisation options than iOS. The S26 Ultra model adds an S Pen and a 5x optical zoom camera. 📸</p>
              <p className="mb-3"><strong>Key differences:</strong> The iPhone excels in video recording, app optimisation, and ecosystem integration. The Galaxy S26 offers more camera flexibility (especially zoom), a brighter display, and more storage options. Both have similar battery life, though the S26 charges slightly faster. 🔋</p>
              <p className="mb-3"><strong>Pricing:</strong> The iPhone 17 starts at around $799 for the base model and goes up to $1,199 for the Pro Max. The Galaxy S26 starts at $799 and the Ultra goes up to $1,299. Both phones are available on most major carriers with trade-in deals. 💰</p>
              <p className="mt-4 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#dc2626' }}>Ultimately, the best phone for you <strong>depends on your personal preferences</strong> and which ecosystem you&apos;re already invested in. 😊</p>
              <p className="mt-3">You might also want to consider what accessories you&apos;ll need — a good case ($20–60), screen protector ($10–30), and possibly wireless earbuds if you don&apos;t already have them. Both phones support fast charging, but you&apos;ll need to buy a charger separately as neither includes one in the box.</p>
            </div>
          </div>

          {/* Unpacked panel — full recreation matching the mockup */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E3DC' }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#FEF3EC', borderBottom: '1px solid #E8E3DC' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#BA7517' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#BA7517' }}>Unpacked</span>
            </div>
            <div className="p-4" style={{ backgroundColor: '#fff' }}>
              {/* Comparison chip */}
              <span className="inline-block text-[10px] font-bold uppercase px-2 py-1 rounded mb-2" style={{ backgroundColor: '#BA7517', color: '#fff' }}>Comparison</span>
              <h4 className="text-base font-bold mb-3" style={{ color: '#1A1714' }}>iPhone 17 vs Samsung Galaxy S26</h4>

              {/* Verdict box */}
              <div className="rounded-lg px-3 py-2.5 mb-3" style={{ backgroundColor: '#FEF3EC', borderLeft: '3px solid #BA7517' }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: '#BA7517' }}>Verdict</p>
                <p className="text-sm font-bold" style={{ color: '#1A1714' }}>Get the iPhone 17</p>
                <p className="text-[11px]" style={{ color: '#6B6B6B' }}>Unless you want the best camera zoom, in which case the S26 Ultra edges it.</p>
              </div>

              {/* Two product rows */}
              {[
                { name: 'iPhone 17', badge: 'WINNER', badgeColor: '#BA7517', price: 'From $799', desc: 'Best ecosystem, video, and resale value', img: 'https://m-cdn.phonearena.com/images/article/178493-wide-two_1200/Samsung-Galaxy-S26-Ultra-vs-iPhone-17-Pro-Max-Sample-Photos-Comparison.webp', alt: 'iPhone 17' },
                { name: 'Samsung Galaxy S26', badge: 'BEST ZOOM', badgeColor: '#6B6B6B', price: 'From $799', desc: 'Best camera zoom and display brightness', img: 'https://m-cdn.phonearena.com/images/article/178493-wide-two_1200/Samsung-Galaxy-S26-Ultra-vs-iPhone-17-Pro-Max-Sample-Photos-Comparison.webp', alt: 'Samsung Galaxy S26' },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-3 rounded-lg p-2.5 mb-2" style={{ border: '1px solid #E8E3DC' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.alt} className="w-14 h-14 rounded-lg shrink-0 object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold" style={{ color: '#1A1714' }}>{p.name}</span>
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: p.badgeColor === '#BA7517' ? '#BA7517' : '#6B6B6B', color: '#fff' }}>{p.badge}</span>
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: '#BA7517' }}>{p.price}</p>
                    <p className="text-[10px]" style={{ color: '#6B6B6B' }}>{p.desc}</p>
                  </div>
                </div>
              ))}

              {/* Community preference */}
              <div className="mb-3 pt-2" style={{ borderTop: '1px solid #F5F4F1' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94918D' }}>Community Preference</p>
                <div className="flex items-center gap-3">
                  {/* Donut chart */}
                  <svg width="48" height="48" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#E8E3DC" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#BA7517" strokeWidth="4" strokeDasharray="48.4 87.96" strokeDashoffset="22" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#94918D" strokeWidth="4" strokeDasharray="33.4 87.96" strokeDashoffset="-26.4" />
                  </svg>
                  <div className="text-[10px] space-y-0.5">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#BA7517' }} /> iPhone 55%</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#94918D' }} /> Samsung 38%</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8E3DC' }} /> Other 7%</div>
                  </div>
                </div>
              </div>

              {/* Head to Head bars */}
              <div className="mb-3 pt-2" style={{ borderTop: '1px solid #F5F4F1' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94918D' }}>Head to Head</p>
                {[
                  { metric: 'Camera', iphone: 75, samsung: 90 },
                  { metric: 'Battery', iphone: 85, samsung: 80 },
                  { metric: 'Display', iphone: 80, samsung: 85 },
                  { metric: 'Performance', iphone: 92, samsung: 78 },
                  { metric: 'Value', iphone: 82, samsung: 88 },
                ].map(row => (
                  <div key={row.metric} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] w-16 text-right shrink-0" style={{ color: '#94918D' }}>{row.metric}</span>
                    <div className="flex-1 flex gap-0.5">
                      <div className="h-2 rounded-l" style={{ width: `${row.iphone}%`, backgroundColor: row.iphone >= row.samsung ? '#BA7517' : '#E8E3DC' }} />
                      <div className="h-2 rounded-r" style={{ width: `${row.samsung}%`, backgroundColor: row.samsung > row.iphone ? '#BA7517' : '#E8E3DC' }} />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-[9px] mt-1 px-[72px]" style={{ color: '#94918D' }}><span>iPhone</span><span>Samsung</span></div>
              </div>

              {/* Specs table */}
              <table className="w-full text-[10px] mb-3" style={{ borderTop: '1px solid #F5F4F1' }}>
                <thead>
                  <tr><th /><th className="py-1.5 text-center font-semibold" style={{ color: '#BA7517' }}>iPhone 17</th><th className="py-1.5 text-center font-semibold" style={{ color: '#94918D' }}>Galaxy S26</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Camera', '48MP', '200MP'],
                    ['Battery', 'All day', 'All day'],
                    ['Display', '6.3" OLED', '6.2" AMOLED'],
                    ['Storage', '128–512GB', '128GB–1TB'],
                    ['Price', 'From $799', 'From $799'],
                  ].map(([label, iphone, samsung]) => (
                    <tr key={label} style={{ borderTop: '1px solid #F5F4F1' }}>
                      <td className="py-1.5" style={{ color: '#6B6B6B' }}>{label}</td>
                      <td className="py-1.5 text-center" style={{ color: '#1A1714' }}>{iphone}</td>
                      <td className="py-1.5 text-center" style={{ color: '#1A1714' }}>{samsung}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Quote cards */}
              <div className="space-y-2 mb-3">
                {[
                  { text: 'Switched from Samsung to iPhone and the ecosystem just works. But I miss the S Pen.', source: 'r/smartphones', color: '#BA7517' },
                  { text: "The S26 camera in low light is unreal. iPhone still can't touch it for night photos.", source: 'r/Android', color: '#BA7517' },
                  { text: 'Just got the iPhone 17 and the build quality is insane. Samsung feels like plastic in comparison.', source: '@techreviewer on X', color: '#1DA1F2' },
                ].map((q, i) => (
                  <div key={i} className="pl-3 py-1.5" style={{ borderLeft: `3px solid ${q.color}` }}>
                    <p className="text-[10px] italic" style={{ color: '#1A1714' }}>&ldquo;{q.text}&rdquo;</p>
                    <p className="text-[9px] mt-0.5" style={{ color: q.color }}>— {q.source}</p>
                  </div>
                ))}
              </div>

              {/* Fact-check bar */}
              <div className="rounded-lg px-3 py-2 flex items-center gap-1.5" style={{ backgroundColor: '#f0fdf4' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>2 prices verified, all specs confirmed</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: '#94918D' }}>
          Plain text. No images. No data. No verdict. — <span style={{ color: '#BA7517' }}>Visual. Structured. Opinionated. Fact-checked.</span>
        </p>
      </section>

      {/* ═══ 6. HOW IT WORKS ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>, num: '01', title: 'Ask anything', desc: 'Type any question — a buying decision, a comparison, something you want to understand properly. Any topic, any depth.', tag: 'One sentence from you' },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3h-8l-2 4h12l-2-4z"/></svg>, num: '02', title: 'We research', desc: 'We search the live web, Reddit, forums, and expert reviews. Real data, real current prices — not recycled training data from two years ago.', tag: '~2 minutes' },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, num: '03', title: "You're the editor", desc: "We hand you the first draft. Refine the tone, swap images, adjust sections, and publish something that's genuinely yours — under your name.", tag: 'Your article. Your voice.' },
          ].map((step) => (
            <div key={step.num} className="text-center md:text-left relative">
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center mx-auto md:mx-0 mb-4" style={{ backgroundColor: '#BA7517' }}>
                {step.icon}
              </div>
              <span className="text-[10px] font-bold absolute top-0 right-0 md:right-auto md:left-14" style={{ color: '#BA7517' }}>Step {step.num}</span>
              <h3 className="text-lg font-bold mt-1 mb-2" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>{step.title}</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B6B6B' }}>{step.desc}</p>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}>{step.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 7. FEATURE BLOCKS ═══ */}

      {/* Feature 01 — Verdict */}
      <FeatureBlock num="01" title="A clear verdict. Every time." align="left" bullets={['Every article picks a winner and tells you why', 'No hedging, no "it depends on your preference"', 'Written like a senior product journalist']}>
        <div className="rounded-2xl overflow-hidden p-4 md:p-6" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
          <QuickVerdict data={{
            bullets: [
              'Sony A7C II ($2,199) wins for everyday versatility — best autofocus, lightest body, and superb video in one package',
              'Fujifilm X-T5 ($1,699) is the pick for photographers who prioritise image quality and film simulations over video features',
              'Both outperform the Canon R8 on value — the R8 costs more and delivers less in every category except low-light AF'
            ],
            one_liner: 'The Sony A7C II is the best all-round mirrorless camera under $2,500 for hybrid shooters.'
          }} />
        </div>
      </FeatureBlock>

      {/* Feature 02 — Product Cards */}
      <FeatureBlock num="02" title="Real product cards, automatically sourced." align="right" bullets={['Real images from retailers and review sites', 'Prices verified against live sources', 'Specs, pros/cons, and editorial opinion per product']}>
        <div className="space-y-4">
          {[
            { name: 'ASICS Gel-Contend 8', price: '$85', tag: 'THE CONSENSUS PICK — BEST DAILY TRAINER UNDER $160', img: 'https://m.media-amazon.com/images/I/51+DIIlx2CL.jpg', specs: 'Drop: 10mm · Weight: 295g · Foam: Gel + EVA · Best for: Daily training', links: ['Check on Zappos →', 'Read on RunRepeat →'] },
            { name: 'Nike Revolution 7', price: '$70', tag: 'BEST VALUE — UNBEATABLE AT $70', img: 'https://images-na.ssl-images-amazon.com/images/I/71CyTI7k6rL.jpg', specs: 'Drop: 10mm · Weight: Lightweight · Foam: Nike foam · Best for: Beginners', links: ['Nike Official Store →', 'Running Shoes Guru Review →'] },
          ].map(p => (
            <div key={p.name} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}>{p.tag}</div>
              <div className="p-4 flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.name} className="w-16 h-16 rounded-lg shrink-0 object-contain" style={{ backgroundColor: '#fff' }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold" style={{ color: '#1A1714' }}>{p.name}</h4>
                    <span className="text-base font-bold" style={{ color: '#BA7517' }}>{p.price}</span>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: '#6B6B6B' }}>{p.specs}</p>
                  <div className="flex gap-3">
                    {p.links.map(link => (
                      <span key={link} className="text-[10px] font-medium" style={{ color: '#BA7517' }}>{link}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FeatureBlock>

      {/* Feature 03 — Comparison Table */}
      <FeatureBlock num="03" title="Interactive charts and comparison tables — generated automatically." align="left" bullets={['Performance ratings across key metrics', 'Winner highlighted per category', 'Data sourced from real benchmarks and reviews']}>
        <div className="rounded-2xl p-4 md:p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
          <table className="w-full text-xs">
            <thead>
              <tr><th className="text-left pb-3 font-semibold" style={{ color: '#94918D' }}>Metric</th><th className="pb-3 font-semibold text-center" style={{ color: '#1A1714' }}>Sony A7C II</th><th className="pb-3 font-semibold text-center" style={{ color: '#1A1714' }}>Fujifilm X-T5</th><th className="pb-3 font-semibold text-center" style={{ color: '#1A1714' }}>Canon R8</th></tr>
            </thead>
            <tbody>
              {[
                { metric: 'Autofocus', scores: [95, 82, 88] },
                { metric: 'Image Quality', scores: [90, 94, 86] },
                { metric: 'Video', scores: [92, 75, 80] },
                { metric: 'Value', scores: [88, 91, 72] },
                { metric: 'Portability', scores: [93, 85, 90] },
              ].map(row => {
                const max = Math.max(...row.scores)
                return (
                  <tr key={row.metric} style={{ borderTop: '1px solid #F5F4F1' }}>
                    <td className="py-2 font-medium" style={{ color: '#6B6B6B' }}>{row.metric}</td>
                    {row.scores.map((s, i) => (
                      <td key={i} className="py-2 px-1">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F5F4F1' }}>
                            <div className="h-full rounded-full" style={{ width: `${s}%`, backgroundColor: s === max ? '#BA7517' : '#D3D1C7' }} />
                          </div>
                          <span className="font-semibold" style={{ color: s === max ? '#BA7517' : '#94918D' }}>{s}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-[10px] mt-3" style={{ color: '#94918D' }}>Scores from DXOMARK, DPReview, and expert consensus — verified March 2026</p>
        </div>
      </FeatureBlock>

      {/* Feature 04 — Community */}
      <FeatureBlock num="04" title="What real people are actually saying. Right now." align="right" bullets={['Direct quotes from Reddit, Twitter/X, and forums', 'Sentiment analysis across hundreds of discussions', 'Links to original threads so you can verify']}>
        <div className="space-y-3">
          {[
            { text: "Switched from petrol to EV six months ago. Fuel savings alone cover the higher payment. No regrets.", source: 'r/electricvehicles', border: '#BA7517' },
            { text: "The charging infrastructure outside cities is still terrible. Two failed stations on my last road trip.", source: 'r/cars', border: '#BA7517' },
            { text: "Just did the math — my Model 3 costs 3p/mile vs 15p/mile for my old Golf. It's not even close.", source: '@evowner_uk', border: '#1DA1F2' },
          ].map((q, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
              <div className="pl-3 py-1" style={{ borderLeft: `3px solid ${q.border}` }}>
                <p className="text-sm italic mb-1" style={{ color: '#1A1714' }}>&ldquo;{q.text}&rdquo;</p>
                <p className="text-xs" style={{ color: q.border === '#1DA1F2' ? '#1DA1F2' : '#BA7517' }}>{q.source}</p>
              </div>
            </div>
          ))}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B6B6B' }}>Community sentiment across 1,240 discussions</p>
            <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#F5F4F1' }}>
              <div style={{ width: '67%', backgroundColor: '#BA7517' }} />
              <div style={{ width: '28%', backgroundColor: '#D4A843' }} />
              <div style={{ width: '5%', backgroundColor: '#D3D1C7' }} />
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: '#6B6B6B' }}>
              <span>Pro-EV 67%</span><span>Sceptical 28%</span><span>Neutral 5%</span>
            </div>
          </div>
        </div>
      </FeatureBlock>

      {/* Feature 05 — Image Control */}
      <FeatureBlock num="05" title="You control the images." align="left" bullets={['Search for better photos from the web', 'Upload your own images', 'Every image in the article is replaceable']}>
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-lg flex items-center justify-center text-xs" style={{
                backgroundColor: i === 1 ? '#FEF3EC' : '#F5F4F1',
                border: i === 1 ? '2px solid #BA7517' : '1px solid #E8E3DC',
                color: i === 1 ? '#BA7517' : '#94918D',
              }}>
                {i === 1 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                {i === 1 ? ' Selected' : `Option ${i}`}
              </div>
            ))}
          </div>
          <div className="rounded-lg py-6 text-center text-xs" style={{ border: '2px dashed #E8E3DC', color: '#94918D' }}>📁 Or upload your own image</div>
        </div>
      </FeatureBlock>

      {/* Feature 06 — Fact-checking */}
      <FeatureBlock num="06" title="A dedicated fact-checking AI. Not an afterthought." align="right" bullets={['A completely separate AI verifies every claim', 'Prices, specs, and statistics cross-referenced against live sources', 'Corrections applied automatically — you see exactly what changed']}>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E3DC', backgroundColor: '#fff' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #E8E3DC', backgroundColor: '#f0fdf4' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span className="text-sm font-semibold" style={{ color: '#059669' }}>Fact-check complete — 3 corrections applied</span>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div><p className="line-through mb-0.5" style={{ color: '#dc2626', opacity: 0.6 }}>Federal tax credit of $7,500 applies to all EVs</p><p style={{ color: '#059669' }}>Tax credit eligibility depends on manufacturer caps — Tesla and GM vehicles may not qualify</p></div>
            <div><p className="line-through mb-0.5" style={{ color: '#dc2626', opacity: 0.6 }}>Average electricity cost: $0.10/kWh</p><p style={{ color: '#059669' }}>US average is $0.16/kWh as of March 2026 (EIA data)</p></div>
            <div><p className="mb-0.5" style={{ color: '#059669' }}>✓ Range claims for all 5 models verified against EPA ratings — all accurate</p></div>
          </div>
          <div className="px-4 py-2.5 text-xs" style={{ backgroundColor: '#FEF3EC', color: '#993C1D' }}>A separate AI. A full verification pass. Every article. Not optional.</div>
        </div>
      </FeatureBlock>

      {/* ═══ 8. FIRST DRAFT BANNER FEATURE ═══ */}
      <section className="py-16" style={{ backgroundColor: '#FEF3EC' }}>
        <div className="max-w-[1060px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#BA7517' }}>Feature 07</span>
              <h3 className="text-2xl md:text-3xl font-extrabold mt-2 mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
                Your first draft banner. The editing starts here.
              </h3>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#6B6B6B' }}>
                The moment your article is ready, a banner slides up with everything you need to start editing. Pre-written prompts, one-click actions, and your fact-check results — all in one place.
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#6B6B6B' }}>
                {['Four action chips that pre-fill the refine box', 'Fact-check corrections shown inline', 'Share or start editing in one click', 'Dismisses to a floating pill — always accessible'].map(item => (
                  <li key={item} className="flex items-start gap-2"><span style={{ color: '#BA7517' }}>→</span>{item}</li>
                ))}
              </ul>
            </div>
            {/* FDB recreation */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3EC' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <span className="text-sm font-bold" style={{ color: '#1A1714' }}>Your first draft is complete — now you&apos;re the editor</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>✓ 10 corrections applied</span>
              </div>
              <p className="text-xs mb-3" style={{ color: '#6B6B6B' }}>We did the research, built the structure, and fact-checked the claims.</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {['✍️ Change the tone', '🔄 Swap products', '🖼️ Update the images', '✂️ Rewrite any section'].map((chip, i) => (
                  <div key={chip} className="rounded-lg p-2 text-xs text-center" style={{ backgroundColor: i === 2 ? '#FEF3EC' : '#FAFAF8', border: `1px solid ${i === 2 ? '#BA7517' : '#E8E3DC'}`, color: '#1A1714' }}>{chip}</div>
                ))}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="px-3 py-1.5 rounded-lg text-xs" style={{ border: '1px solid #E8E3DC', color: '#6B6B6B' }}>Share it</span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#BA7517', color: '#fff' }}>Start editing →</span>
              </div>
              <p className="text-[10px] text-right mt-1" style={{ color: '#94918D' }}>Your article is live — share the link whenever you&apos;re ready</p>
              <div className="mt-3 pt-2 flex items-center gap-1 text-[10px]" style={{ borderTop: '1px solid #E8E3DC', color: '#059669' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Fact-check complete — 10 corrections applied
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 9. ARTICLE TYPES ═══ */}
      <section className="w-full py-20" style={{ backgroundColor: '#1A1714' }}>
        <div className="max-w-[1060px] mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>The article shapes itself around the question.</h2>
          <p className="text-base text-center mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>A buyer guide generates different components to an explainer. The structure adapts to the question.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: "Buyer's Guide", example: 'Best standing desks for home offices', items: ['Product cards with specs', 'Comparison table', 'Clear verdict', 'Price tracking'] },
              { type: 'Comparison', example: 'Tesla Model 3 vs BMW i4', items: ['Head-to-head table', 'Winner per category', 'Community sentiment', 'Overall verdict'] },
              { type: 'Explainer', example: 'How does compound interest work?', items: ['Visual breakdowns', 'Worked examples', 'Interactive calculator', 'Key takeaways'] },
              { type: 'Trend Analysis', example: 'State of AI in 2026', items: ['Data charts', 'Rankings', 'Expert quotes', 'Source citations'] },
              { type: 'Decision Guide', example: 'Should I rent or buy?', items: ['Scenario calculator', 'Pros/cons analysis', 'Expert opinion', 'Community data'] },
              { type: 'Roundup', example: 'Best cities for remote workers', items: ['Ranked list', 'Key stats per entry', 'Cost comparison', 'Community tips'] },
              { type: 'News & Analysis', example: 'What happened with tariffs?', items: ['Timeline', 'Expert analysis', 'Impact assessment', 'Source links'] },
              { type: 'Finance', example: 'How to budget on $4k/month', items: ['Budget calculator', 'Savings projections', 'Interactive charts', 'Action steps'] },
            ].map(card => (
              <div key={card.type} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#BA7517' }}>{card.type}</p>
                <p className="text-sm font-semibold mb-3 leading-snug" style={{ color: '#fff' }}>{card.example}</p>
                <ul className="space-y-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {card.items.map(item => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 10. SOCIAL PROOF BAR ═══ */}
      <section className="w-full py-12" style={{ backgroundColor: '#BA7517' }}>
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-extrabold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>
              {/* PLACEHOLDER — replace with real number from database */}100+
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>Articles generated</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>
              {/* PLACEHOLDER — replace with real number from database */}94%
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>Fact-check pass rate</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>
              {/* PLACEHOLDER — replace with real number from database */}~2 min
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>Average generation time</p>
          </div>
        </div>
      </section>

      {/* ═══ 12. FINAL CTA ═══ */}
      <section className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Your question.<br />A complete article.<br /><span style={{ color: '#BA7517' }}>Three minutes.</span>
        </h2>
        <p className="text-base mb-8" style={{ color: '#6B6B6B' }}>No credit card. No setup. Just type a question.</p>
        <SearchForm autoFocus={false} />
      </section>

      {/* ═══ FEATURED ARTICLES GRID (below CTA) ═══ */}
      {featuredArticles.length > 0 && (
        <section className="max-w-[1060px] mx-auto px-4 md:px-6 pb-20">
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>See what people are reading</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredArticles.map((row) => {
              const art = row.article
              if (!art) return null
              return (
                <Link key={row.id} href={`/article/${row.slug}`} className="rounded-xl overflow-hidden no-underline transition-transform hover:scale-[1.02]" style={{ backgroundColor: '#fff', border: '1px solid #E8E3DC' }}>
                  <div className="h-40 relative" style={{ background: art.thumbnail_url ? `url(${art.thumbnail_url}) center/cover` : 'linear-gradient(135deg, #FEF3EC, #BA7517)' }}>
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#BA7517' }}>{TYPE_LABELS[art.article_type] ?? art.article_type}</p>
                    <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-2" style={{ color: '#1A1714' }}>{art.title}</h3>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: '#94918D' }}>
                      {(row.view_count ?? 0) > 0 && <span>{(row.view_count ?? 0).toLocaleString()} views</span>}
                      {row.verified_at && <span className="flex items-center gap-0.5" style={{ color: '#059669' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>Fact-checked
                      </span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

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

function FeatureBlock({ num, title, align, bullets, children }: {
  num: string; title: string; align: 'left' | 'right'; bullets: string[]; children: React.ReactNode
}) {
  return (
    <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-10 md:py-14" style={{ borderBottom: '1px solid #E8E3DC' }}>
      <div className={`flex flex-col md:flex-row gap-8 md:gap-14 items-start ${align === 'right' ? 'md:flex-row-reverse' : ''}`}>
        <div className="flex-1">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#BA7517' }}>Feature {num}</span>
          <h3 className="text-2xl md:text-3xl font-extrabold mt-2 mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>{title}</h3>
          <ul className="space-y-2 text-sm" style={{ color: '#6B6B6B' }}>
            {bullets.map(b => <li key={b} className="flex items-start gap-2"><span style={{ color: '#BA7517' }}>→</span>{b}</li>)}
          </ul>
        </div>
        <div className="flex-1 w-full">{children}</div>
      </div>
    </section>
  )
}
