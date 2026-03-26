import { readFileSync } from 'fs'
import { join } from 'path'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build Log — Unpacked',
  robots: { index: false, follow: false },
}

// ── Helpers ──

function readMd(filename: string): string {
  try {
    return readFileSync(join(process.cwd(), filename), 'utf8')
  } catch {
    return ''
  }
}

function stripSensitive(text: string): string {
  return text
    .split('\n')
    .filter(line => {
      const l = line.toLowerCase()
      return (
        !l.includes('sk-ant-') &&
        !l.includes('aiza') &&
        !l.includes('@gmail') &&
        !l.includes('supabase.co') &&
        !l.includes('api_key') &&
        !l.includes('service_role') &&
        !l.includes('anon_key') &&
        !l.includes('admin_email') &&
        !l.includes('admin_user_id')
      )
    })
    .join('\n')
}

// ── Parsers ──

/**
 * Parse the two most recent changelog entries into brief, non-technical summaries.
 * Groups raw bullets by section heading and outputs one summary per section.
 */
function parseRecentChangelog(raw: string): Array<{ date: string; items: string[] }> {
  const entries: Array<{ date: string; items: string[] }> = []
  const lines = raw.split('\n')
  let current: { date: string; sections: Map<string, string[]> } | null = null
  let currentSection = ''

  for (const line of lines) {
    const dateMatch = line.match(/^## (\d+ \w+ \d{4})\s*[—–-]\s*(.+)/)
    if (dateMatch) {
      if (current) entries.push(summariseEntry(current))
      if (entries.length >= 2) break
      current = { date: `${dateMatch[1]} — ${dateMatch[2]}`, sections: new Map() }
      currentSection = ''
      continue
    }
    if (current && line.startsWith('### ')) {
      currentSection = line.replace('### ', '').trim()
      continue
    }
    if (current && line.startsWith('- ')) {
      const section = currentSection || 'Changes'
      if (!current.sections.has(section)) current.sections.set(section, [])
      current.sections.get(section)!.push(line.replace(/^- /, '').replace(/\*\*/g, '').replace(/`[^`]+`/g, '').trim())
    }
  }
  if (current && entries.length < 2) entries.push(summariseEntry(current))
  return entries
}

/** Convert a grouped changelog entry into brief one-line summaries per section */
function summariseEntry(entry: { date: string; sections: Map<string, string[]> }): { date: string; items: string[] } {
  // Map section headings to brief plain-English summaries
  const summaries: Record<string, string> = {
    'Architecture (biggest change)': 'Switched to cheaper, faster article generation engine',
    'Architecture': 'Switched to cheaper, faster article generation engine',
    'Cost Controls': 'Added usage tracking and duplicate prevention',
    'Homepage Redesign': 'Redesigned homepage with featured, trending, and popular sections',
    'Article Bottom Section Redesign': 'Redesigned the article footer with better editing tools',
    'Article Classification Engine': 'Articles now classified by type with strict structure rules',
    'Card Summary for Featured Articles': 'Featured articles get auto-generated card summaries',
    'Verified Badge': 'Added green verified badge to fact-checked articles',
    'Recent Articles History': 'Added recently visited articles dropdown in nav',
    'Generation Recovery': 'Articles recover gracefully if you refresh during generation',
    'Skeleton Loader': 'Added loading skeleton for articles opened via shared links',
    'Calculator Cleanup': 'Fixed all broken interactive calculators',
    'Nav Menu': 'Updated navigation menu with account links',
    'Name Change': 'Renamed the platform to The Brief',
    'FirstDraftBanner (new feature)': 'Added post-generation editing prompt banner',
    'Image System Improvements': 'Improved product and hero image search accuracy',
    'Loading Experience Overhaul': 'Redesigned the article generation loading experience',
    'Product Cards': 'Richer product descriptions and category-specific specs',
    'Refine Pipeline': 'Switched article refinement to cheaper model',
    'Slug Migration': 'Cleaned up all article URLs for better SEO',
    'Other': 'Various UI polish and small fixes',
  }

  const items: string[] = []
  for (const [section, bullets] of entry.sections) {
    const summary = summaries[section]
    if (summary) {
      items.push(summary)
    } else if (bullets.length > 0) {
      // Fallback: use first bullet, truncated to 12 words
      const words = bullets[0].split(/\s+/).slice(0, 12).join(' ')
      items.push(words + (bullets[0].split(/\s+/).length > 12 ? '...' : ''))
    }
  }

  return { date: entry.date, items }
}

function parseStagedPlan(raw: string): Array<{ name: string; items: Array<{ done: boolean; text: string }> }> {
  const stages: Array<{ name: string; items: Array<{ done: boolean; text: string }> }> = []
  const lines = raw.split('\n')
  let inPlan = false
  let current: { name: string; items: Array<{ done: boolean; text: string }> } | null = null

  for (const line of lines) {
    if (line.startsWith('## Staged Plan')) { inPlan = true; continue }
    if (inPlan && line.startsWith('## ') && !line.includes('Stage')) { break }

    if (inPlan && line.startsWith('### Stage')) {
      if (current) stages.push(current)
      current = { name: line.replace('### ', ''), items: [] }
      continue
    }
    if (current && (line.startsWith('- ✅') || line.startsWith('- ⬜'))) {
      const done = line.startsWith('- ✅')
      const text = line.replace(/^- [✅⬜]\s*/, '').trim()
      current.items.push({ done, text })
    }
  }
  if (current) stages.push(current)
  return stages
}

interface Decision { heading: string; explanation: string }

function parseDecisions(raw: string): Decision[] {
  // Map of decision keywords to plain English rewrites
  const wanted: Array<{ match: string; heading: string; explanation: string }> = [
    {
      match: 'Gemini Flash + Brave',
      heading: 'We switched from Claude Sonnet to Gemini Flash for writing',
      explanation: 'The original pipeline used Claude Sonnet with built-in web search, costing $1.10 per article. Switching to Brave for research and Gemini Flash for writing brought it down to $0.02 — a 97% cost reduction with comparable quality.',
    },
    {
      match: 'Articles pick a winner',
      heading: 'Every article picks a winner — no hedging',
      explanation: 'Banned phrases include "it depends on your personal preference" and "both are excellent choices." The platform takes a clear position on every topic, like a senior product journalist would.',
    },
    {
      match: 'Classification-first article structure',
      heading: 'Articles are classified before they are written',
      explanation: 'Every query is classified into one of 7 types (comparison, buyer guide, explainer, etc.) before writing begins. Each type has rules for what sections are required, allowed, and forbidden — preventing every article from looking like a generic blog post.',
    },
    {
      match: 'Verified',
      heading: 'The label says "Verified" not "Fact-checked"',
      explanation: '"Verified" communicates trust and authority. "Fact-checked" sounds defensive and suggests errors were expected. The green shield badge reinforces credibility without drawing attention to the AI origin.',
    },
  ]

  const results: Decision[] = []
  for (const w of wanted) {
    if (raw.includes(w.match)) {
      results.push({ heading: w.heading, explanation: w.explanation })
    }
  }

  // Add decisions not pulled from the file (specified in the prompt)
  results.push({
    heading: 'Freemium model with quality tiers',
    explanation: 'Free users get a stripped-down experience (fewer sections, basic visuals). Paid tiers unlock full article quality, more product cards, interactive charts, and priority generation.',
  })
  results.push({
    heading: 'Affiliate revenue is the long-term model',
    explanation: 'Every product recommendation will eventually contain affiliate links. Creators earn a share of revenue from clicks their articles generate. Subscriptions cover API costs; affiliates are the profit engine.',
  })
  results.push({
    heading: '12 categories, purpose-built',
    explanation: 'Articles are organised into 12 categories (Tech, Finance, Health, Travel, etc.) instead of arbitrary tags. Each category gets its own page, SEO strategy, and seed content at launch.',
  })
  results.push({
    heading: 'The .fyi domain',
    explanation: 'Short, memorable, and signals "information" without saying "AI". unpacked.fyi communicates depth — the product unpacks complex topics into structured, visual articles.',
  })

  return results
}

function parseKnownIssues(raw: string): string[] {
  const issues: string[] = []
  const lines = raw.split('\n')
  let inSection = false

  for (const line of lines) {
    if (line.includes('Known Risks & Loose Ends')) { inSection = true; continue }
    if (inSection && line.startsWith('---')) break
    if (inSection && /^\d+\.\s/.test(line)) {
      const cleaned = line
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/\s*—\s*.*$/, '') // trim after em dash for brevity
        .trim()
      if (cleaned.length > 5) issues.push(cleaned)
    }
  }
  return issues
}

// ── Page ──

export default function BuildPage() {
  const changelog = readMd('CHANGELOG.md')
  const claude = stripSensitive(readMd('CLAUDE.md'))
  const decisions = readMd('DECISIONS.md')
  const projectStatus = readMd('PROJECT_STATUS.md')

  const recentEntries = parseRecentChangelog(changelog)
  const stages = parseStagedPlan(claude)
  const keyDecisions = parseDecisions(decisions)
  const knownIssues = parseKnownIssues(projectStatus)

  const lastUpdated = recentEntries[0]?.date.split(' — ')[0] ?? 'Unknown'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
        .playfair { font-family: 'Playfair Display', Georgia, serif; }
      `}</style>

      <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">

          {/* Header */}
          <header className="text-center mb-4">
            <h1 className="playfair text-4xl md:text-5xl font-extrabold mb-1" style={{ color: '#1A1A1A' }}>
              Unpacked
            </h1>
            <p className="text-sm font-medium tracking-widest uppercase" style={{ color: '#94918D', fontFamily: 'system-ui, sans-serif' }}>
              Build Log
            </p>
          </header>
          <div className="mb-10 mx-auto" style={{ height: '2px', backgroundColor: '#BA7517', maxWidth: '120px' }} />

          {/* Section 1 — What is Unpacked */}
          <Card>
            <SectionLabel>What is Unpacked</SectionLabel>
            <p className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>
              Build a researched, fact-checked article on anything — in minutes.
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B6B6B' }}>
              A web platform where users type any question and receive a complete, beautifully designed, researched and fact-checked article in 2–3 minutes. Not a chat answer — a full editorial piece with product cards, comparison tables, interactive charts, real community sentiment, and a clear verdict. Every article is independently fact-checked after generation.
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B6B6B' }}>
              <strong style={{ color: '#1A1A1A' }}>Two modes:</strong> Create (generate your own article, refine it, publish it under your name) and Browse (discover articles others have created).
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B6B6B' }}>
              <strong style={{ color: '#1A1A1A' }}>Positioning:</strong> The AI does the research, you are the editor. Think Wirecutter meets Substack, user-generated.
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-xs" style={{ color: '#94918D' }}>
              <span>Next.js</span>
              <span>Supabase</span>
              <span>Tailwind CSS</span>
              <span>Vercel Pro</span>
              <span>Recharts</span>
            </div>
            <a
              href="https://articleai-three.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm font-semibold no-underline"
              style={{ color: '#BA7517' }}
            >
              View live site →
            </a>
          </Card>

          {/* Section 2 — Recently Built */}
          <Card>
            <SectionLabel>Recently Built</SectionLabel>
            {recentEntries.map((entry, i) => (
              <div key={i} className={i > 0 ? 'mt-6 pt-6' : ''} style={i > 0 ? { borderTop: '1px solid #E8E3DC' } : {}}>
                <h3 className="playfair text-base font-bold mb-3" style={{ color: '#1A1A1A' }}>
                  {entry.date}
                </h3>
                <ul className="space-y-1.5">
                  {entry.items.slice(0, 15).map((item, j) => (
                    <li key={j} className="text-sm flex items-start gap-2" style={{ color: '#6B6B6B' }}>
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#BA7517' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          {/* Section 3 — What's Coming */}
          <Card>
            <SectionLabel>What&apos;s Coming</SectionLabel>
            {stages.map((stage, i) => (
              <div key={i} className={i > 0 ? 'mt-6 pt-6' : ''} style={i > 0 ? { borderTop: '1px solid #E8E3DC' } : {}}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="playfair text-base font-bold" style={{ color: '#1A1A1A' }}>
                    {stage.name}
                  </h3>
                  {i >= 3 && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#F0EFED', color: '#94918D' }}
                    >
                      Planned
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {stage.items.map((item, j) => (
                    <li
                      key={j}
                      className="text-sm flex items-start gap-2"
                      style={{ color: item.done ? '#94918D' : '#1A1A1A' }}
                    >
                      {item.done ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border shrink-0 mt-0.5"
                          style={{ borderColor: '#D3D1C7' }}
                        />
                      )}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          {/* Section 4 — Key Decisions */}
          <Card>
            <SectionLabel>Key Decisions</SectionLabel>
            {keyDecisions.map((d, i) => (
              <div key={i} className={i > 0 ? 'mt-5 pt-5' : ''} style={i > 0 ? { borderTop: '1px solid #E8E3DC' } : {}}>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#1A1A1A' }}>
                  {d.heading}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B6B6B' }}>
                  {d.explanation}
                </p>
              </div>
            ))}
          </Card>

          {/* Section 5 — Known Issues */}
          <Card>
            <SectionLabel>Known Issues &amp; Loose Ends</SectionLabel>
            <div className="space-y-2">
              {knownIssues.map((issue, i) => (
                <div key={i} className="text-sm flex items-start gap-2" style={{ color: '#6B6B6B' }}>
                  <span className="text-xs font-bold shrink-0 mt-0.5 w-5 text-center" style={{ color: '#BA7517' }}>
                    {i + 1}
                  </span>
                  {issue}
                </div>
              ))}
            </div>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs mt-8" style={{ color: '#94918D' }}>
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>
    </>
  )
}

// ── Shared components ──

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8 mb-6"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #E8E3DC',
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-4"
      style={{ color: '#BA7517', letterSpacing: '0.1em' }}
    >
      {children}
    </p>
  )
}
