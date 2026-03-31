/**
 * Builds a research preview object from plan + research findings.
 * No extra API call needed — all data comes from what we already have.
 */

import type { ArticlePlan, EntityCard, ResearchSynthesis } from '@/types/article'

export interface ResearchPreviewData {
  title: string
  article_type: string
  entities_found: string[]
  source_count: number
  source_names: string[]
  teaser_line: string
  research_query_count: number
  // Enhanced fields (Session 1.7A)
  article_type_confidence?: number
  alternative_types?: string[]
  category?: string
  // Enhanced fields (Session 1.7B)
  source_quality?: string
}

interface ResearchFinding {
  source: string
  source_type: 'web' | 'reddit' | 'twitter'
  url: string
  content: string
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    // Friendly names for common sources
    const friendly: Record<string, string> = {
      'reddit.com': 'Reddit',
      'wirecutter.com': 'Wirecutter',
      'rtings.com': 'RTINGS',
      'tomsguide.com': "Tom's Guide",
      'theverge.com': 'The Verge',
      'techradar.com': 'TechRadar',
      'pcmag.com': 'PCMag',
      'cnet.com': 'CNET',
      'engadget.com': 'Engadget',
      'arstechnica.com': 'Ars Technica',
      'nytimes.com': 'NY Times',
      'bbc.com': 'BBC',
      'bbc.co.uk': 'BBC',
      'theguardian.com': 'The Guardian',
      'forbes.com': 'Forbes',
      'wired.com': 'WIRED',
      'youtube.com': 'YouTube',
      'twitter.com': 'Twitter/X',
      'x.com': 'Twitter/X',
    }
    if (friendly[hostname]) return friendly[hostname]
    const parts = hostname.split('.')
    const domain = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    return domain.charAt(0).toUpperCase() + domain.slice(1)
  } catch {
    return 'Web'
  }
}

export function buildResearchPreview(
  plan: ArticlePlan,
  findings: ResearchFinding[],
  entityCards?: EntityCard[],
  synthesis?: ResearchSynthesis,
): ResearchPreviewData {
  // Extract entity names — prefer entity cards (richer) over plan entities
  const entities_found = entityCards && entityCards.length > 0
    ? entityCards.slice(0, 5).map(c => c.canonical_name)
    : (plan.entities ?? []).slice(0, 5).map(e => e.name)

  // Extract unique source names from findings
  const seenDomains = new Set<string>()
  const source_names: string[] = []
  for (const f of findings) {
    const domain = f.source_type === 'reddit'
      ? f.source // Already like "r/headphones"
      : extractDomain(f.url)
    if (!seenDomains.has(domain)) {
      seenDomains.add(domain)
      source_names.push(domain)
    }
  }

  // Build teaser line — prefer synthesis thesis direction over plan preview
  let teaser_line = ''
  if (synthesis?.thesis_direction) {
    teaser_line = synthesis.thesis_direction
  } else if (plan.quick_verdict_preview) {
    teaser_line = plan.quick_verdict_preview
  } else if (findings.length > 0) {
    const first = findings.find(f => f.content.length > 40)
    if (first) {
      teaser_line = first.content.slice(0, 150)
      if (first.content.length > 150) teaser_line += '...'
    }
  }

  return {
    title: plan.title,
    article_type: plan.article_type,
    entities_found,
    source_count: seenDomains.size,
    source_names: source_names.slice(0, 6),
    teaser_line,
    research_query_count: plan.research_manifest?.brave_queries?.length ?? plan.research_queries?.length ?? 0,
    // Enhanced fields from plan
    article_type_confidence: plan.article_type_confidence,
    alternative_types: plan.alternative_types?.length ? plan.alternative_types : undefined,
    category: plan.category,
    // Enhanced fields from synthesis
    source_quality: synthesis?.source_quality || undefined,
  }
}
