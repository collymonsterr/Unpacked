import React from 'react'
import type { ContentSection as ContentSectionType } from '@/types/article'

/**
 * Split a long paragraph that uses bold as section markers into separate blocks.
 * e.g. "**Choose X** if you need... **Choose Y** if you want..." becomes separate paragraphs.
 */
function splitBoldParagraphs(text: string): string[] {
  // If the paragraph has multiple bold-starting segments, split them
  // Pattern: bold text at the start of a sentence (after ". " or at start)
  const boldStarts = text.match(/\*\*[^*]+\*\*/g)
  if (!boldStarts || boldStarts.length <= 1) return [text]

  // Split on bold markers that start a new thought
  // Look for ". **" or the very start "**"
  const parts = text.split(/(?<=\.)\s+(?=\*\*[A-Z])/)
  if (parts.length > 1) return parts.map(p => p.trim()).filter(p => p.length > 0)

  return [text]
}

function renderContent(content: string) {
  const paragraphs = content.split(/\n\n+/)
  const elements: React.ReactElement[] = []

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim()
    if (!para) continue

    // List items
    if (para.startsWith('- ') || para.startsWith('* ')) {
      const items = para.split('\n').filter((l) => l.startsWith('- ') || l.startsWith('* '))
      elements.push(
        <ul key={i} className="list-disc pl-5 mb-4 space-y-1">
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: boldify(item.slice(2)) }} />
          ))}
        </ul>
      )
      continue
    }

    // Check if this paragraph has multiple bold-started sections crammed together
    const subParagraphs = splitBoldParagraphs(para)

    for (let j = 0; j < subParagraphs.length; j++) {
      const sub = subParagraphs[j]

      // If it starts with bold, render as a distinct block with the bold as a mini-heading
      if (sub.startsWith('**') && subParagraphs.length > 1) {
        const boldMatch = sub.match(/^\*\*(.+?)\*\*\s*(.*)/)
        if (boldMatch) {
          elements.push(
            <div key={`${i}-${j}`} className="mb-4">
              <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {boldMatch[1]}
              </p>
              {boldMatch[2] && (
                <p
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: boldify(boldMatch[2]) }}
                />
              )}
            </div>
          )
          continue
        }
      }

      elements.push(
        <p
          key={`${i}-${j}`}
          className="mb-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: boldify(sub) }}
        />
      )
    }
  }

  return elements
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
