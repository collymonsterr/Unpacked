import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'

export const metadata: Metadata = {
  title: 'Updates — Unpacked',
  description: 'What\'s new on Unpacked — recent changes, new features, and improvements.',
  alternates: { canonical: 'https://unpacked.fyi/updates' },
}

const updates = [
  {
    date: 'March 2026',
    version: 'Spring update',
    items: [
      {
        tag: 'New',
        title: 'Article visibility — private, unlisted, and published',
        body: 'New articles start private by default. Publish to the homepage when you\'re ready, or share via link only (unlisted). The gear menu on every article gives you instant control.',
      },
      {
        tag: 'New',
        title: 'How it works page',
        body: 'A full walkthrough of the Unpacked pipeline — from research to writing to fact-checking — now lives at /how-it-works.',
      },
      {
        tag: 'Improved',
        title: 'Generation timeout handling',
        body: 'Deep research articles occasionally take longer than three minutes. The article page now keeps checking in the background and appears automatically when ready — no need to refresh.',
      },
      {
        tag: 'Improved',
        title: 'Admin article controls',
        body: 'The gear menu on each article now includes a visibility selector directly in the dropdown — switch between Private, Unlisted, and Published in one click.',
      },
    ],
  },
  {
    date: 'March 25 2026',
    version: 'Rebrand',
    items: [
      {
        tag: 'New',
        title: 'Unpacked — new name, same platform',
        body: 'ArticleAI is now Unpacked (unpacked.fyi). The name change reflects what the platform actually does: it unpacks complex questions into clear, opinionated articles. All URLs, metadata, and structured data updated.',
      },
      {
        tag: 'New',
        title: 'Featured and Trending pools',
        body: 'The homepage now rotates across a curated pool of featured and trending articles rather than showing the same ones every visit.',
      },
      {
        tag: 'New',
        title: 'Reddit community section',
        body: 'Articles now include real Reddit threads, direct quotes, and subreddit links — so you can see what the community actually thinks about the topic.',
      },
      {
        tag: 'Improved',
        title: 'Hero image quality',
        body: 'The planning step now produces a dedicated image search query for each article, resulting in hero photos that actually match the topic rather than generic stock.',
      },
    ],
  },
  {
    date: 'Early 2026',
    version: 'Foundation',
    items: [
      {
        tag: 'New',
        title: 'Brave Search research pipeline',
        body: 'Every article now begins with live web research — 4 to 10 targeted searches, structured into a research summary before writing begins. Articles cite real, current sources.',
      },
      {
        tag: 'New',
        title: 'Automatic fact-checking',
        body: 'A second AI independently fact-checks every price, spec, and claim after the article is written. Corrections are applied automatically. Articles are marked Verified when complete.',
      },
      {
        tag: 'New',
        title: 'Article type classification',
        body: 'The platform now classifies every query into one of seven article types before writing begins — Comparison, Buyer Guide, Explainer, Decision Guide, Tutorial, News, or Trend Analysis — and structures the article accordingly.',
      },
      {
        tag: 'New',
        title: 'Creator profiles',
        body: 'Every article carries its creator\'s name. Author profile pages show all published articles from a single creator.',
      },
    ],
  },
]

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  New:      { bg: '#FEF3EC', color: '#BA7517' },
  Improved: { bg: '#ecfdf5', color: '#059669' },
  Fixed:    { bg: '#eff6ff', color: '#2563eb' },
}

export default function UpdatesPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <nav className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium no-underline hidden sm:block" style={{ color: 'var(--text-secondary)' }}>Home</Link>
          <UserMenu />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-12 pb-24">

        {/* Header */}
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#BA7517', letterSpacing: '0.1em' }}>Changelog</p>
          <h1 className="text-4xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
            What&apos;s new
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Recent changes, improvements, and new features on Unpacked.
          </p>
        </div>

        {/* Entries */}
        <div className="space-y-16">
          {updates.map((release) => (
            <div key={release.date}>
              {/* Release header */}
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#BA7517' }}>{release.date}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#E8E2D9' }} />
              </div>

              {/* Items */}
              <div className="space-y-8">
                {release.items.map((item) => {
                  const tagStyle = TAG_STYLES[item.tag] ?? TAG_STYLES['New']
                  return (
                    <div key={item.title} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-1 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: '#D4C5B0' }} />
                        <div className="w-px flex-1 mt-2" style={{ backgroundColor: '#E8E2D9' }} />
                      </div>
                      {/* Content */}
                      <div className="pb-6">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: tagStyle.bg, color: tagStyle.color }}
                          >
                            {item.tag}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
                          {item.title}
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {item.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 pt-10 text-center" style={{ borderTop: '1px solid #E8E2D9' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Try it for yourself</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}
          >
            Ask a question →
          </Link>
        </div>
      </div>
    </div>
  )
}
