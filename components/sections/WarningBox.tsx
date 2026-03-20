import type { WarningBox as WarningBoxType } from '@/types/article'

export default function WarningBox({ section }: { section: WarningBoxType }) {
  return (
    <div
      className="rounded-2xl p-6 mb-8"
      style={{
        backgroundColor: '#1a1a1a',
        color: '#fff',
      }}
    >
      <h2
        className="text-lg font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}
      >
        {section.heading}
      </h2>
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-0.5 text-red-400 shrink-0">✕</span>
            <div>
              <span className="font-semibold text-white">{item.name}:</span>{' '}
              <span style={{ color: '#a3a3a3' }}>{item.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
