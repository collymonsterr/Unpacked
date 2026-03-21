import type { FurtherReading as FurtherReadingType } from '@/types/article'

export default function FurtherReading({ section }: { section: FurtherReadingType }) {
  return (
    <div
      className="mb-8 rounded-xl p-5"
      style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-widest mb-4"
        style={{ color: 'var(--accent)' }}
      >
        Further Reading
      </h2>
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              style={{ opacity: 0.6 }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.title}
              </a>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
