/**
 * EditorialControlRow — 3-card "You're the editor, not just the reader" section.
 *
 * Communicates the ownership / control / publishing pitch — the part that
 * turns readers into creators. Bigger card treatment than FeaturesGrid:
 * left amber accent strip, larger icons, more vertical room.
 */

const CONTROLS = [
  {
    eyebrow: 'Refine the writing',
    title: 'Rewrite anything',
    body: 'Click any section, give a quick brief, get it rewritten. Change the tone, expand a point, soften the verdict, swap the angle. The first draft is just the start.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    eyebrow: 'Decide the contents',
    title: 'You choose what goes in',
    body: 'We over-research every article. The Editor tab shows you everything we found — including what didn’t make the first draft. Pull in extra Reddit quotes, swap any image, drop in a YouTube video, reorder the layout. Your article fills out the way you want it.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4" />
        <path d="M15 5h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4" />
        <line x1="9" y1="14" x2="15" y2="8" />
        <line x1="9" y1="8" x2="15" y2="14" />
      </svg>
    ),
  },
  {
    eyebrow: 'Publish',
    title: 'It goes out under your name',
    body: 'Your byline, your bio, your URL. Share it on Reddit, X, or LinkedIn. Earn affiliate revenue when readers buy the products you recommended.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function EditorialControlRow() {
  return (
    <section
      className="w-full py-20"
      style={{ backgroundColor: '#1A1714' }}
    >
      <div className="max-w-[1060px] mx-auto px-4 md:px-6">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2 text-center"
          style={{ color: '#E0A04A', letterSpacing: '0.1em' }}
        >
          You stay in control
        </p>
        <h2
          className="text-2xl md:text-3xl font-bold mb-3 text-center"
          style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}
        >
          You&rsquo;re the editor, not just the reader.
        </h2>
        <p
          className="text-base mb-12 text-center max-w-[640px] mx-auto"
          style={{ color: '#B0A89E', lineHeight: 1.55 }}
        >
          You don&rsquo;t just get an AI generation and send it. You get a first draft, all the surplus research we did, and the tools to shape it into the article you actually want.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CONTROLS.map(control => (
            <div
              key={control.title}
              className="rounded-xl p-7 relative overflow-hidden"
              style={{
                backgroundColor: '#241F1A',
                border: '1px solid #3A332D',
              }}
            >
              {/* Amber accent strip */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: '#BA7517',
                }}
              />
              <div
                className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
                style={{ backgroundColor: '#BA7517' }}
              >
                {control.icon}
              </div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: '#E0A04A' }}
              >
                {control.eyebrow}
              </p>
              <h3
                className="text-lg font-bold mb-3"
                style={{ color: '#fff', fontFamily: 'var(--font-sora)' }}
              >
                {control.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#B0A89E' }}
              >
                {control.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
