export default function TrustStrip() {
  return (
    <div
      className="w-full py-4"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        {/* Signal 1: Real sources */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-xs" style={{ color: '#888', fontFamily: 'var(--font-outfit)' }}>
            Real sources — expert reviews, Reddit, and specialist sites
          </span>
        </div>

        <span className="hidden sm:inline text-xs" style={{ color: '#ddd' }}>|</span>

        {/* Signal 2: Triple fact-checked */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-xs font-medium" style={{ color: '#888', fontFamily: 'var(--font-outfit)' }}>
              Triple fact-checked
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E1F5EE', color: '#085041', fontWeight: 500 }}>
                Gemini
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E6F1FB', color: '#0C447C', fontWeight: 500 }}>
                Grok
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EEEDFE', color: '#3C3489', fontWeight: 500 }}>
                Perplexity
              </span>
            </div>
          </div>
        </div>

        <span className="hidden sm:inline text-xs" style={{ color: '#ddd' }}>|</span>

        {/* Signal 3: Community insights */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-xs" style={{ color: '#888', fontFamily: 'var(--font-outfit)' }}>
            Community insights from real user discussions
          </span>
        </div>
      </div>
    </div>
  )
}
