import type { QuickVerdict as QuickVerdictType } from '@/types/article'

/**
 * For legacy articles: split a long recommendation into bullets.
 */
function splitLegacy(text: string): string[] {
  if (text.length < 60) return [text]
  // Split on semicolons
  if (text.includes(';')) {
    return text.split(';').map(s => s.trim()).filter(s => s.length > 3)
  }
  // Split on ". " followed by a capital letter (sentence boundaries)
  const sentences = text.split(/\.\s+(?=[A-Z])/).map(s => s.replace(/\.$/, '').trim()).filter(s => s.length > 10)
  if (sentences.length >= 2) return sentences
  return [text]
}

export default function QuickVerdict({ data }: { data: QuickVerdictType }) {
  // Use new bullets format, fall back to splitting legacy recommendation
  const bullets = data.bullets?.length
    ? data.bullets
    : data.recommendation
      ? splitLegacy(data.recommendation)
      : [data.one_liner]

  return (
    <div
      className="rounded-2xl p-6 md:p-8 mb-8"
      style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
    >
      <div>
        <span
          className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          Verdict
        </span>
        <ul className="space-y-2">
          {bullets.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5"
            >
              <span
                className="mt-2 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <span
                className="text-sm md:text-lg font-bold leading-snug"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {point}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
