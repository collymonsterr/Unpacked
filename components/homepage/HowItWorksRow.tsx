/**
 * HowItWorksRow — 3-card horizontal row explaining the Unpacked flow.
 *
 * Used on the marketing homepage (anonymous visitors). Same visual style as
 * the /about page Section 4 ("Three steps. Three minutes.").
 */

const STEPS = [
  {
    num: '01',
    title: 'Ask anything',
    desc: 'Type any question — a buying decision, a comparison, something you want to understand properly. Any topic, any depth.',
    tag: 'One sentence from you',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'We research',
    desc: 'Live web search, Reddit, X, expert reviews, plus live data from Polymarket, Yahoo Finance, and Google Trends. Real sources — not training data.',
    tag: '~3 minutes',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 3h-8l-2 4h12l-2-4z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Polish it in your tone',
    desc: 'Rewrite any section, swap images, pull in extra research, refine the wording. Then publish it under your name.',
    tag: 'Your article, your name.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
]

export default function HowItWorksRow() {
  return (
    <section className="max-w-[1060px] mx-auto px-4 md:px-6 py-16">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2 text-center"
        style={{ color: '#BA7517', letterSpacing: '0.1em' }}
      >
        How it works
      </p>
      <h2
        className="text-2xl md:text-3xl font-bold mb-10 text-center"
        style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}
      >
        Three steps. Three minutes.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map(step => (
          <div
            key={step.num}
            className="rounded-xl p-6"
            style={{ backgroundColor: '#fff', border: '1px solid #E8E2D9' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#BA7517' }}>
              Step {step.num}
            </p>
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4"
              style={{ backgroundColor: '#BA7517' }}
            >
              {step.icon}
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: '#1A1714' }}>
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B6B6B' }}>
              {step.desc}
            </p>
            <span
              className="text-[10px] font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: '#FDF6E9', color: '#BA7517' }}
            >
              {step.tag}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
