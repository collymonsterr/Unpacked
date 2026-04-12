export default function TrustStrip() {
  return (
    <div
      className="w-full"
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border-tertiary, #e2e0d8)',
        borderBottom: '1px solid var(--border-tertiary, #e2e0d8)',
        padding: '18px 0',
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        {/* Desktop: three columns with vertical dividers */}
        <div className="hidden sm:flex items-center justify-center gap-0">
          {/* Column 1: Real opinions */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Real opinions. Clear verdict.
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--card, #f0efed)', color: 'var(--text-primary)' }}>
                Reddit
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--card, #f0efed)', color: 'var(--text-primary)' }}>
                X
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--card, #f0efed)', color: 'var(--text-primary)' }}>
                Expert reviews
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '36px', backgroundColor: 'var(--border-tertiary, #e2e0d8)' }} />

          {/* Column 2: Triple fact-checked */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Triple fact-checked
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E1F5EE', color: '#0F6E56' }}>
                Gemini
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EEEDFE', color: '#534AB7' }}>
                Claude
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E6F1FB', color: '#185FA5' }}>
                Grok
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '36px', backgroundColor: 'var(--border-tertiary, #e2e0d8)' }} />

          {/* Column 3: Live data */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Live data. Not training data.
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                Polymarket
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                Yahoo Finance
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                Google Trends
              </span>
            </div>
          </div>
        </div>

        {/* Mobile: stacked vertically with horizontal dividers */}
        <div className="flex sm:hidden flex-col items-center gap-4">
          {/* Column 1: Real opinions */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Real opinions. Clear verdict.
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--card, #f0efed)', color: 'var(--text-primary)' }}>
                Reddit
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--card, #f0efed)', color: 'var(--text-primary)' }}>
                X
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--card, #f0efed)', color: 'var(--text-primary)' }}>
                Expert reviews
              </span>
            </div>
          </div>

          {/* Horizontal divider */}
          <div style={{ width: '80px', height: '1px', backgroundColor: 'var(--border-tertiary, #e2e0d8)' }} />

          {/* Column 2: Triple fact-checked */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Triple fact-checked
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E1F5EE', color: '#0F6E56' }}>
                Gemini
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EEEDFE', color: '#534AB7' }}>
                Claude
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E6F1FB', color: '#185FA5' }}>
                Grok
              </span>
            </div>
          </div>

          {/* Horizontal divider */}
          <div style={{ width: '80px', height: '1px', backgroundColor: 'var(--border-tertiary, #e2e0d8)' }} />

          {/* Column 3: Live data */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Live data. Not training data.
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                Polymarket
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                Yahoo Finance
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                Google Trends
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
