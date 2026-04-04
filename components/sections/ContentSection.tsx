import React from 'react'
import type { ContentSection as ContentSectionType } from '@/types/article'
import { injectInternalLinks, type LinkableArticle } from '@/lib/internal-links'

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

/**
 * Break long paragraphs at sentence boundaries.
 * If a paragraph is >400 chars, split it into chunks of ~2-3 sentences each.
 */
function breakLongParagraphs(text: string): string[] {
  if (text.length <= 400) return [text]

  // Split on sentence boundaries (period + space + uppercase letter)
  const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/)
  if (sentences.length <= 2) return [text]

  // Group into chunks of 2-3 sentences
  const chunks: string[] = []
  let current: string[] = []
  let currentLen = 0

  for (const sentence of sentences) {
    current.push(sentence)
    currentLen += sentence.length

    if (currentLen >= 250 && current.length >= 2) {
      chunks.push(current.join(' '))
      current = []
      currentLen = 0
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(' '))
  }

  return chunks
}

/**
 * Extract a compelling pull quote from long content.
 * Looks for sentences with strong opinion markers or data points.
 * Returns null if content isn't long enough to warrant a pull quote.
 */
function extractPullQuote(content: string): string | null {
  // Only for sections with substantial content (>800 chars, ~150+ words)
  if (content.length < 800) return null

  const sentences = content
    .replace(/\n\n+/g, ' ')
    .split(/(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 200)

  // Prefer sentences with opinion/data markers
  const strongMarkers = /\b(the (real|biggest|key|most important)|what (most people|nobody)|the truth is|in (reality|practice)|surprisingly|remarkably|the winner|the clear|bottom line|the difference)\b/i
  const dataMarkers = /\b(\d+%|\$[\d,.]+|[2-9]\d*x|\d+ (times|percent|out of))\b/

  // Score each sentence
  const scored = sentences.map(s => {
    let score = 0
    if (strongMarkers.test(s)) score += 3
    if (dataMarkers.test(s)) score += 2
    // Avoid sentences starting with "However," or other weak openers
    if (/^(However|But|Although|That said|While)/i.test(s)) score -= 1
    // Prefer sentences that make a clear statement
    if (/\b(is|are|was|will)\b/i.test(s) && !s.includes('?')) score += 1
    return { text: s, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  if (!best || best.score < 2) return null

  // Clean up: remove bold markers and leading connectors
  return best.text
    .replace(/\*\*/g, '')
    .replace(/^(And |So |But )/i, '')
    .trim()
}

function renderContent(content: string, linkTransform?: (text: string) => string) {
  // Pipeline: text → injectLinks → boldify → HTML
  const transform = (text: string) => boldify(linkTransform ? linkTransform(text) : text)

  const paragraphs = content.split(/\n\n+/)
  const elements: React.ReactElement[] = []

  for (let i = 0; i < paragraphs.length; i++) {
    let para = paragraphs[i].trim()
    if (!para) continue

    // Safety net: convert markdown headings (## Heading) into styled subheadings
    const headingMatch = para.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      elements.push(
        <h4
          key={`heading-${i}`}
          className="text-base font-bold mt-6 mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {headingMatch[1]}
        </h4>
      )
      continue
    }

    // Strip markdown heading syntax from lines within a paragraph (multi-line content)
    para = para.replace(/^#{1,3}\s+/gm, '')

    // List items
    if (para.startsWith('- ') || para.startsWith('* ')) {
      const items = para.split('\n').filter((l) => l.startsWith('- ') || l.startsWith('* '))
      elements.push(
        <ul key={i} className="list-disc pl-5 mb-4 space-y-1">
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: transform(item.slice(2)) }} />
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
                  dangerouslySetInnerHTML={{ __html: transform(boldMatch[2]) }}
                />
              )}
            </div>
          )
          continue
        }
      }

      // Break long paragraphs into shorter ones
      const chunks = breakLongParagraphs(sub)
      for (let k = 0; k < chunks.length; k++) {
        elements.push(
          <p
            key={`${i}-${j}-${k}`}
            className="mb-4 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: transform(chunks[k]) }}
          />
        )
      }
    }
  }

  return elements
}

function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

interface ContentSectionProps {
  section: ContentSectionType
  currentSlug?: string
  relatedArticles?: LinkableArticle[]
}

export default function ContentSection({ section, currentSlug, relatedArticles }: ContentSectionProps) {
  // Build the link transform if we have linkable articles
  const linkTransform = (currentSlug && relatedArticles?.length)
    ? (text: string) => injectInternalLinks(text, currentSlug, relatedArticles, 3)
    : undefined

  // Safety net: strip duplicate heading from content body
  // (visual_list items sometimes repeat the item name as the first line)
  let content = section.content
  if (section.heading && content) {
    const headingNorm = section.heading.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const firstLine = content.split(/\n\n/)[0]?.trim() ?? ''
    const firstLineNorm = firstLine.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/^\*\*(.+?)\*\*$/, '$1').trim()
    if (headingNorm && firstLineNorm && (
      firstLineNorm === headingNorm ||
      firstLineNorm.startsWith(headingNorm) ||
      headingNorm.startsWith(firstLineNorm)
    )) {
      // Remove the duplicate first line
      const rest = content.slice(content.indexOf('\n\n'))
      if (rest.trim()) {
        content = rest.trim()
      }
    }
  }

  const pullQuote = extractPullQuote(content)

  return (
    <div className="mb-8">
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        {section.heading}
      </h2>
      <div className="prose-content" style={{ color: 'var(--text-primary)' }}>
        {renderContent(content, linkTransform)}
      </div>
      {pullQuote && (
        <div
          className="my-8 mx-auto"
          style={{
            maxWidth: '720px',
            borderLeft: '3px solid #BA7517',
            padding: '0.75rem 0 0.75rem 1.5rem',
          }}
        >
          <p
            className="text-base italic leading-relaxed"
            style={{ color: 'var(--text-primary)' }}
          >
            {pullQuote}
          </p>
        </div>
      )}
    </div>
  )
}
