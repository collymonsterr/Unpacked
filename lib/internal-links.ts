/**
 * Inject inline internal links into article body text.
 * Matches other published article titles (4+ words) in plain text
 * and wraps the first occurrence with an anchor tag.
 *
 * IMPORTANT: Run this BEFORE boldify() — it operates on plain text
 * with **bold** markers, not on HTML.
 */

const LINK_STYLE = 'color:#BA7517;font-weight:500;text-decoration:underline;text-underline-offset:2px'

export interface LinkableArticle {
  title: string
  slug: string
}

/**
 * Inject internal links into a content string.
 * Returns the content with up to `maxLinks` anchor tags inserted.
 *
 * @param content - Plain text with **bold** markers (not HTML)
 * @param currentSlug - The current article's slug (to avoid self-linking)
 * @param relatedArticles - Other published articles to match against
 * @param maxLinks - Maximum links to inject (default 3)
 */
export function injectInternalLinks(
  content: string,
  currentSlug: string,
  relatedArticles: LinkableArticle[],
  maxLinks = 3
): string {
  if (!content || !relatedArticles.length) return content

  let result = content
  let linksInjected = 0

  for (const article of relatedArticles) {
    if (linksInjected >= maxLinks) break

    // Skip self
    if (article.slug === currentSlug) continue

    // Only match titles with 4+ words
    const words = article.title.split(/\s+/)
    if (words.length < 4) continue

    // Build search phrases: full title first, then first 6 words, then first 4 words
    const phrases: string[] = [article.title]
    if (words.length > 6) phrases.push(words.slice(0, 6).join(' '))
    if (words.length > 4) phrases.push(words.slice(0, 4).join(' '))

    for (const phrase of phrases) {
      if (linksInjected >= maxLinks) break

      // Case-insensitive search
      const lowerContent = result.toLowerCase()
      const lowerPhrase = phrase.toLowerCase()
      const idx = lowerContent.indexOf(lowerPhrase)

      if (idx === -1) continue

      // Check: is this match inside a **bold** marker?
      // Look for an unmatched ** before the match
      const before = result.slice(0, idx)
      const boldOpens = (before.match(/\*\*/g) || []).length
      if (boldOpens % 2 !== 0) continue // Inside a bold span

      // Check: is this match already inside an <a> tag? (shouldn't be at this stage, but safety check)
      if (before.lastIndexOf('<a ') > before.lastIndexOf('</a>')) continue

      // Extract the original-cased text from the content
      const originalText = result.slice(idx, idx + phrase.length)

      // Inject the link
      const link = `<a href="/article/${article.slug}" style="${LINK_STYLE}">${originalText}</a>`
      result = result.slice(0, idx) + link + result.slice(idx + phrase.length)
      linksInjected++

      break // Move to next article (only link first occurrence per article)
    }
  }

  return result
}
