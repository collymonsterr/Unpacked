import type { CommunityInsights as CommunityInsightsType } from '@/types/article'

const consensusConfig = {
  strong: { label: 'Mostly positive', color: '#16a34a', bg: '#f0fdf4' },
  mixed: { label: 'Mixed opinions', color: '#d97706', bg: '#fffbeb' },
  divided: { label: 'Divided', color: '#dc2626', bg: '#fff5f5' },
}

const sentimentDot: Record<string, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  mixed: '#d97706',
}

export default function CommunityInsights({ section }: { section: CommunityInsightsType }) {
  const cfg = consensusConfig[section.consensus] ?? consensusConfig.mixed
  const quotes = section.quotes?.slice(0, 2) ?? []
  const threads = section.reddit_threads?.slice(0, 5) ?? []

  return (
    <div className="mb-8" style={{ borderTop: '3px solid #BA7517', paddingTop: '24px' }}>
      {/* Heading + sentiment pill */}
      <div className="flex items-center gap-3 mb-1">
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          What real people think
        </h2>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Subheading */}
      <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
        Sourced from Reddit, Twitter/X, and community forums
      </p>

      {/* Consensus summary */}
      <p className="mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {section.consensus_summary}
      </p>

      {/* Pull quotes — between summary and platform cards */}
      {quotes.length > 0 && (
        <div className="mb-5 space-y-3">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="pl-4 py-2"
              style={{
                borderLeft: '3px solid #BA7517',
              }}
            >
              <p
                className="text-sm leading-relaxed mb-1"
                style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}
              >
                &ldquo;{q.text}&rdquo;
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {q.source}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Platform insight cards — existing design preserved */}
      <div className="space-y-3">
        {section.insights.map((insight, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: sentimentDot[insight.sentiment] ?? '#6b7280' }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {(() => {
                  // Extract subreddit from source like "Reddit r/headphones" or "Reddit r/headphoneadvice"
                  const subMatch = insight.source.match(/r\/(\w+)/i)
                  if (subMatch) {
                    const sub = subMatch[0] // e.g. "r/headphones"
                    const prefix = insight.source.slice(0, insight.source.indexOf(sub)).trim()
                    return (
                      <>
                        {prefix && <>{prefix} </>}
                        <a
                          href={`https://reddit.com/${sub}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="no-underline hover:underline"
                          style={{ color: '#BA7517' }}
                        >
                          {sub}
                        </a>
                      </>
                    )
                  }
                  return insight.source
                })()}
              </span>
              {/* Reddit icon next to REDDIT label */}
              {insight.source.toLowerCase().includes('reddit') && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4500" className="shrink-0">
                  <circle cx="12" cy="12" r="12" fill="#FF4500" />
                  <path d="M18.5 12.5c0-.5-.2-1-.6-1.3.1-.3.1-.7.1-1 0-2.8-3.1-5-7-5s-7 2.2-7 5c0 .3 0 .7.1 1-.4.3-.6.8-.6 1.3 0 .9.7 1.6 1.6 1.6.4 0 .8-.2 1.1-.4 1.1.8 2.5 1.3 4.1 1.3h.2l1.4 2.1c.2.3.5.4.8.4h.3c.5-.1.8-.6.7-1.1l-.3-1.5c1.1-.3 2-.8 2.6-1.4.3.2.6.3 1 .3.9 0 1.6-.7 1.6-1.6z" fill="#fff" />
                </svg>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {insight.summary}
            </p>
          </div>
        ))}
      </div>

      {/* Reddit thread cards */}
      {threads.length > 0 && (
        <div className="mt-5">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
          >
            Related discussions
          </p>
          <div className="space-y-2">
            {threads.map((thread, i) => (
              <a
                key={i}
                href={thread.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 no-underline transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-light)'
                  e.currentTarget.style.borderColor = '#BA7517'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium leading-snug line-clamp-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {thread.title}
                  </p>
                  <a
                    href={`https://reddit.com/${thread.subreddit.startsWith('r/') ? thread.subreddit : 'r/' + thread.subreddit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-0.5 no-underline hover:underline block"
                    style={{ color: '#BA7517' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {thread.subreddit}
                  </a>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
