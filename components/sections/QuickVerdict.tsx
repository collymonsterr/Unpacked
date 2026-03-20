import type { QuickVerdict as QuickVerdictType } from '@/types/article'

export default function QuickVerdict({ data }: { data: QuickVerdictType }) {
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
          <p className="text-xl md:text-2xl font-bold leading-tight mb-1" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            {data.recommendation}
          </p>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            {data.one_liner}
          </p>
        </div>
      </div>
    </div>
  )
}
