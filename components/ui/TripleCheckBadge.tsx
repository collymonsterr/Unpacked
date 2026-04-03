/**
 * Small "Triple checked" badge for article cards.
 * Shows in the bottom-right corner of the card's image area.
 * Only render when the article has fact_check data.
 */
export default function TripleCheckBadge() {
  return (
    <div
      className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5"
      style={{
        backgroundColor: 'rgba(27, 113, 49, 0.9)',
        borderRadius: '6px',
        padding: '4px 8px',
      }}
    >
      {/* Shield icon */}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      <span style={{ color: '#fff', fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>
        Triple checked
      </span>
      {/* Three model dots */}
      <div className="flex items-center gap-0.5 ml-0.5">
        <span className="rounded-full" style={{ width: '6px', height: '6px', backgroundColor: '#22C55E' }} />
        <span className="rounded-full" style={{ width: '6px', height: '6px', backgroundColor: '#3B82F6' }} />
        <span className="rounded-full" style={{ width: '6px', height: '6px', backgroundColor: '#8B5CF6' }} />
      </div>
    </div>
  )
}
