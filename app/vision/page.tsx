import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unpacked — Vision & Strategy',
  robots: { index: false, follow: false },
}

const STATS = [
  { value: '$0.10', label: 'Average cost per article' },
  { value: '5', label: 'Core pipeline stages' },
  { value: '3', label: 'Independent fact-checkers' },
  { value: '14', label: 'Article types' },
  { value: '48,500+', label: 'Affiliate merchants via Skimlinks' },
  { value: '<3 min', label: 'Generation time' },
]

const PIPELINE_STEPS = [
  { num: '01', title: 'Research', desc: 'Searches 10-15 sources, pulls Reddit threads, Twitter/X sentiment, and live market data — all in parallel' },
  { num: '02', title: 'Blueprint', desc: 'Classifies the article type, picks a winner, maps evidence to sections, sets word budgets' },
  { num: '03', title: 'Write', desc: 'Full article with product cards, comparison tables, data visualisations, and a clear verdict' },
  { num: '04', title: 'Fact-check', desc: 'Three independent AI models from different providers verify every factual claim. Corrections applied automatically' },
  { num: '05', title: 'Publish', desc: 'Editorial images sourced, social content generated, shareable link ready — all in under three minutes' },
]

const BEHIND_THE_SCENES = [
  { icon: 'edit', title: 'Editorial pass', desc: 'An independent model scores the writing and rewrites weak sections before delivery' },
  { icon: 'image', title: 'Smart image sourcing', desc: 'Hero and product photography from Pexels, Unsplash, and Brave — routed by article type' },
  { icon: 'social', title: 'Social content', desc: 'Ready-to-post threads for Twitter/X, LinkedIn, and Reddit generated automatically' },
  { icon: 'data', title: 'Live data', desc: 'Polymarket odds, Yahoo Finance prices, and Google Trends pulled when relevant' },
]

const REVENUE_STREAMS = [
  { title: 'Subscriptions', status: 'Built', desc: 'Free (3/month), Standard $12/month (15), Pro $29/month (60). Stripe wired.' },
  { title: 'Affiliate Commissions', status: 'Next', desc: 'Skimlinks — one script tag, 48,500+ merchants, automatic link conversion. Every buyer guide becomes revenue.' },
  { title: 'Creator Revenue Share', status: 'Planned', desc: '20% initially, scaling to 30-50% for Verified Creators. Creators earn on every click their articles generate.' },
  { title: 'Sponsored Articles', status: 'Month 6+', desc: 'Requires traffic proof first. Brand partnerships for priority categories.' },
  { title: 'API Access', status: 'Month 12+', desc: 'Publishers license the research pipeline for their own editorial operations.' },
]

const CATEGORIES = [
  { name: 'Finance', potential: 'Highest', detail: 'Credit cards pay $50-200 per signup' },
  { name: 'Tech', potential: 'High', detail: 'Every article mentions purchasable products' },
  { name: 'Home', potential: 'High', detail: 'Appliances, high average order value' },
  { name: 'Health', potential: 'High', detail: 'Supplements, equipment, recurring purchases' },
  { name: 'Travel', potential: 'Medium', detail: 'Booking links, gear, insurance' },
  { name: 'News & AI', potential: 'Traffic', detail: 'Drives volume → reader-to-creator conversion' },
]

const GROWTH_ENGINES = [
  { title: 'Tech Announcements', desc: 'Full editorial breakdown within 30 minutes of any major announcement. Living article that updates as the story develops. Multiple legitimate social posts per story.' },
  { title: 'Tweet-to-Article', desc: 'Paste any viral tweet URL — get a full researched article. Share it in the tweet replies. Natural distribution loop built on the highest-intent content signals on the internet.' },
  { title: 'Creator Acquisition', desc: 'Target niche site owners, Substack writers, YouTube reviewers. "Your expertise, our infrastructure." 50 active creators generating and sharing content.' },
  { title: 'Reddit Seeding', desc: 'Genuine 90/10 participation. Real expertise in relevant threads. Reddit opportunity monitor flags rising discussions for article generation.' },
  { title: 'Viral → Buyer Guide Funnel', desc: 'Myth busters and ranked lists drive traffic. Bottom-of-article CTA converts readers to creators. Creators make buyer guides that earn affiliate. The funnel builds itself.' },
]

export default function VisionPage() {
  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* ── Minimal nav ── */}
      <nav className="flex items-center justify-between px-6 py-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="https://unpacked.fyi" className="no-underline" style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 20, color: '#1A1917', letterSpacing: '-0.02em' }}>
          unpacked
        </a>
        <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#FDF6E9', color: '#BA7517', fontWeight: 600 }}>
          Confidential
        </span>
      </nav>

      {/* ── Hero ── */}
      <section className="px-6 pt-12 pb-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          The Vision
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917', letterSpacing: '-0.03em' }}>
          What if anyone could produce<br />
          Wirecutter-quality journalism?
        </h1>
        <p className="text-lg leading-relaxed mb-8" style={{ color: '#6B6966', maxWidth: 680 }}>
          Unpacked is a publishing platform where users type any question and receive a complete, researched, fact-checked editorial article in under three minutes. Every article picks a winner. Three independent AI models verify every claim. Creators publish under their own name and earn affiliate revenue from product recommendations.
        </p>
        <a
          href="https://unpacked.fyi"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold no-underline transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#1A1917', color: '#fff' }}
        >
          Visit unpacked.fyi
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
        </a>
      </section>

      {/* ── Stats strip ── */}
      <section className="px-6 py-10" style={{ backgroundColor: '#1A1917' }}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-sora)', color: '#BA7517' }}>{s.value}</p>
              <p className="text-xs" style={{ color: '#94918D' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Parallel ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          The Opportunity
        </p>
        <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          The Wirecutter model, democratised
        </h2>
        <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#412402' }}>
            Wirecutter was acquired by the New York Times for <strong>$30 million</strong> in 2016 after generating ~$150 million in annual e-commerce transactions. The model: deep research, clear verdict, affiliate commission.
          </p>
          <p className="text-sm leading-relaxed mt-3" style={{ color: '#412402' }}>
            Unpacked does it <strong>without the newsroom</strong>, at roughly <strong>$0.10 per article</strong>, across <strong>every topic and category</strong>, with a creator community that distributes the content themselves.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>Traditional Editorial</p>
            <ul className="text-sm space-y-2" style={{ color: '#6B6966' }}>
              <li>• Newsroom of writers, editors, fact-checkers</li>
              <li>• $500-2,000 per article</li>
              <li>• Days to publish</li>
              <li>• Limited to one niche</li>
              <li>• Distribution through SEO alone</li>
            </ul>
          </div>
          <div className="rounded-xl p-5" style={{ border: '2px solid #BA7517', backgroundColor: '#fff' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#BA7517', fontFamily: 'var(--font-sora)' }}>Unpacked</p>
            <ul className="text-sm space-y-2" style={{ color: '#6B6966' }}>
              <li>• Automated research-to-publish pipeline</li>
              <li>• ~$0.10 per article</li>
              <li>• Under 3 minutes</li>
              <li>• Every category, any topic</li>
              <li>• Creators distribute their own content</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="px-6" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ height: 1, backgroundColor: '#E8E6E0' }} />
      </div>

      {/* ── How It Works ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          The Pipeline
        </p>
        <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          Question to published article in under three minutes
        </h2>
        <p className="text-sm mb-10 leading-relaxed" style={{ color: '#6B6966', maxWidth: 600 }}>
          A user types any question. Behind the scenes, a multi-stage pipeline researches, writes, fact-checks, and packages a publication-quality article.
        </p>

        {/* 5 core steps — large numbered cards */}
        <div className="space-y-4 mb-12">
          {PIPELINE_STEPS.map(step => (
            <div key={step.num} className="flex gap-5 items-start rounded-xl px-5 py-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}>
                {step.num}
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>{step.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Behind the scenes — 4 small cards */}
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94918D', letterSpacing: '0.12em' }}>
          Also happening behind the scenes
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BEHIND_THE_SCENES.map(item => (
            <div key={item.title} className="rounded-lg px-4 py-3" style={{ backgroundColor: '#F5F4F2', border: '1px solid #E8E6E0' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>{item.title}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#94918D' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="px-6" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ height: 1, backgroundColor: '#E8E6E0' }} />
      </div>

      {/* ── What Makes It Different ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          Differentiation
        </p>
        <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          Not a chatbot. Not a content tool.
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { title: 'Every article picks a winner', desc: 'No hedging, no "it depends." 50+ banned AI phrases enforced. The editorial voice is opinionated, warm, and authoritative.' },
            { title: 'Triple fact-check', desc: 'Three independent models from different AI providers verify every factual claim. Corrections applied automatically. Verified badge.' },
            { title: 'Real community sentiment', desc: 'Every article shows what Reddit and Twitter/X are actually saying. Real threads, real viewpoints, sentiment analysis with pro/sceptical classification.' },
            { title: 'Live market data', desc: 'Prediction market odds, stock prices, Google Trends — pulled in real-time when relevant. Smart filters prevent low-signal data.' },
            { title: 'Interactive tools', desc: 'Decision trees, scenario simulators, interactive maps, comparison calculators — bespoke per article. No other platform generates these.' },
            { title: 'Creator-first', desc: 'Full editorial control: edit sections, swap images, adjust verdict, add research. Publish under your own name. Eventually earn affiliate revenue.' },
          ].map(item => (
            <div key={item.title} className="rounded-xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>{item.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Revenue ── */}
      <section className="px-6 py-16" style={{ backgroundColor: '#1A1917' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
            Monetisation
          </p>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            Five revenue streams
          </h2>
          <p className="text-sm mb-10 leading-relaxed" style={{ color: '#94918D', maxWidth: 600 }}>
            Subscriptions are built. Affiliate is next. The economics are strong: articles cost ~$0.10 to generate, and every buyer guide, comparison, and ranked list becomes a persistent revenue source.
          </p>
          <div className="space-y-3">
            {REVENUE_STREAMS.map(stream => (
              <div key={stream.title} className="flex flex-col md:flex-row md:items-start gap-3 md:gap-5 rounded-xl px-5 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 shrink-0 md:min-w-[200px]">
                  <span className="text-sm font-semibold" style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}>{stream.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    backgroundColor: stream.status === 'Built' ? 'rgba(59,109,17,0.2)' : stream.status === 'Next' ? 'rgba(186,117,23,0.2)' : 'rgba(148,145,141,0.15)',
                    color: stream.status === 'Built' ? '#7BC936' : stream.status === 'Next' ? '#BA7517' : '#94918D',
                  }}>{stream.status}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#94918D' }}>{stream.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Economics ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          Category Strategy
        </p>
        <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          12 categories, tiered by affiliate potential
        </h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: '#6B6966', maxWidth: 600 }}>
          High-intent categories (Finance, Tech, Home) drive affiliate revenue directly. Traffic categories (News, AI, Culture) drive volume that converts readers into creators — who then make the high-intent content.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {CATEGORIES.map(cat => (
            <div key={cat.name} className="flex items-center gap-4 rounded-xl px-5 py-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>{cat.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B6966' }}>{cat.detail}</p>
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{
                backgroundColor: cat.potential === 'Highest' ? '#EAF3DE' : cat.potential === 'High' ? '#FDF6E9' : cat.potential === 'Medium' ? '#F0EFED' : '#F5F0FF',
                color: cat.potential === 'Highest' ? '#27500A' : cat.potential === 'High' ? '#BA7517' : cat.potential === 'Medium' ? '#6B6966' : '#6B46C1',
              }}>{cat.potential}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="px-6" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ height: 1, backgroundColor: '#E8E6E0' }} />
      </div>

      {/* ── The Flywheel ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          The Flywheel
        </p>
        <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          Content creates distribution creates revenue creates content
        </h2>
        <div className="rounded-xl p-6" style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}>
          <div className="flex flex-col md:flex-row gap-4 text-center">
            {[
              { step: 'Viral content', sub: 'Myth busters, ranked lists,\ntweet-inspired articles' },
              { step: 'Traffic', sub: 'Reddit, LinkedIn, Twitter/X,\norganic search' },
              { step: 'Readers → Creators', sub: 'Bottom-of-article CTA\nconverts readers' },
              { step: 'Buyer guides', sub: 'Creators make high-intent\nproduct content' },
              { step: 'Affiliate revenue', sub: 'Every recommendation\nearns commission' },
            ].map((item, i) => (
              <div key={item.step} className="flex-1 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2" style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}>
                  {i + 1}
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#412402', fontFamily: 'var(--font-sora)' }}>{item.step}</p>
                <p className="text-xs whitespace-pre-line" style={{ color: '#6B5D3E' }}>{item.sub}</p>
                {i < 4 && (
                  <div className="hidden md:block mt-2" style={{ color: '#BA7517', fontSize: 18 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Growth Engines ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          Growth
        </p>
        <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          Five distribution engines
        </h2>
        <div className="space-y-4">
          {GROWTH_ENGINES.map(engine => (
            <div key={engine.title} className="rounded-xl px-5 py-4" style={{ backgroundColor: '#fff', border: '1px solid #E8E6E0' }}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: '#1A1917', fontFamily: 'var(--font-sora)' }}>{engine.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6B6966' }}>{engine.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Founder ── */}
      <section className="px-6 py-16" style={{ backgroundColor: '#1A1917' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
            The Founder
          </p>
          <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}>
            Colin Fitzpatrick
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#C4C1BD' }}>
                Solo founder, based in Dubai (UAE). Background in enterprise software — Oracle, Salesforce, HubSpot. LinkedIn following of ~25,000.
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#C4C1BD' }}>
                Unpacked is built entirely using Claude Code for implementation and Claude for strategy and design. No engineering team. The entire platform — 8-stage AI pipeline, 58 API routes, triple fact-check, live data integrations — is the work of one person with the right tools.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#C4C1BD' }}>
                Company entity: BlockSol LLC, registered in Sharjah Media City (SHAMS) free zone, UAE.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Tech Stack', value: 'Next.js 16, Supabase, Vercel Pro' },
                { label: 'AI Pipeline', value: 'Claude Haiku, Gemini Flash, Sonnet, GPT-4o-mini' },
                { label: 'Research', value: 'Brave Search API, Reddit, Twitter/X' },
                { label: 'Live Data', value: 'Polymarket, Yahoo Finance, Google Trends' },
                { label: 'Payments', value: 'Stripe (built, pending activation)' },
                { label: 'Per-article cost', value: '$0.05 – $0.17' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs" style={{ color: '#94918D' }}>{item.label}</span>
                  <span className="text-sm font-medium" style={{ color: '#fff' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="px-6 py-16" style={{ maxWidth: 900, margin: '0 auto' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#BA7517', letterSpacing: '0.15em' }}>
          Roadmap
        </p>
        <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
          What&apos;s next
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-xl p-5" style={{ border: '2px solid #BA7517', backgroundColor: '#fff' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#BA7517' }}>Now</p>
            <ul className="text-sm space-y-2" style={{ color: '#6B6966' }}>
              <li>• Skimlinks affiliate activation</li>
              <li>• Seed 40-50 showcase articles</li>
              <li>• Mobile end-to-end testing</li>
              <li>• Pre-launch creator cohort (30 DMs)</li>
              <li>• Content audit and curation</li>
            </ul>
          </div>
          <div className="rounded-xl p-5" style={{ border: '1px solid #E8E6E0', backgroundColor: '#fff' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B6966' }}>Month 1-2</p>
            <ul className="text-sm space-y-2" style={{ color: '#6B6966' }}>
              <li>• Creator analytics dashboard</li>
              <li>• Referral system</li>
              <li>• Reddit opportunity monitor</li>
              <li>• 50 active creators target</li>
              <li>• Stripe live activation</li>
            </ul>
          </div>
          <div className="rounded-xl p-5" style={{ border: '1px solid #E8E6E0', backgroundColor: '#fff' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B6966' }}>Month 3-6</p>
            <ul className="text-sm space-y-2" style={{ color: '#6B6966' }}>
              <li>• Creator revenue share activated</li>
              <li>• Email newsletter digest</li>
              <li>• Trending questions dashboard</li>
              <li>• Views-for-premium mechanic</li>
              <li>• Mobile app investigation</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="px-6 pt-8 pb-20" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: '#1A1917' }}>
            What if Wirecutter&apos;s editorial process was<br className="hidden md:inline" /> automated — and anyone could use it?
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B5D3E', maxWidth: 500, margin: '0 auto' }}>
            That&apos;s Unpacked. The research is done. The fact-check is done. The article is ready. You just publish.
          </p>
          <a
            href="https://unpacked.fyi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold no-underline transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#BA7517', color: '#fff' }}
          >
            See the platform live
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-6 text-center" style={{ borderTop: '1px solid #E8E6E0' }}>
        <p className="text-xs" style={{ color: '#94918D' }}>
          Unpacked — unpacked.fyi — BlockSol LLC — Confidential
        </p>
      </footer>
    </div>
  )
}
