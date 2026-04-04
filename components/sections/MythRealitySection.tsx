'use client'

interface MythRealityPair {
  myth: string
  reality: string
  evidence?: string
}

interface Props {
  section: {
    type: 'myth_reality'
    heading: string
    pairs: MythRealityPair[]
  }
}

export default function MythRealitySection({ section }: Props) {
  return (
    <div className="mb-8">
      <h3
        className="text-lg font-bold mb-6"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h3>
      <div className="space-y-6">
        {section.pairs.map((pair, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Myth block */}
            <div className="px-4 py-3" style={{ backgroundColor: '#FEF2F2' }}>
              <div className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" stroke="#DC2626" strokeWidth="1.5" />
                  <line x1="15" y1="9" x2="9" y2="15" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                  <line x1="9" y1="9" x2="15" y2="15" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#DC2626' }}>Myth</span>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: '#991B1B', fontFamily: 'var(--font-sora)' }}>
                    {pair.myth}
                  </p>
                </div>
              </div>
            </div>
            {/* Reality block */}
            <div className="px-4 py-3" style={{ backgroundColor: '#F0FDF4' }}>
              <div className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" stroke="#16A34A" strokeWidth="1.5" />
                  <polyline points="9 12 11 14 15 10" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#16A34A' }}>Reality</span>
                  <p className="text-sm leading-relaxed mt-0.5" style={{ color: '#166534' }}>
                    {pair.reality}
                  </p>
                  {pair.evidence && (
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {pair.evidence}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
