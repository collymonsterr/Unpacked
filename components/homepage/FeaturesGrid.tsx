/**
 * FeaturesGrid — 6-card "More than a chatbot reply" section.
 *
 * Communicates output-quality differentiators: fact-checking, real images,
 * interactive charts, live data, community opinion, editorial polish.
 *
 * Visual style matches HowItWorksRow (white card, amber icon tile) but
 * uses a 3×2 grid with no step numbers — these are parallel features,
 * not sequential steps.
 */

const FEATURES = [
  {
    title: 'Triple fact-checked',
    body: 'Every claim verified by three independent models — Gemini with Google Search, Claude, and GPT-4o-mini — before you publish.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    title: 'Real images, never AI',
    body: 'Sourced from Pexels, Unsplash, and live web search. We never generate fake images — every photo is real.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    title: 'Interactive charts and tables',
    body: 'Comparison tables, bar charts, calculators, and stat cards rendered automatically from the research — not flat screenshots.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="3" y1="20" x2="21" y2="20" />
      </svg>
    ),
  },
  {
    title: 'Live data, not training data',
    body: 'Polymarket odds, Yahoo Finance prices, Google Trends — pulled at the moment of writing. Always current, never stale.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: 'Real community opinion',
    body: 'Reddit threads and X conversations summarised inline with sentiment splits. Real voices, not invented quotes.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'Editorial polish',
    body: 'A senior-editor model pass rewrites weak sections — no AI hedging, no "it depends," clear opinions, no filler.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
]

export default function FeaturesGrid() {
  return (
    <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-16">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2 text-center"
        style={{ color: '#BA7517', letterSpacing: '0.1em' }}
      >
        What you get
      </p>
      <h2
        className="text-2xl md:text-3xl font-bold mb-3 text-center"
        style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}
      >
        More than a chatbot reply.
      </h2>
      <p
        className="text-base mb-12 text-center max-w-[600px] mx-auto"
        style={{ color: '#6B6B6B', lineHeight: 1.55 }}
      >
        A complete editorial article — fact-checked, illustrated, and packed with live data and real opinions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(feature => (
          <div
            key={feature.title}
            className="rounded-xl p-6"
            style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9' }}
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4"
              style={{ backgroundColor: '#BA7517' }}
            >
              {feature.icon}
            </div>
            <h3
              className="text-base font-bold mb-2"
              style={{ color: '#1A1714', fontFamily: 'var(--font-sora)' }}
            >
              {feature.title}
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: '#6B6B6B' }}
            >
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
