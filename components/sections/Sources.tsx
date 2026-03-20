import type { Sources as SourcesType } from '@/types/article'

export default function Sources({ section }: { section: SourcesType }) {
  return (
    <div
      className="mb-8 rounded-xl p-5"
      style={{ backgroundColor: '#f5f4f0', border: '1px solid var(--border)' }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Sources
      </h2>
      <ol className="space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span style={{ color: 'var(--text-secondary)', minWidth: '1.5rem' }}>{i + 1}.</span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-opacity hover:opacity-70 break-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.title || item.url}
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
