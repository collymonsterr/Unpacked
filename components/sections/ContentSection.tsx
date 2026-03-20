import type { ContentSection as ContentSectionType } from '@/types/article'

function renderContent(content: string) {
  // Basic markdown-to-HTML: bold, paragraphs, lists
  const paragraphs = content.split(/\n\n+/)
  return paragraphs.map((para, i) => {
    if (para.startsWith('- ') || para.startsWith('* ')) {
      const items = para.split('\n').filter((l) => l.startsWith('- ') || l.startsWith('* '))
      return (
        <ul key={i} className="list-disc pl-5 mb-4 space-y-1">
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: boldify(item.slice(2)) }} />
          ))}
        </ul>
      )
    }
    return (
      <p
        key={i}
        className="mb-4 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: boldify(para) }}
      />
    )
  })
}

function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export default function ContentSection({ section }: { section: ContentSectionType }) {
  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h2>
      <div className="prose-content" style={{ color: 'var(--text-primary)' }}>
        {renderContent(section.content)}
      </div>
    </div>
  )
}
