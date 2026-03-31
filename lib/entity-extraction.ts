/**
 * Entity Card Extraction (Session 1.7B)
 *
 * Builds structured entity cards from plan entities + research findings.
 * Pure synchronous function — no API calls, no async.
 * Uses simple string matching and heuristics. Does NOT need to be perfect —
 * the co-pilot will let creators correct mistakes.
 */

import type { ArticleType, EntityCard, EntityFact, EntityType, PlanEntity } from '@/types/article'

interface Finding {
  id: string
  source: string
  source_type: 'web' | 'reddit' | 'twitter'
  url: string
  content: string
  used_in_article: boolean
}

// Established review sites get "high" confidence
const HIGH_CONFIDENCE_DOMAINS = new Set([
  'wirecutter.com', 'rtings.com', 'tomsguide.com', 'theverge.com',
  'techradar.com', 'pcmag.com', 'cnet.com', 'engadget.com',
  'arstechnica.com', 'nytimes.com', 'bbc.com', 'bbc.co.uk',
  'theguardian.com', 'forbes.com', 'wired.com', 'reuters.com',
  'apnews.com', 'nature.com', 'science.org',
])

function getConfidence(finding: Finding): 'high' | 'medium' | 'low' {
  if (finding.source_type === 'reddit') return 'medium'
  if (finding.source_type === 'twitter') return 'low'
  try {
    const hostname = new URL(finding.url).hostname.replace(/^www\./, '')
    if (HIGH_CONFIDENCE_DOMAINS.has(hostname)) return 'high'
  } catch {
    // ignore
  }
  return 'medium'
}

/**
 * Infer entity type from plan entity fields and article type.
 */
function inferEntityType(entity: PlanEntity, articleType: ArticleType): EntityType {
  const cat = (entity.product_category ?? '').toLowerCase()
  if (cat === 'software' || cat === 'app') return 'concept'
  if (cat === 'service') return 'concept'
  if (cat === 'person') return 'person'
  if (cat === 'place') return 'place'
  if (cat === 'concept') return 'concept'
  if (cat === 'event') return 'event'

  // Product-focused article types default entities to "product"
  const productTypes: ArticleType[] = ['buyer_guide', 'comparison', 'decision_guide', 'roundup']
  if (productTypes.includes(articleType) && cat) return 'product'

  // If the entity has a product_category that looks physical, it's a product
  if (cat && !['software', 'service', 'person', 'place', 'concept', 'event'].includes(cat)) {
    return 'product'
  }

  // News/analysis types default to concept
  const conceptTypes: ArticleType[] = ['news_analysis', 'breaking_news', 'trend_analysis', 'deep_dive', 'explainer']
  if (conceptTypes.includes(articleType)) return 'concept'

  return 'concept'
}

/**
 * Check if a finding's content mentions an entity (case-insensitive).
 */
function mentionsEntity(content: string, name: string, aliases: string[]): boolean {
  const lower = content.toLowerCase()
  if (lower.includes(name.toLowerCase())) return true
  for (const alias of aliases) {
    if (alias.length >= 3 && lower.includes(alias.toLowerCase())) return true
  }
  return false
}

/**
 * Generate likely aliases for an entity name.
 */
function generateAliases(name: string): string[] {
  const aliases: string[] = []

  // Split by spaces — last word is often a model number
  const parts = name.split(/\s+/)
  if (parts.length >= 2) {
    // Last part alone (e.g., "XM6" from "Sony WH-1000XM6")
    const last = parts[parts.length - 1]
    if (last.length >= 3) aliases.push(last)

    // First part alone if it's a brand (e.g., "Sony")
    // Skip if it's a generic word
    if (parts[0].length >= 3) aliases.push(parts[0])
  }

  // Model numbers with hyphens — try without hyphens
  if (name.includes('-')) {
    aliases.push(name.replace(/-/g, ''))
  }

  return [...new Set(aliases)]
}

/**
 * Extract dollar prices from text.
 */
function extractPricesFromText(text: string): string[] {
  const matches = text.match(/\$[\d,]+(?:\.\d{2})?/g) ?? []
  return [...new Set(matches)]
}

/**
 * Detect numerical conflicts between facts about the same topic.
 * Returns conflict descriptions.
 */
function detectConflicts(facts: EntityFact[]): string[] {
  const conflicts: string[] = []
  const priceValues = new Map<string, Set<string>>()

  for (const fact of facts) {
    const prices = extractPricesFromText(fact.claim)
    for (const price of prices) {
      const key = 'price'
      const existing = priceValues.get(key) ?? new Set()
      existing.add(`${price} (${fact.source})`)
      priceValues.set(key, existing)
    }
  }

  for (const [attr, values] of priceValues) {
    if (values.size > 1) {
      conflicts.push(`${attr} varies: ${[...values].join(' vs ')}`)
    }
  }

  return conflicts
}

/**
 * Build community sentiment summary from Reddit/Twitter findings about an entity.
 */
function buildSentimentSummary(findings: Finding[], entityName: string, aliases: string[]): string {
  const communityFindings = findings.filter(
    f => (f.source_type === 'reddit' || f.source_type === 'twitter') &&
      mentionsEntity(f.content, entityName, aliases)
  )

  if (communityFindings.length === 0) return ''

  // Take the most substantial snippets
  const snippets = communityFindings
    .filter(f => f.content.length > 30)
    .slice(0, 3)
    .map(f => f.content.slice(0, 100))

  if (snippets.length === 0) return ''
  if (snippets.length === 1) return snippets[0]
  return snippets.join('; ')
}

/**
 * Extract structured entity cards from plan entities and research findings.
 *
 * Pure synchronous function — no API calls.
 * Uses simple string matching — doesn't need to be perfect.
 */
export function extractEntityCards(
  planEntities: PlanEntity[],
  findings: Finding[],
  articleType: ArticleType,
): EntityCard[] {
  const cards: EntityCard[] = []
  const freshness = new Date().toISOString().slice(0, 7) // "2026-03"

  for (let i = 0; i < planEntities.length; i++) {
    const raw = planEntities[i]
    // Defensive: skip if entity has no name (malformed data)
    const entity: PlanEntity = typeof raw === 'string'
      ? { name: raw, product_category: '', search_query: raw }
      : raw
    if (!entity.name) continue

    const aliases = generateAliases(entity.name)
    const entityType = inferEntityType(entity, articleType)

    // Find all findings that mention this entity
    const matchingFindings = findings.filter(f =>
      mentionsEntity(f.content, entity.name, aliases) ||
      mentionsEntity(f.source, entity.name, aliases)
    )

    // Extract facts from matching findings
    const facts: EntityFact[] = matchingFindings
      .filter(f => f.content.length > 20)
      .slice(0, 8) // cap at 8 facts per entity
      .map(f => ({
        claim: f.content.slice(0, 250),
        source: f.source,
        source_url: f.url,
        confidence: getConfidence(f),
        finding_id: f.id,
      }))

    // Detect conflicts
    const conflicts = detectConflicts(facts)

    // Community sentiment
    const community_sentiment = buildSentimentSummary(findings, entity.name, aliases)

    // Relevance score: based on number of mentions (0-100)
    const mentionCount = matchingFindings.length
    const maxExpected = 10 // a highly mentioned entity might have ~10 findings
    const relevance_score = Math.min(100, Math.round((mentionCount / maxExpected) * 100))

    // Product-specific fields
    let product_fields: EntityCard['product_fields'] = undefined
    if (entityType === 'product') {
      const prices = facts.flatMap(f => extractPricesFromText(f.claim))
      product_fields = {
        price: prices.length > 0 ? prices[0] : undefined,
        category: entity.product_category || undefined,
        brand: entity.name.split(/\s+/)[0] || undefined,
      }
    }

    cards.push({
      id: `entity_${String(i + 1).padStart(3, '0')}`,
      canonical_name: entity.name,
      type: entityType,
      aliases,
      facts,
      conflicts,
      community_sentiment,
      image_query: entity.search_query || entity.name,
      freshness,
      relevance_score,
      product_fields,
    })
  }

  // Sort by relevance descending
  cards.sort((a, b) => b.relevance_score - a.relevance_score)

  return cards
}
