import type { HeadToHeadShowdown } from '@/types/article'

export default function HeadToHead({ section }: { section: HeadToHeadShowdown }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h2>
      <div className="space-y-3">
        {section.categories.map((cat, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {cat.category}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {cat.explanation}
                </p>
              </div>
              <div
                className="shrink-0 text-sm font-bold px-3 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {cat.winner}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
