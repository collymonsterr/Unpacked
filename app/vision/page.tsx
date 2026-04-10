import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Unpacked — What We Do',
  robots: { index: false, follow: false },
}

interface FeaturedArticle {
  slug: string
  title: string
  thumbnail_url: string | null
  category: string | null
  article_type: string | null
  card_summary: string | null
  verified: boolean
}

async function getFeaturedArticles(): Promise<FeaturedArticle[]> {
  try {
    const db = getSupabaseAdmin()
    const { data } = await db
      .from('articles')
      .select('slug, article, category, card_summary, verified_at, view_count')
      .in('status', ['complete', 'verified'])
      .eq('visibility', 'published')
      .order('view_count', { ascending: false })
      .limit(6)

    if (!data) return []

    return data
      .filter((r: Record<string, unknown>) => {
        const art = r.article as Record<string, unknown> | null
        return art?.title && art?.thumbnail_url
      })
      .slice(0, 3)
      .map((r: Record<string, unknown>) => {
        const art = r.article as Record<string, unknown>
        return {
          slug: r.slug as string,
          title: art.title as string,
          thumbnail_url: art.thumbnail_url as string,
          category: r.category as string | null,
          article_type: art.article_type as string | null,
          card_summary: r.card_summary as string | null,
          verified: !!(r.verified_at),
        }
      })
  } catch {
    return []
  }
}

function formatCategory(cat: string | null): string {
  if (!cat) return ''
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')
}

export default async function VisionPage() {
  const articles = await getFeaturedArticles()

  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* ── Minimal nav ── */}
      <nav className="flex items-center justify-between px-6 py-5" style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="https://unpacked.fyi" className="no-underline" style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 20, color: '#1A1917', letterSpacing: '-0.02em' }}>
          unpacked
        </a>
      </nav>

      {/* ── Hero ── */}
      <section className="px-6 pt-8 pb-14" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917', letterSpacing: '-0.03em' }}>
          Type a question.<br />
          Get an article worth publishing.
        </h1>
        <p className="text-lg leading-relaxed mb-4" style={{ color: '#6B6966', maxWidth: 640 }}>
          Unpacked turns any question into a complete, researched, fact-checked editorial article in under three minutes. Every article picks a winner. You edit it, publish it under your name, and share it.
        </p>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#94918D', maxWidth: 640 }}>
          Think Wirecutter — but for any topic, produced in minutes instead of weeks, and open to anyone.
        </p>
        <a
          href="https://unpacked.fyi"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold no-underline transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#1A1917', color: '#fff' }}
        >
          Try it now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
        </a>
      </section>

      {/* ── See for yourself — real articles ── */}
      {articles.length > 0 && (
        <section className="px-6 pb-16" style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#94918D', letterSpacing: '0.12em' }}>
            See for yourself
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {articles.map(a => (
              <a
                key={a.slug}
                href={`https://unpacked.fyi/article/${a.slug}`}
                className="group rounded-xl overflow-hidden no-underline transition-shadow hover:shadow-lg"
                style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}
              >
                {a.thumbnail_url && (
                  <div className="relative overflow-hidden" style={{ height: 160 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {a.verified && (
                      <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.9)', color: '#fff' }}>
                        Verified
                      </span>
                    )}
                  </div>
                )}
                <div className="p-4">
                  {a.category && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#BA7517' }}>
                      {formatCategory(a.category)}
                    </p>
                  )}
                  <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>
                    {a.title}
                  </p>
                  {a.card_summary && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#94918D' }}>
                      {a.card_summary}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Divider ── */}
      <div className="px-6" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ height: 1, backgroundColor: '#E8E6E0' }} />
      </div>

      {/* ── What makes it different — 3 things, that's it ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          What makes it different
        </h2>
        <div className="space-y-5">
          <div className="flex gap-5 items-start">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FDF6E9' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold mb-1" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Every article picks a winner</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>
                No hedging. No &ldquo;it depends.&rdquo; Unpacked articles take a position, explain why, and give you a clear verdict. Over 50 banned weasel phrases are enforced so the writing is direct and useful.
              </p>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#EAF3DE' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold mb-1" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Triple fact-checked</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>
                Every article is independently verified by three separate systems. Claims are confirmed, corrections are applied automatically, and a &ldquo;Verified&rdquo; badge shows readers the article has been checked.
              </p>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#F0EFED' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6966" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold mb-1" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Real voices, not generated opinions</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>
                Articles include what people are actually saying on Reddit and X — real threads, real viewpoints, classified by stance. You see genuine community sentiment, not AI-generated summaries of nothing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="px-6" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ height: 1, backgroundColor: '#E8E6E0' }} />
      </div>

      {/* ── What creators get ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          Publish under your name
        </h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#6B6966', maxWidth: 580 }}>
          You&apos;re not using a tool — you&apos;re publishing on a platform. The research is done, the fact-check is done, and you have full editorial control before anything goes live.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
            <p className="text-sm font-semibold mb-1.5" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Edit everything</p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>
              Rewrite sections, swap images, change the verdict, reorder content. Every article is yours to shape.
            </p>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
            <p className="text-sm font-semibold mb-1.5" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Share everywhere</p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>
              Auto-generated social threads for X, LinkedIn, and Reddit. One click to copy. Your name, your article.
            </p>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
            <p className="text-sm font-semibold mb-1.5" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Earn from it</p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>
              Product recommendations in your articles earn affiliate commission. Your content, your revenue.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pt-4 pb-20" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#1A1917' }}>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            The fastest way to publish<br className="hidden md:inline" /> something worth reading
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#94918D', maxWidth: 440, margin: '0 auto' }}>
            Type any question. Get a researched, fact-checked article. Edit it, publish it, share it.
          </p>
          <a
            href="https://unpacked.fyi"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold no-underline transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#BA7517', color: '#fff' }}
          >
            Try Unpacked
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-6 text-center" style={{ borderTop: '1px solid #E8E6E0' }}>
        <p className="text-xs" style={{ color: '#94918D' }}>
          unpacked.fyi
        </p>
      </footer>
    </div>
  )
}
