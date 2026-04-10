import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import Link from 'next/link'
import Image from 'next/image'
import CreatorsCTA from './CreatorsCTA'
import type { Metadata } from 'next'
import type { ArticleRow } from '@/types/article'

export const metadata: Metadata = {
  title: 'For Creators — Unpacked',
  description:
    'Turn your expertise into beautiful, visual, fact-checked articles in minutes. Share them everywhere. Build your reputation.',
  alternates: { canonical: 'https://unpacked.fyi/creators' },
  openGraph: {
    title: 'For Creators — Unpacked',
    description: 'Turn your expertise into beautiful, visual, fact-checked articles in minutes.',
    url: 'https://unpacked.fyi/creators',
    siteName: 'Unpacked',
    type: 'website',
  },
}

async function getCreatorArticles(): Promise<ArticleRow[]> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase')
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('id, slug, article, view_count, status, verified_at, user_name, user_avatar, category')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(6)
    return (data ?? []) as ArticleRow[]
  } catch {
    return []
  }
}

export default async function CreatorsPage() {
  const articles = await getCreatorArticles()

  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline hidden sm:block" style={{ color: '#9E948A' }}>
            Home
          </Link>
          <UserMenu />
        </div>
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#BA7517', letterSpacing: '0.12em' }}>
          For Creators
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-5" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Your expertise.<br />
          <span style={{ color: '#BA7517' }}>Published in minutes.</span>
        </h1>
        <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8" style={{ color: '#6B6B6B' }}>
          Unpacked turns your knowledge into beautifully structured, fact-checked, visual articles. You edit them, publish them under your name, and share them with your audience.
        </p>
        <CreatorsCTA />
      </section>

      {/* ═══ 2. WHAT YOUR ARTICLE LOOKS LIKE — visual mock ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 pb-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-8 text-center" style={{ color: '#BA7517', letterSpacing: '0.12em' }}>
          What you publish
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E2D9', backgroundColor: '#fff' }}>
          {/* Mock article header */}
          <div className="p-6 pb-4" style={{ borderBottom: '1px solid #F0EFED' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: '#E8E2D9' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#1A1714' }}>Your Name</p>
                <p className="text-[10px]" style={{ color: '#9E948A' }}>Published on Unpacked</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0fdf4', color: '#059669' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Verified
              </span>
            </div>
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-1 rounded mb-2" style={{ backgroundColor: '#BA7517', color: '#fff' }}>Buyer Guide</span>
            <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>Best Noise-Cancelling Headphones Under $300</h3>
          </div>

          {/* Mock article body — grid of component previews */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Verdict */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#BA7517' }}>Verdict</p>
              <p className="text-sm font-bold" style={{ color: '#1A1714' }}>Sony WH-1000XM5</p>
              <p className="text-[11px] mt-1" style={{ color: '#6B6B6B' }}>Best overall for daily use, comfort, and sound quality.</p>
            </div>

            {/* Comparison bars */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#FAFAF8', border: '1px solid #E8E2D9' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#94918D' }}>Head to Head</p>
              {[{ m: 'Sound', a: 92, b: 88 }, { m: 'Comfort', a: 90, b: 85 }, { m: 'ANC', a: 88, b: 91 }].map(r => (
                <div key={r.m} className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] w-[40px] text-right shrink-0" style={{ color: '#94918D' }}>{r.m}</span>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 flex justify-end"><div className="h-[5px] rounded-l" style={{ width: `${(r.a / Math.max(r.a, r.b)) * 80}%`, backgroundColor: r.a >= r.b ? '#BA7517' : '#D4C9B8' }} /></div>
                    <div style={{ width: '1px', height: '8px', backgroundColor: '#E8E2D9', flexShrink: 0 }} />
                    <div className="flex-1"><div className="h-[5px] rounded-r" style={{ width: `${(r.b / Math.max(r.a, r.b)) * 80}%`, backgroundColor: r.b > r.a ? '#BA7517' : '#D4C9B8' }} /></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Community sentiment */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#FFF0E6', border: '1px solid #FFD6B8' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#FF4500' }}>Reddit says</p>
              <div className="flex rounded-full overflow-hidden h-2 mb-2" style={{ backgroundColor: '#FFD6B8' }}>
                <div style={{ width: '62%', backgroundColor: '#22C55E' }} className="rounded-l-full" />
                <div style={{ width: '25%', backgroundColor: '#EAB308' }} />
                <div style={{ width: '13%', backgroundColor: '#EF4444' }} className="rounded-r-full" />
              </div>
              <p className="text-[10px] italic" style={{ color: '#6B6B6B' }}>&ldquo;XM5s are unbeatable at this price. Nothing comes close for commuting.&rdquo;</p>
              <p className="text-[9px] mt-1" style={{ color: '#FF4500' }}>— r/headphones</p>
            </div>
          </div>

          {/* Footer strip */}
          <div className="px-6 py-3 flex items-center gap-4 text-[10px]" style={{ backgroundColor: '#FAFAF8', borderTop: '1px solid #F0EFED', color: '#9E948A' }}>
            <span>1,240 views</span>
            <span>14 sections</span>
            <span>3 interactive charts</span>
            <span className="ml-auto" style={{ color: '#059669' }}>Triple fact-checked</span>
          </div>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: '#9E948A' }}>
          Every article you create includes verdicts, comparison charts, community opinions, and verification — automatically.
        </p>
      </section>

      {/* ═══ 3. HOW IT WORKS ═══ */}
      <section className="w-full py-20" style={{ backgroundColor: '#1A1714' }}>
        <div className="max-w-[900px] mx-auto px-4 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.12em' }}>
            How it works
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            Three steps. Three minutes.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Create',
                desc: 'Type your topic. AI researches it across the web, Reddit, and X — then builds a complete visual article with product cards, charts, and editorial photos.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
              },
              {
                num: '02',
                title: 'Edit',
                desc: 'Make it yours. Rewrite sections, swap images, change the verdict, adjust the tone. A full editor gives you complete control before publishing.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
              },
              {
                num: '03',
                title: 'Share',
                desc: 'Get auto-generated social threads for X, LinkedIn, and Reddit. One click to copy. Your name, your article, your audience.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
              },
            ].map(step => (
              <div key={step.num} className="rounded-xl p-6" style={{ backgroundColor: '#231F1B', border: '1px solid #2E2925' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#BA7517' }}>Step {step.num}</p>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#BA7517' }}>{step.icon}</div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. WHAT SETS YOUR ARTICLES APART ═══ */}
      <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.12em' }}>
          What sets your articles apart
        </p>
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Not a blog post. Not a chatbot reply.
        </h2>
        <p className="text-sm mb-10 text-center max-w-xl mx-auto" style={{ color: '#9E948A' }}>
          Every article includes components that would take a human team hours to produce.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: 'Interactive comparison charts', desc: 'Head-to-head bars, spec tables, and scoring breakdowns — generated from real data, not made up.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            { title: 'Reddit & X community insights', desc: 'Real threads, real opinions, classified by viewpoint. Sentiment analysis shows the community split at a glance.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { title: 'Triple fact-check verification', desc: 'Gemini, Claude, and Grok independently verify every claim. Corrections are applied before the article goes live.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
            { title: 'Live market data', desc: 'Polymarket odds, stock prices, and Google Trends woven in automatically where relevant.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
            { title: 'Editorial images throughout', desc: 'Hero photos, product images, and section images sourced from Pexels, Unsplash, and the web — not AI-generated.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
            { title: 'Social threads, ready to post', desc: 'Auto-generated content for X, LinkedIn, and Reddit. Copy and paste. Your article gets seen.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> },
          ].map(tile => (
            <div key={tile.title} className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#FDF6E9' }}>
                {tile.icon}
              </div>
              <h3 className="text-sm font-bold mb-1.5" style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}>{tile.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#9E948A' }}>{tile.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 5. EARN FROM YOUR ARTICLES ═══ */}
      <section className="w-full py-16" style={{ backgroundColor: '#F5F3EF' }}>
        <div className="max-w-[640px] mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5" style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span className="text-[11px] font-semibold" style={{ color: '#BA7517' }}>Coming soon</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
            Earn from every recommendation
          </h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B6B6B' }}>
            Every product recommendation in your articles will carry affiliate links. When readers click through and buy, you earn a share of the commission. Your content, your revenue.
          </p>
          <p className="text-xs" style={{ color: '#9E948A' }}>
            Affiliate integration is in development. Founding Creators will get early access.
          </p>
        </div>
      </section>

      {/* ═══ 6. ARTICLES FROM THE PLATFORM ═══ */}
      {articles.length > 0 && (
        <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-center" style={{ color: '#BA7517', letterSpacing: '0.12em' }}>
            From the platform
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
            See what creators are publishing.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {articles.slice(0, 6).map(row => {
              const art = row.article
              if (!art) return null
              return (
                <Link key={row.id} href={`/article/${row.slug}`} className="rounded-xl overflow-hidden no-underline transition-all hover:shadow-lg" style={{ border: '1px solid #E8E2D9' }}>
                  <div className="h-32 relative overflow-hidden" style={{ backgroundColor: '#E8E2D9' }}>
                    {art.thumbnail_url ? (
                      <Image src={art.thumbnail_url} alt="" fill className="object-cover" unoptimized />
                    ) : null}
                  </div>
                  <div className="p-4" style={{ backgroundColor: '#fff' }}>
                    <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-2" style={{ color: '#1A1714' }}>{art.title}</h3>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: '#9E948A' }}>
                      {row.user_name && <span>{row.user_name}</span>}
                      {(row.view_count ?? 0) > 0 && <span>{(row.view_count ?? 0).toLocaleString()} views</span>}
                      {row.verified_at && (
                        <span className="flex items-center gap-0.5 ml-auto" style={{ color: '#059669' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══ 7. FOUNDING CREATORS ═══ */}
      <section className="w-full py-16" style={{ backgroundColor: '#1A1714' }}>
        <div className="max-w-[640px] mx-auto px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.12em' }}>
            Early access
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            Founding Creators programme
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            The first 100 creators get lifetime perks — higher article limits, early access to affiliate revenue, and a permanent Founding Creator badge on every article.
          </p>
          <Link
            href="/founding-creators"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold no-underline transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#BA7517', color: '#fff' }}
          >
            Learn more
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </section>

      {/* ═══ 8. FINAL CTA ═══ */}
      <section className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Your first article.<br /><span style={{ color: '#BA7517' }}>Three minutes.</span>
        </h2>
        <p className="text-sm mb-8" style={{ color: '#6B6B6B' }}>
          No credit card. No setup. Just type your topic.
        </p>
        <CreatorsCTA />
      </section>

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
