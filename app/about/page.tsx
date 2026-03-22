import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
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
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
            Home
          </Link>
          <UserMenu />
        </div>
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
            { title: 'Wall of text', desc: 'You get 800 words of plain text. No images, no structure, no design. It looks like an email.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b5b0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg> },
            { title: 'Generic AI slop', desc: "Every AI writes the same thing. Safe, bland, and forgettable. You've read it before.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b5b0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
            { title: 'No opinion', desc: "AI won't pick a winner. \"It depends on your needs\" is not an answer.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b5b0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M8 15h8"/><circle cx="9" cy="10" r="1" fill="#b5b0aa" stroke="none"/><circle cx="15" cy="10" r="1" fill="#b5b0aa" stroke="none"/></svg> },
            { title: 'Useless images', desc: "Perplexity pulls in random thumbnails and logos. You can't control them. They're not even relevant.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b5b0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="3" x2="21" y2="21"/><circle cx="8.5" cy="8.5" r="1.5"/></svg> },
            { title: 'Nothing verified', desc: 'The AI states a price confidently. Is it real? Is it current? You have no idea.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b5b0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
            { title: 'Disposable', desc: "You get the text and then what? You can't share it, adjust it, or make it yours.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b5b0aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ backgroundColor: '#f0efed', border: '1px solid #dddbd7' }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                {card.icon}
                <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-sora)', color: '#8a8580' }}>
                  {card.title}
                </h3>
              </div>
              <p className="text-sm" style={{ color: '#8a8580' }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Section 3: Pivot ═══ */}
      <section
        className="text-center py-24 px-4"
        style={{ background: 'linear-gradient(135deg, var(--accent-light) 0%, transparent 50%, var(--accent-light) 100%)' }}
      >
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
            { title: 'Visual and interactive', desc: 'Structured articles with product cards, comparison charts, interactive calculators, and editorial photos. Not a wall of text.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="11" width="7" height="10" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
            { title: 'Researched from live sources', desc: 'We search the web, Reddit, Twitter, forums, and reviews. Real opinions, not recycled training data.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
            { title: 'Opinionated', desc: 'Every article picks a winner and tells you why. No hedging, no fence-sitting.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
            { title: 'Real images you control', desc: "Actual product photos from the web. Don't like one? Click to swap it for a better one.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
            { title: 'Fact-checked by a second AI', desc: 'Prices, specs, and claims independently verified after every article. Corrections shown transparently.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> },
            { title: 'Yours to keep and shape', desc: "Rewrite sections, change the tone, share a beautiful link. It's your article.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
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
              <div className="flex items-center gap-2.5 mb-2">
                {card.icon}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ alignItems: 'stretch' }}>

          {/* Left — Typical AI response */}
          <div className="flex flex-col">
            <div
              className="rounded-xl overflow-hidden flex-1 flex flex-col"
              style={{ border: '1px solid #e5e5e5' }}
            >
              {/* Header */}
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #e5e5e5' }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c4c2be' }} />
                <span className="text-[11px] font-bold tracking-wider" style={{ color: '#8a8580' }}>TYPICAL AI RESPONSE</span>
              </div>
              {/* Content */}
              <div className="p-4 flex-1" style={{ backgroundColor: '#ffffff' }}>
                {/* Messy image grid — random sizes, inconsistent */}
                <div className="flex gap-1.5 mb-3" style={{ height: '52px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/about/chatgpt-1.jpg" alt="" className="rounded" style={{ width: '52px', height: '52px', objectFit: 'cover' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/about/chatgpt-2.jpg" alt="" className="rounded" style={{ width: '44px', height: '48px', objectFit: 'cover', marginTop: '4px' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/about/chatgpt-3.jpg" alt="" className="rounded" style={{ width: '68px', height: '42px', objectFit: 'cover', marginTop: '6px' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/about/chatgpt-4.jpg" alt="" className="rounded" style={{ width: '46px', height: '50px', objectFit: 'cover', marginTop: '2px' }} />
                </div>

                <p className="text-[11px] leading-[1.7] mb-2.5" style={{ color: '#374151' }}>
                  Here are some of the <strong>best electric guitars under $500</strong> that are widely recommended by players and instructors: 🎸
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  <strong>1. Squier Classic Vibe &apos;60s Stratocaster</strong> — Great all-rounder with alnico pickups and a vintage-tint gloss neck. The Classic Vibe series offers excellent build quality at an affordable price point, and many players consider it one of the best value options in this range. It comes in several colour options including Lake Placid Blue, 3-Colour Sunburst, and Olympic White.
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  <strong>2. Yamaha Pacifica 112V</strong> — A go-to recommendation for beginners with its HSS pickup configuration, comfortable body shape, and reliable tuning stability. The Pacifica series has been consistently popular for over two decades and offers great versatility across genres. ✅
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  <strong>3. Epiphone Les Paul Standard</strong> — If you prefer warmer, thicker tones, the Epiphone Les Paul is a solid choice. It features dual ProBucker humbuckers, a mahogany body, and the iconic Les Paul shape that&apos;s been a staple of rock music for decades. 🎵
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  <strong>4. Ibanez GRX70QA</strong> — Known for its slim, fast neck profile, the Ibanez is particularly good for players interested in rock, metal, and shred genres. It offers good value with its quilted art grain top and versatile Infinity pickup configuration. 🎶
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  <strong>5. Harley Benton SC-450</strong> — A budget-friendly option from Thomann that punches well above its weight. Great for players who want a Les Paul style without the premium price tag. Some players report needing a setup out of the box, but the value is hard to beat at this price point.
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  <strong>Key things to consider:</strong> When choosing your first electric guitar, think about the neck profile (thinner necks are easier for small hands), the pickup configuration (HSS is most versatile, HH is warmer), and whether you prefer a bolt-on or set neck construction. Each has pros and cons.
                </p>
                <p className="text-[11px] leading-[1.7] mb-2" style={{ color: '#374151' }}>
                  Ultimately, the best guitar for you <span style={{ backgroundColor: '#fee2e2', padding: '1px 3px', borderRadius: '2px', color: '#991b1b' }}>depends on your personal preferences</span>, playing style, and the genres you&apos;re most interested in. I&apos;d recommend visiting a local music store to try out a few models before making your final decision. 😊
                </p>
                <p className="text-[11px] leading-[1.7]" style={{ color: '#374151' }}>
                  Don&apos;t forget about accessories — you&apos;ll need an amp ($50–150 for a practice amp), a cable, a tuner, a strap, and some picks. This can add $100–250 to your total budget. And if you have smaller hands, a shorter scale length guitar (like a Mustang or Jaguar) might feel more comfortable to start with.
                </p>
              </div>
            </div>
            <p className="text-xs text-center mt-3" style={{ color: '#8a8580' }}>
              Plain text. Random images. No data. No verdict.
            </p>
          </div>

          {/* Right — ArticleAI */}
          <div className="flex flex-col">
            <div
              className="rounded-xl overflow-hidden flex-1 flex flex-col"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              {/* Header */}
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'var(--accent-light)', borderBottom: '1px solid #f0d5be' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>A</span>
                </div>
                <span className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--accent)' }}>ARTICLEAI</span>
              </div>
              {/* Content */}
              <div className="p-4 space-y-2.5 flex-1">
                {/* Badge + title */}
                <div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>BUYER GUIDE</span>
                  <p className="text-[13px] font-bold mt-1.5" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
                    Best Electric Guitars Under $500
                  </p>
                </div>

                {/* Verdict box */}
                <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--accent-light)', borderLeft: '3px solid var(--accent)' }}>
                  <span className="text-[9px] font-bold" style={{ color: 'var(--accent)' }}>VERDICT</span>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    Get the Yamaha Pacifica 112V
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Best all-round value with HSS versatility. Reddit&apos;s top pick by a wide margin.
                  </p>
                </div>

                {/* Product cards with real images */}
                {[
                  { name: 'Yamaha Pacifica 112V', price: '$299', badge: 'TOP PICK', badgeColor: 'var(--accent)', img: '/about/yamaha-pacifica.jpg', desc: 'Best all-rounder. HSS versatility.' },
                  { name: 'Epiphone Les Paul Standard', price: '$449', badge: 'RUNNER UP', badgeColor: '#94918D', img: '/about/epiphone-les-paul.jpg', desc: 'Classic tone, great build quality' },
                ].map((p, i) => (
                  <div key={i} className="flex gap-2.5 p-2 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} className="flex-shrink-0 rounded-md" style={{ width: '44px', height: '44px', objectFit: 'cover', backgroundColor: 'var(--accent-light)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <span className="text-[7px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: p.badgeColor, color: '#fff' }}>{p.badge}</span>
                      </div>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>{p.price}</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{p.desc}</p>
                    </div>
                  </div>
                ))}

                {/* Community recommendation donut */}
                <div className="rounded-lg p-2.5" style={{ backgroundColor: '#fafaf8' }}>
                  <p className="text-[9px] font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>COMMUNITY RECOMMENDATION</p>
                  <div className="flex items-center gap-3">
                    {/* Simple donut via SVG */}
                    <svg width="48" height="48" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#D3D1C7" strokeWidth="5" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#94918D" strokeWidth="5" strokeDasharray="10.56 77.44" strokeDashoffset="25" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#D4A843" strokeWidth="5" strokeDasharray="24.64 63.36" strokeDashoffset="14.44" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray="45.76 42.24" strokeDashoffset="89.08" />
                    </svg>
                    <div className="space-y-0.5 text-[8px]">
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--accent)' }} /> <span style={{ color: 'var(--text-primary)' }}>Pacifica <strong>52%</strong></span></div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#D4A843' }} /> <span style={{ color: 'var(--text-primary)' }}>Squier <strong>28%</strong></span></div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#94918D' }} /> <span style={{ color: 'var(--text-primary)' }}>Epiphone <strong>12%</strong></span></div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#D3D1C7' }} /> <span style={{ color: 'var(--text-primary)' }}>Other <strong>8%</strong></span></div>
                    </div>
                  </div>
                </div>

                {/* Value score bar chart */}
                <div>
                  <p className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>VALUE SCORE</p>
                  <div className="space-y-1">
                    {[
                      { name: 'Pacifica', w: '92%', winner: true },
                      { name: 'Squier CV', w: '84%', winner: false },
                      { name: 'Epiphone', w: '72%', winner: false },
                      { name: 'Ibanez', w: '65%', winner: false },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[8px] w-12 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{b.name}</span>
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                          <div className="h-full rounded-full" style={{ width: b.w, backgroundColor: b.winner ? 'var(--accent)' : '#D3D1C7' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comparison table */}
                <div className="rounded-lg overflow-hidden text-[8px]" style={{ border: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-4 gap-0" style={{ backgroundColor: '#f5f4f0' }}>
                    <div className="p-1 font-bold" style={{ color: 'var(--text-secondary)' }}></div>
                    <div className="p-1 font-bold text-center" style={{ color: 'var(--accent)' }}>Pacifica</div>
                    <div className="p-1 font-bold text-center" style={{ color: 'var(--text-secondary)' }}>Squier</div>
                    <div className="p-1 font-bold text-center" style={{ color: 'var(--text-secondary)' }}>Epiphone</div>
                  </div>
                  {[
                    { metric: 'Price', vals: ['$299', '$449', '$399'] },
                    { metric: 'Pickups', vals: ['HSS', 'SSS', 'HH'] },
                    { metric: 'Best for', vals: ['All genres', 'Blues/rock', 'Rock/jazz'] },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-4 gap-0" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="p-1" style={{ color: 'var(--text-secondary)' }}>{row.metric}</div>
                      {row.vals.map((v, j) => (
                        <div key={j} className="p-1 text-center" style={{ color: j === 0 ? 'var(--accent)' : 'var(--text-primary)', fontWeight: j === 0 ? 600 : 400 }}>{v}</div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Reddit quote */}
                <div className="rounded-lg p-2" style={{ backgroundColor: '#f8f7f5', borderLeft: '2px solid #FF4500' }}>
                  <p className="text-[9px] italic" style={{ color: 'var(--text-secondary)' }}>
                    &ldquo;The Pacifica gets recommended more than anything else in beginner threads.&rdquo;
                  </p>
                  <p className="text-[8px] mt-0.5" style={{ color: '#FF4500' }}>— r/guitar</p>
                </div>

                {/* Fact-check badge */}
                <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[9px]" style={{ color: '#16a34a' }}>3 prices corrected, all specs verified</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-center mt-3 font-medium" style={{ color: 'var(--accent)' }}>
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
            { num: '1', title: 'You ask', desc: 'Type any question — a buying decision, a comparison, something you want to understand.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { num: '2', title: 'We research', desc: 'We search the web, expert reviews, Reddit, and real user opinions. Live data, not training data.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
            { num: '3', title: 'You get the article', desc: 'A visual article with images, charts, a clear verdict, and sources. Ready in about 2 minutes.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
          ].map((step) => (
            <div key={step.num} className="text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {step.icon}
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
        <SearchForm autoFocus={false} />
        <ExampleChips existingQueries={[]} />
      </section>
    </div>
  )
}
