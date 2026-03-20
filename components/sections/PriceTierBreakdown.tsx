import type { PriceTierBreakdown as PriceTierBreakdownType } from '@/types/article'

export default function PriceTierBreakdown({ section }: { section: PriceTierBreakdownType }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h2>
      <div className="space-y-3">
        {section.tiers.map((tier, i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex flex-col gap-3">
              <div>
                <p
                  className="text-sm font-bold uppercase tracking-wide mb-1"
                  style={{ color: 'var(--accent)' }}
                >
                  {tier.range}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {tier.summary}
                </p>
              </div>
              {tier.pick && (
                <div
                  className="text-sm font-semibold italic px-4 py-2 rounded-lg border-l-4"
                  style={{
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)',
                    borderLeftColor: 'var(--accent)',
                  }}
                >
                  {tier.pick}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
