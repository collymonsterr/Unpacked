'use client'

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface RankedItem {
  rank: number
  name: string
  content: string
  image_query?: string
}

interface Props {
  section: {
    type: 'ranked_item'
    heading: string
    items: RankedItem[]
  }
}

export default function RankedItemSection({ section }: Props) {
  return (
    <div className="mb-8">
      <h3
        className="text-lg font-bold mb-6"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h3>
      <div className="space-y-6">
        {section.items.map((item, i) => (
          <div key={i} className="flex gap-4 md:gap-6">
            {/* Large rank number */}
            <div
              className="flex-shrink-0 flex items-start justify-center"
              style={{ minWidth: '48px' }}
            >
              <span
                className="text-4xl font-bold"
                style={{ color: '#BA7517', fontFamily: 'var(--font-sora)', lineHeight: 1 }}
              >
                {item.rank}
              </span>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4
                className="text-base font-bold mb-1"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {item.name}
              </h4>
              <div
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: escapeHtml(item.content).replace(/\n\n/g, '<br/><br/>') }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
