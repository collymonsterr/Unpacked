import type { CommunityInsights as CommunityInsightsType } from '@/types/article'

const consensusConfig = {
  strong: { label: 'Strong Consensus', color: '#16a34a', bg: '#f0fdf4' },
  mixed: { label: 'Mixed Opinions', color: '#d97706', bg: '#fffbeb' },
  divided: { label: 'Divided', color: '#dc2626', bg: '#fff5f5' },
}

const sentimentDot: Record<string, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  mixed: '#d97706',
}

export default function CommunityInsights({ section }: { section: CommunityInsightsType }) {
  const cfg = consensusConfig[section.consensus] ?? consensusConfig.mixed

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {section.heading}
        </h2>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      <p className="mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {section.consensus_summary}
      </p>

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
                {insight.source}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {insight.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
