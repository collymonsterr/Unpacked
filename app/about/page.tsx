import Logo from '@/components/ui/Logo'
import SearchForm from '@/components/SearchForm'
import ExampleChips from '@/components/ExampleChips'
import Link from 'next/link'

export const metadata = {
  title: 'About ArticleAI — Why We Built Something Different',
  description: 'AI articles are boring. We fixed that. Structured, visual, opinionated articles with real research and independent fact-checking.',
}

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <Link href="/" className="text-sm font-medium no-underline" style={{ color: 'var(--text-secondary)' }}>
          ← Back to home
        </Link>
      </nav>

      {/* ═══ Section 1: Hero ═══ */}
      <section className="text-center px-4 pt-20 pb-24 max-w-3xl mx-auto">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Why are AI articles<br />so boring?
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          You ask AI a question. You get a wall of text. No structure, no images, no opinion. We thought there had to be something better.
        </p>
      </section>

      {/* ═══ Section 2: Problem Grid ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-20">
        <h2
          className="text-2xl md:text-3xl font-bold mb-8 text-center"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          You&apos;ve seen this before.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Wall of text', desc: 'You get 800 words of plain text. No images, no structure, no design. It looks like an email.' },
            { title: 'Generic AI slop', desc: "Every AI writes the same thing. Safe, bland, and forgettable. You've read it before." },
            { title: 'No opinion', desc: "AI won't pick a winner. \"It depends on your needs\" is not an answer." },
            { title: 'Useless images', desc: "Perplexity pulls in random thumbnails and logos. You can't control them. They're not even relevant." },
            { title: 'Nothing verified', desc: 'The AI states a price confidently. Is it real? Is it current? You have no idea.' },
            { title: 'Disposable', desc: "You get the text and then what? You can't share it, adjust it, or make it yours." },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ backgroundColor: '#f0efed', border: '1px solid #dddbd7' }}
            >
              <h3 className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--font-sora)', color: '#8a8580' }}>
                {card.title}
              </h3>
              <p className="text-sm" style={{ color: '#8a8580' }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Section 3: Pivot ═══ */}
      <section className="text-center py-20 px-4">
        <p
          className="text-3xl md:text-4xl lg:text-5xl font-extrabold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
        >
          So we built something different.
        </p>
      </section>

      {/* ═══ Section 4: Solution Grid ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-20">
        <h2
          className="text-2xl md:text-3xl font-bold mb-8 text-center"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          ArticleAI fixes all of it.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Structured and visual', desc: 'Product cards, comparison charts, interactive calculators, editorial photos. Not a wall of text.' },
            { title: 'Researched from live sources', desc: 'We search the web, Reddit, forums, and reviews. Real opinions, not recycled training data.' },
            { title: 'Opinionated', desc: 'Every article picks a winner and tells you why. No hedging, no fence-sitting.' },
            { title: 'Real images you control', desc: "Actual product photos from the web. Don't like one? Click to swap it for a better one." },
            { title: 'Fact-checked by a second AI', desc: 'Prices, specs, and claims independently verified after every article. Corrections shown transparently.' },
            { title: 'Yours to keep and shape', desc: "Rewrite sections, change the tone, share a beautiful link. It's your article." },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Section 5: Side-by-Side Comparison ═══ */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — What AI gives you */}
          <div>
            <div
              className="rounded-xl p-6 h-80 flex flex-col justify-between"
              style={{ backgroundColor: '#e8e8e5', border: '1px solid #d5d5d2' }}
            >
              <div className="space-y-3">
                <div className="h-3 rounded" style={{ backgroundColor: '#cccac6', width: '60%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '100%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '95%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '100%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '88%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '100%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '72%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '100%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '93%' }} />
                <div className="h-2.5 rounded" style={{ backgroundColor: '#d5d3cf', width: '65%' }} />
              </div>
            </div>
            <p className="text-xs text-center mt-3" style={{ color: '#8a8580' }}>
              Plain text. No images. No structure. No verdict.
            </p>
          </div>

          {/* Right — What ArticleAI gives you */}
          <div>
            <div
              className="rounded-xl overflow-hidden h-80 flex flex-col"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              {/* Mini hero image */}
              <div className="h-20" style={{ backgroundColor: 'var(--accent-light)' }}>
                <div className="h-full flex items-end px-4 pb-2">
                  <div className="h-3 rounded" style={{ backgroundColor: 'var(--accent)', width: '50%', opacity: 0.4 }} />
                </div>
              </div>
              <div className="p-4 flex-1 space-y-3">
                {/* Verdict bar */}
                <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <div className="h-2 rounded" style={{ backgroundColor: 'var(--accent)', width: '40%', opacity: 0.5 }} />
                  <div className="h-1.5 rounded mt-1" style={{ backgroundColor: 'var(--accent)', width: '70%', opacity: 0.25 }} />
                </div>
                {/* Product card mockup */}
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 rounded" style={{ backgroundColor: 'var(--border)', width: '70%' }} />
                    <div className="h-1.5 rounded" style={{ backgroundColor: 'var(--border)', width: '50%' }} />
                  </div>
                </div>
                {/* Chart mockup */}
                <div className="flex items-end gap-1 h-10">
                  {[40, 65, 55, 80, 70, 90, 60].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i === 5 ? 'var(--accent)' : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
                {/* Sources */}
                <div className="flex gap-1">
                  <div className="h-1.5 rounded" style={{ backgroundColor: 'var(--accent)', width: '15%', opacity: 0.3 }} />
                  <div className="h-1.5 rounded" style={{ backgroundColor: 'var(--accent)', width: '20%', opacity: 0.3 }} />
                  <div className="h-1.5 rounded" style={{ backgroundColor: 'var(--accent)', width: '12%', opacity: 0.3 }} />
                </div>
              </div>
            </div>
            <p className="text-xs text-center mt-3" style={{ color: 'var(--accent)' }}>
              Visual. Structured. Opinionated. Fact-checked.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Section 6: How It Works ═══ */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 pb-24">
        <h2
          className="text-2xl md:text-3xl font-bold mb-10 text-center"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Type a question. Get a complete article.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { num: '1', title: 'You ask', desc: 'Type any question — a buying decision, a comparison, something you want to understand.' },
            { num: '2', title: 'We research', desc: 'We search the web, expert reviews, Reddit, and real user opinions. Live data, not training data.' },
            { num: '3', title: 'You get the article', desc: 'A visual article with images, charts, a clear verdict, and sources. Ready in about 2 minutes.' },
          ].map((step) => (
            <div key={step.num} className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
              >
                {step.num}
              </div>
              <h3 className="text-base font-bold mb-1.5" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Section 7: Trust ═══ */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pb-24 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Written by one AI. Fact-checked by another.
        </h2>
        <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
          Every article is independently verified after generation. A second AI cross-checks prices, specs, and claims against live sources. If something&apos;s wrong, it&apos;s corrected — and you see exactly what changed.
        </p>
        {/* Fact-check bar mockup */}
        <div
          className="rounded-xl px-5 py-3 flex items-center gap-3 max-w-lg mx-auto"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-left" style={{ color: 'var(--text-primary)' }}>
            <span className="font-semibold" style={{ fontFamily: 'var(--font-sora)' }}>Fact-check complete</span>
            {' — '}
            <span className="font-bold" style={{ color: 'var(--accent)' }}>2 corrections</span>
            {' applied. '}
            <span className="underline" style={{ color: 'var(--accent)' }}>See what changed</span>
          </p>
        </div>
      </section>

      {/* ═══ Section 8: For Creators ═══ */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pb-24 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Know your niche? Build your reputation.
        </h2>
        <p className="text-base mb-6 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Create articles about topics you know. Share them with your audience. Every recommendation earns affiliate revenue — and creators get a share. Your name, your expertise, your earnings.
        </p>
        <Link
          href="/creators"
          className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
        >
          Learn more about creating →
        </Link>
      </section>

      {/* ═══ Section 9: Tech Transparency ═══ */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pb-24 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Transparent about how it works.
        </h2>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          ArticleAI uses Claude by Anthropic to research and write, with live web search for current data. Google Gemini independently fact-checks every article. Images are sourced from real retailers and review sites. Every article includes its sources so you can verify anything yourself.
        </p>
      </section>

      {/* ═══ Section 10: CTA ═══ */}
      <section className="max-w-2xl mx-auto px-4 md:px-6 pb-24 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold mb-8"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Try it. Takes 2 minutes.
        </h2>
        <SearchForm />
        <ExampleChips existingQueries={[]} />
      </section>
    </div>
  )
}
