import type { QuickVerdict as QuickVerdictType } from '@/types/article'

/**
 * Split a long verdict into bullet points at natural break points.
 * Only splits if the text is long enough to warrant it (>80 chars).
 */
function splitVerdict(text: string): string[] {
  if (text.length < 80) return [text]

  // Try splitting on common patterns:
  // 1. Numbered points: "1. ... 2. ... 3. ..."
  const numbered = text.match(/\d+\.\s+[^.]+\./g)
  if (numbered && numbered.length >= 2) return numbered.map(s => s.trim())

  // 2. Semicolons
  if (text.includes(';')) {
    const parts = text.split(';').map(s => s.trim()).filter(s => s.length > 5)
    if (parts.length >= 2) return parts.map(s => s.replace(/\.$/, ''))
  }

  // 3. Split on ", and " or ", then " as a final clause
  // Split on commas followed by "and" or action verbs — but only if it creates 2-4 parts
  const colonSplit = text.split(':')
  if (colonSplit.length === 2 && colonSplit[1].includes(',')) {
    const intro = colonSplit[0].trim()
    const rest = colonSplit[1].trim()
    // Split the rest on ", " followed by "and " or at natural clause boundaries
    const clauses = rest.split(/,\s+(?=and\s|then\s|plus\s)/i)
    if (clauses.length >= 2) {
      return [intro + ':', ...clauses.map(s => s.trim().replace(/\.$/, ''))]
    }
    // Try splitting on all commas if they create reasonable chunks
    const allComma = rest.split(/,\s+/).filter(s => s.length > 10)
    if (allComma.length >= 2 && allComma.length <= 5) {
      return [intro + ':', ...allComma.map(s => s.trim().replace(/\.$/, ''))]
    }
  }

  return [text]
}

export default function QuickVerdict({ data }: { data: QuickVerdictType }) {
  const points = splitVerdict(data.recommendation)
  const isBulleted = points.length > 1

  return (
    <div
      className="rounded-2xl p-6 md:p-8 mb-8"
      style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          Verdict
        </span>
        <div>
          {isBulleted ? (
            <ul className="space-y-1.5 mb-1">
              {points.map((point, i) => {
                // First item might be an intro (ends with ":")
                const isIntro = i === 0 && point.endsWith(':')
                return (
                  <li
                    key={i}
                    className={`text-lg md:text-xl font-bold leading-snug ${isIntro ? '' : 'flex items-start gap-2'}`}
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                  >
                    {!isIntro && (
                      <span
                        className="mt-2.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                    <span>{point}{!isIntro && i < points.length - 1 ? '' : ''}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p
              className="text-xl md:text-2xl font-bold leading-tight mb-1"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {data.recommendation}
            </p>
          )}
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            {data.one_liner}
          </p>
        </div>
      </div>
    </div>
  )
}
