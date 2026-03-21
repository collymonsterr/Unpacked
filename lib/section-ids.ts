import type { ArticleSection, ArticleContent } from '@/types/article'

export interface NavItem {
  id: string
  label: string
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  // Try to break at a word boundary
  const trimmed = text.slice(0, max)
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace > max * 0.6) return trimmed.slice(0, lastSpace) + '…'
  return trimmed.trimEnd() + '…'
}

function getSectionLabel(section: ArticleSection): string | null {
  switch (section.type) {
    case 'product_card':
      return section.entity_name || section.heading
    case 'comparison_table':
    case 'comparison_matrix':
      return 'Comparison'
    case 'warning_box':
      return 'What to avoid'
    case 'community_insights':
      return 'Community'
    case 'sources':
      return 'Sources'
    case 'price_tier_breakdown':
      return 'Price breakdown'
    case 'who_this_is_for':
      return 'Who this is for'
    case 'head_to_head':
      return 'Head to head'
    case 'image_section':
      return null
    case 'stat_cards':
      return 'Key numbers'
    case 'interactive_calculator':
      return (section as { heading?: string }).heading || 'Calculator'
    case 'bar_chart':
    case 'line_chart':
    case 'pie_chart':
    case 'treemap':
      return null // Skip charts from nav — they're visual aids, not destinations
    case 'timeline':
      return 'Timeline'
    case 'content_section':
      return (section as { heading?: string }).heading || null
    default:
      return (section as { heading?: string }).heading || null
  }
}

/**
 * Build the nav items list from article content.
 * Short, clean labels — one line each. Skips charts and image sections.
 */
export function buildNavItems(article: ArticleContent): NavItem[] {
  const items: NavItem[] = [
    { id: 'section-verdict', label: 'Quick verdict' },
    { id: 'section-summary', label: 'Summary' },
  ]

  for (let i = 0; i < article.sections.length; i++) {
    const section = article.sections[i]
    const rawLabel = getSectionLabel(section)
    if (!rawLabel) continue

    items.push({
      id: `section-${i}`,
      label: truncate(rawLabel, 20),
    })
  }

  return items
}
