import type { ExecutiveSummary as ExecutiveSummaryType } from '@/types/article'

export default function ExecutiveSummary({ data }: { data: ExecutiveSummaryType }) {
  const hasShortAnswer = !!data.short_answer?.trim()
  const hasTakeaways = data.key_takeaways.length > 0
  const hasWarnings = data.watch_out_for.length > 0
  const showSideBySide = hasTakeaways && hasWarnings

  // If nothing to render, collapse entirely — prevents an empty block
  // for knowledge/news types that suppress short_answer and takeaways.
  if (!hasShortAnswer && !hasTakeaways && !hasWarnings) return null

  return (
    <div className="mb-8">
      {hasShortAnswer && (
        <p className="text-lg leading-relaxed mb-5" style={{ color: 'var(--text-primary)' }}>
          {data.short_answer}
        </p>
      )}

      {(hasTakeaways || hasWarnings) && (
        <div className={showSideBySide ? 'grid md:grid-cols-2 gap-4' : ''}>
          {hasTakeaways && (
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#f8faf8', border: '1px solid #d4e5d4' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
                Key Takeaways
              </p>
              <ul className="space-y-2">
                {data.key_takeaways.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && (
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#fff5f5', border: '1px solid #fecaca' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#dc2626' }}>
                Watch Out For
              </p>
              <ul className="space-y-1.5">
                {data.watch_out_for.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#7f1d1d' }}>
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
