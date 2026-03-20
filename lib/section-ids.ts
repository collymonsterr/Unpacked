import type { ArticleSection, ArticleContent } from '@/types/article'

export interface NavItem {
  id: string
  label: string
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
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
    case 'image_section':
      return null // Skip image sections from nav
    case 'content_section':
    case 'bar_chart':
    case 'stat_cards':
    case 'timeline':
    case 'line_chart':
    case 'pie_chart':
    case 'treemap':
    case 'head_to_head':
    case 'who_this_is_for':
      return (section as { heading?: string }).heading || null
    default:
      return (section as { heading?: string }).heading || null
  }
}

/**
 * Build the nav items list from article content.
 * Returns items for quick_verdict, executive_summary, and every
 * section that has a displayable label (skips image_section).
 *
 * The `id` for sections uses the array index to guarantee consistency
 * between the sidebar nav and the section renderer.
 */
export function buildNavItems(article: ArticleContent): NavItem[] {
  const shouldTruncate = article.sections.length > 10
  const maxLen = shouldTruncate ? 25 : 40

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
      label: truncate(rawLabel, maxLen),
    })
  }

  return items
}
