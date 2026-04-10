import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import SearchForm from '@/components/SearchForm'
import AboutHero from '@/components/about/AboutHero'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { ArticleRow } from '@/types/article'

export const metadata: Metadata = {
  title: 'About Unpacked — Build a researched article in minutes',
  description: 'Build a fully researched, fact-checked article on anything in three minutes. Beautifully structured with images, charts, and real opinions.',
  alternates: { canonical: 'https://unpacked.fyi/about' },
  openGraph: {
    title: 'About Unpacked — Build a researched article in minutes',
    description: 'Build a fully researched, fact-checked article on anything in three minutes. Beautifully structured with images, charts, and real opinions.',
    url: 'https://unpacked.fyi/about',
    siteName: 'Unpacked',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Unpacked' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Unpacked — Build a researched article in minutes',
    description: 'Build a fully researched, fact-checked article on anything in three minutes. Beautifully structured with images, charts, and real opinions.',
    images: ['/og-default.png'],
    site: '@unpacked_fyi',
  },
}

async function getFeaturedArticles(): Promise<ArticleRow[]> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('id, slug, article, view_count, status, verified_at, created_at')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(6)
    return (data ?? []) as ArticleRow[]
  } catch {
    return []
  }
}

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

export default async function AboutPage() {
  const featuredArticles = await getFeaturedArticles()

  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline" style={{ color: '#9E948A' }}>Home</Link>
          <UserMenu />
        </div>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <AboutHero />

      {/* ═══ 2. CHALLENGER LINE ═══ */}
      <section className="w-full py-16" style={{ backgroundColor: '#1A1714' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            We built the interface<br /><span style={{ color: '#BA7517' }}>ChatGPT never did.</span>
          </h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>Same question. Completely different result.</p>
        </div>
      </section>

      {/* ═══ 3. SIDE-BY-SIDE COMPARISON ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.1em' }}>The difference</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>See it for yourself</h2>
        <p className="text-base mb-2 text-center" style={{ color: '#6B6B6B' }}>Ask the same question to ChatGPT and see the difference for yourself.</p>
        <p className="text-sm mb-8 text-center" style={{ color: '#9E948A' }}>Beautifully constructed with images, charts, interactive graphs, and real opinions from real people.</p>

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

          {/* Unpacked panel */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E3DC' }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#FEF3EC', borderBottom: '1px solid #E8E3DC' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#BA7517' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#BA7517' }}>Unpacked</span>
            </div>
            <div className="p-4" style={{ backgroundColor: '#fff' }}>
              <span className="inline-block text-[10px] font-bold uppercase px-2 py-1 rounded mb-2" style={{ backgroundColor: '#BA7517', color: '#fff' }}>Comparison</span>
              <h4 className="text-base font-bold mb-3" style={{ color: '#1A1714' }}>iPhone 17 vs Samsung Galaxy S26</h4>
              <div className="rounded-lg px-3 py-2.5 mb-3" style={{ backgroundColor: '#FEF3EC', borderLeft: '3px solid #BA7517' }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: '#BA7517' }}>Verdict</p>
                <p className="text-sm font-bold" style={{ color: '#1A1714' }}>Get the iPhone 17</p>
                <p className="text-[11px]" style={{ color: '#6B6B6B' }}>Unless you want the best camera zoom, in which case the S26 Ultra edges it.</p>
              </div>
              {[
                { name: 'iPhone 17', badge: 'WINNER', badgeColor: '#BA7517', price: 'From $799', desc: 'Best ecosystem, video, and resale value', img: 'https://m-cdn.phonearena.com/images/article/178493-wide-two_1200/Samsung-Galaxy-S26-Ultra-vs-iPhone-17-Pro-Max-Sample-Photos-Comparison.webp' },
                { name: 'Samsung Galaxy S26', badge: 'BEST ZOOM', badgeColor: '#6B6B6B', price: 'From $799', desc: 'Best camera zoom and display brightness', img: 'https://m-cdn.phonearena.com/images/article/178493-wide-two_1200/Samsung-Galaxy-S26-Ultra-vs-iPhone-17-Pro-Max-Sample-Photos-Comparison.webp' },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-3 rounded-lg p-2.5 mb-2" style={{ border: '1px solid #E8E3DC' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="w-14 h-14 rounded-lg shrink-0 object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold" style={{ color: '#1A1714' }}>{p.name}</span>
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: p.badgeColor, color: '#fff' }}>{p.badge}</span>
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: '#BA7517' }}>{p.price}</p>
                    <p className="text-[10px]" style={{ color: '#6B6B6B' }}>{p.desc}</p>
                  </div>
                </div>
              ))}
              <div className="mb-3 pt-2" style={{ borderTop: '1px solid #F5F4F1' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94918D' }}>Community Preference</p>
                <div className="flex items-center gap-3">
                  <svg width="48" height="48" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#E8E3DC" strokeWidth="4" /><circle cx="18" cy="18" r="14" fill="none" stroke="#BA7517" strokeWidth="4" strokeDasharray="48.4 87.96" strokeDashoffset="22" /><circle cx="18" cy="18" r="14" fill="none" stroke="#94918D" strokeWidth="4" strokeDasharray="33.4 87.96" strokeDashoffset="-26.4" /></svg>
                  <div className="text-[10px] space-y-0.5">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#BA7517' }} /> iPhone 55%</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#94918D' }} /> Samsung 38%</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E8E3DC' }} /> Other 7%</div>
                  </div>
                </div>
              </div>
              <div className="mb-3 pt-2" style={{ borderTop: '1px solid #F5F4F1' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94918D' }}>Head to Head</p>
                {[{ m: 'Camera', i: 72, s: 88 },{ m: 'Battery', i: 78, s: 75 },{ m: 'Display', i: 82, s: 86 },{ m: 'Performance', i: 90, s: 88 },{ m: 'Value', i: 76, s: 80 }].map(r => (
                  <div key={r.m} className="flex items-center gap-1 mb-1.5">
                    <span className="text-[9px] w-[52px] text-right shrink-0" style={{ color: '#94918D' }}>{r.m}</span>
                    <div className="flex-1 flex items-center">
                      <div className="flex-1 flex justify-end"><div className="h-[5px] rounded-l" style={{ width: `${(r.i / Math.max(r.i, r.s)) * 80}%`, backgroundColor: r.i >= r.s ? '#BA7517' : '#D4C9B8' }} /></div>
                      <div style={{ width: '1px', height: '10px', backgroundColor: '#E8E2D9', flexShrink: 0 }} />
                      <div className="flex-1"><div className="h-[5px] rounded-r" style={{ width: `${(r.s / Math.max(r.i, r.s)) * 80}%`, backgroundColor: r.s > r.i ? '#BA7517' : '#D4C9B8' }} /></div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-[9px] mt-1" style={{ color: '#94918D', paddingLeft: '56px' }}><span>iPhone</span><span>Samsung</span></div>
              </div>
              <table className="w-full text-[10px] mb-3" style={{ borderTop: '1px solid #F5F4F1' }}>
                <thead><tr><th /><th className="py-1.5 text-center font-semibold" style={{ color: '#BA7517' }}>iPhone 17</th><th className="py-1.5 text-center font-semibold" style={{ color: '#94918D' }}>Galaxy S26</th></tr></thead>
                <tbody>
                  {[['Camera','48MP','200MP'],['Battery','All day','All day'],['Display','6.3" OLED','6.2" AMOLED'],['Storage','128–512GB','128GB–1TB'],['Price','From $799','From $799']].map(([l,a,b]) => (
                    <tr key={l} style={{ borderTop: '1px solid #F5F4F1' }}><td className="py-1.5" style={{ color: '#6B6B6B' }}>{l}</td><td className="py-1.5 text-center" style={{ color: '#1A1714' }}>{a}</td><td className="py-1.5 text-center" style={{ color: '#1A1714' }}>{b}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-2 mb-3">
                {[{ t: 'Switched from Samsung to iPhone and the ecosystem just works. But I miss the S Pen.', s: 'r/smartphones', c: '#BA7517' },{ t: "The S26 camera in low light is unreal. iPhone still can't touch it for night photos.", s: 'r/Android', c: '#BA7517' },{ t: 'Just got the iPhone 17 and the build quality is insane. Samsung feels like plastic in comparison.', s: '@techreviewer on X', c: '#1DA1F2' }].map((q, i) => (
                  <div key={i} className="pl-3 py-1.5" style={{ borderLeft: `3px solid ${q.c}` }}>
                    <p className="text-[10px] italic" style={{ color: '#1A1714' }}>&ldquo;{q.t}&rdquo;</p>
                    <p className="text-[9px] mt-0.5" style={{ color: q.c }}>— {q.s}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg px-3 py-2 flex items-center gap-1.5" style={{ backgroundColor: '#f0fdf4' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>2 prices verified, all specs confirmed</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: '#94918D' }}>
          Plain text. No images. No data. No verdict. — <span style={{ color: '#BA7517' }}>Visual. Structured. Opinionated. Verified.</span>
        </p>
      </section>

      {/* ═══ 4. HOW IT WORKS ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.1em' }}>How it works</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>Three steps. Three minutes.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>, num: '01', title: 'Ask anything', desc: 'Type any question — a buying decision, a comparison, something you want to understand properly. Any topic, any depth.', tag: 'One sentence from you' },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12l-2-4z"/></svg>, num: '02', title: 'We research', desc: 'We search the live web, Reddit, forums, and expert reviews. Real data, real current prices — not recycled training data from two years ago.', tag: '~3 minutes' },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, num: '03', title: "You're the editor", desc: "We hand you the first draft. Refine the tone, swap images, adjust sections, and publish something that's genuinely yours — under your name.", tag: 'Your article. Your name.' },
          ].map(step => (
            <div key={step.num} className="rounded-xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#BA7517' }}>Step {step.num}</p>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ backgroundColor: '#BA7517' }}>{step.icon}</div>
              <h3 className="text-base font-bold mb-2" style={{ color: '#1A1714' }}>{step.title}</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B6B6B' }}>{step.desc}</p>
              <span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: '#FDF6E9', color: '#BA7517' }}>{step.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 5. WHAT'S INSIDE ═══ */}
      <section className="w-full py-20" style={{ backgroundColor: '#1A1714' }}>
        <div className="max-w-[1060px] mx-auto px-4 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.1em' }}>What&apos;s inside every article</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>The AI builds the draft. You decide what it becomes.</h2>
          <p className="text-base mb-10 text-center max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>Most AI gives you output and walks away. Unpacked hands you a first draft and gives you the tools to make it yours.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: 'Your tone, your voice', desc: 'Casual, formal, or opinionated. One instruction rewrites the whole article to match.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
              { title: 'Your question, your focus', desc: 'Narrow it, broaden it, or take it somewhere new. The article reshapes itself around whatever you ask.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
              { title: 'Your article, your name', desc: 'Refine it, publish it under your name, and share a link that looks like a journalist spent a day on it.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
              { title: 'Triple-verified facts', desc: 'Three independent AI systems check every claim. Corrections are applied automatically. A Verified badge shows readers the article has been checked.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
              { title: 'Real voices from Reddit and X', desc: 'Every article includes what people are actually saying — real threads, real viewpoints, classified by stance. Community sentiment, not generated opinions.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { title: 'Live data, not stale training', desc: 'Polymarket prediction odds, real-time stock prices, Google Trends — current data woven into every article where it matters.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
            ].map(tile => (
              <div key={tile.title} className="rounded-xl p-5" style={{ backgroundColor: '#231F1B', border: '1px solid #2E2925' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(186,117,23,0.12)' }}>{tile.icon}</div>
                <h3 className="text-sm font-bold mb-1.5" style={{ color: '#fff' }}>{tile.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{tile.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. FINAL CTA ═══ */}
      <section className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Your question.<br />The best answer on the internet.<br /><span style={{ color: '#BA7517' }}>Three minutes.</span>
        </h2>
        <p className="text-base mb-8" style={{ color: '#6B6B6B' }}>No credit card. No setup. Just type a question.</p>
        <SearchForm autoFocus={false} />
        <p className="text-sm mt-4" style={{ color: '#9E948A' }}>Give it a try now — it takes three minutes.</p>
      </section>

      {/* ═══ 7. FEATURED ARTICLES ═══ */}
      {featuredArticles.length > 0 && (
        <section className="max-w-[1060px] mx-auto px-4 md:px-6 pb-20">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.1em' }}>From the platform</p>
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>See what others have built.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {featuredArticles.map(row => {
              const art = row.article
              if (!art) return null
              const gradients = ['#2D3A4A,#1A2230','#2D4A3E,#1A2E26','#3A4A2D,#22301A','#4A3A2D,#30221A','#3A2D4A,#221A30','#2D4A4A,#1A3030']
              const grad = gradients[Math.floor(Math.random() * gradients.length)]
              return (
                <Link key={row.id} href={`/article/${row.slug}`} className="rounded-xl overflow-hidden no-underline transition-all hover:shadow-lg" style={{ border: '1px solid #E8E2D9' }}>
                  <div className="h-32 relative overflow-hidden" style={{ background: `linear-gradient(135deg,${grad.split(',')[0]},${grad.split(',')[1]})` }}>
                    {art.thumbnail_url ? (
                      <Image src={art.thumbnail_url} alt="" fill className="object-cover" unoptimized />
                    ) : null}
                  </div>
                  <div className="p-4" style={{ backgroundColor: '#fff' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#BA7517' }}>{TYPE_LABELS[art.article_type] ?? art.article_type}</p>
                    <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-2" style={{ color: '#1A1714' }}>{art.title}</h3>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: '#9E948A' }}>
                      {(row.view_count ?? 0) > 0 && <span>{(row.view_count ?? 0).toLocaleString()} views</span>}
                      {row.verified_at && <span className="flex items-center gap-0.5" style={{ color: '#059669' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>Verified</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-xs" style={{ color: '#94918D', borderTop: '1px solid #E8E2D9' }}>
        <div className="flex items-center justify-center gap-4">
          <Link href="/about" className="no-underline" style={{ color: '#94918D' }}>About</Link>
          <Link href="/creators" className="no-underline" style={{ color: '#94918D' }}>Creators</Link>
          <span>unpacked.fyi</span>
        </div>
      </footer>
    </div>
  )
}
