/**
 * Centralised article type definitions — single source of truth.
 * Every file that needs article type info should import from here.
 */

export const ARTICLE_TYPES = {
  buyer_guide: {
    label: 'Buyer Guide',
    description: 'Help the reader buy the right thing with confidence',
    requiredComponents: ['product_cards', 'comparison_table', 'verdict_box', 'reddit_section'],
    allowedComponents: ['interactive_charts', 'calculators', 'pros_cons', 'key_takeaways'],
    forbiddenComponents: ['forecast_section', 'timeline', 'live_data_cards'],
    lengthRange: { min: 1200, max: 2000 },
    tone: 'confident_practical',
    verdictRequired: true,
    verdictStyle: 'picks_winner',
  },
  comparison: {
    label: 'Comparison',
    description: 'Head-to-head between 2-3 specific items',
    requiredComponents: ['comparison_table', 'verdict_box', 'reddit_section'],
    allowedComponents: ['product_cards', 'interactive_charts', 'pros_cons', 'key_takeaways'],
    forbiddenComponents: ['forecast_section', 'timeline', 'live_data_cards'],
    lengthRange: { min: 800, max: 1500 },
    tone: 'direct_authoritative',
    verdictRequired: true,
    verdictStyle: 'picks_winner',
  },
  explainer: {
    label: 'Explainer',
    description: 'Help the reader understand something clearly',
    requiredComponents: ['key_takeaways'],
    allowedComponents: ['interactive_charts', 'reddit_section', 'data_visualisation', 'faq_section', 'quote_blocks'],
    forbiddenComponents: ['product_cards', 'comparison_table', 'pricing', 'buy_links'],
    lengthRange: { min: 600, max: 2500 },
    tone: 'clear_authoritative',
    verdictRequired: false,
    verdictStyle: 'bottom_line',
  },
  decision_guide: {
    label: 'Decision Guide',
    description: 'Help the reader make a personal life or career decision',
    requiredComponents: ['verdict_box', 'reddit_section'],
    allowedComponents: ['calculators', 'interactive_charts', 'data_visualisation', 'pros_cons', 'key_takeaways', 'quote_blocks'],
    forbiddenComponents: ['product_cards', 'comparison_table'],
    lengthRange: { min: 1200, max: 1800 },
    tone: 'thoughtful_advisory',
    verdictRequired: true,
    verdictStyle: 'for_most_people',
  },
  how_to: {
    label: 'How-To',
    description: 'Step-by-step task completion',
    requiredComponents: ['numbered_steps', 'prerequisites_list'],
    allowedComponents: ['key_takeaways', 'faq_section', 'quote_blocks'],
    forbiddenComponents: ['comparison_table', 'verdict_box', 'forecast_section', 'live_data_cards'],
    lengthRange: { min: 600, max: 1500 },
    tone: 'practical_clear',
    verdictRequired: false,
    verdictStyle: 'none',
  },
  roundup: {
    label: 'Roundup',
    description: 'Curated list with genuine editorial opinion',
    requiredComponents: ['verdict_box'],
    allowedComponents: ['product_cards', 'interactive_charts', 'reddit_section', 'key_takeaways', 'quote_blocks'],
    forbiddenComponents: ['comparison_table', 'forecast_section', 'calculators'],
    lengthRange: { min: 1000, max: 2000 },
    tone: 'opinionated_curated',
    verdictRequired: true,
    verdictStyle: 'best_overall',
  },
  news_analysis: {
    label: 'News Analysis',
    description: 'What an event means and what happens next',
    requiredComponents: ['verdict_box', 'forecast_section'],
    allowedComponents: ['live_data_cards', 'reddit_section', 'quote_blocks', 'timeline', 'data_visualisation', 'key_takeaways'],
    forbiddenComponents: ['product_cards', 'comparison_table', 'calculators', 'buy_links'],
    lengthRange: { min: 800, max: 1500 },
    tone: 'analytical_confident',
    verdictRequired: true,
    verdictStyle: 'editorial_position',
  },
  trend_analysis: {
    label: 'Trend Analysis',
    description: 'Is this trend real, overhyped, or misunderstood?',
    requiredComponents: ['verdict_box', 'reddit_section'],
    allowedComponents: ['live_data_cards', 'quote_blocks', 'timeline', 'key_takeaways', 'data_visualisation'],
    forbiddenComponents: ['product_cards', 'comparison_table', 'calculators', 'buy_links'],
    lengthRange: { min: 1200, max: 2500 },
    tone: 'investigative',
    verdictRequired: true,
    verdictStyle: 'trajectory_call',
  },
  breaking_news: {
    label: 'Breaking News',
    description: 'Essential picture on a breaking event in under 2 minutes reading',
    requiredComponents: ['live_data_cards', 'what_to_watch'],
    allowedComponents: ['quote_blocks', 'timeline', 'data_visualisation'],
    forbiddenComponents: ['product_cards', 'comparison_table', 'calculators', 'verdict_box', 'lengthy_explainer'],
    lengthRange: { min: 300, max: 600 },
    tone: 'urgent_controlled',
    verdictRequired: false,
    verdictStyle: 'what_to_watch',
  },
  deep_dive: {
    label: 'Deep Dive',
    description: 'Complete picture on a complex ongoing topic',
    requiredComponents: ['verdict_box', 'forecast_section', 'reddit_section'],
    allowedComponents: ['live_data_cards', 'quote_blocks', 'timeline', 'data_visualisation', 'interactive_charts', 'key_takeaways'],
    forbiddenComponents: ['product_cards', 'calculators', 'buy_links'],
    lengthRange: { min: 2000, max: 3500 },
    tone: 'authoritative_engaging',
    verdictRequired: true,
    verdictStyle: 'bold_thesis',
  },
  ranked_list: {
    label: 'Ranked List',
    description: 'A numbered ranking from worst to best (or best to worst), backed by evidence. Picks a clear #1.',
    requiredComponents: ['verdict_box'],
    allowedComponents: ['product_cards', 'comparison_table', 'stat_cards', 'interactive_charts', 'big_statements', 'reddit_section', 'key_takeaways'],
    forbiddenComponents: ['calculators', 'how_to_steps', 'forecast_section'],
    lengthRange: { min: 1200, max: 4000 },
    tone: 'opinionated_curated',
    verdictRequired: true,
    verdictStyle: 'clear_winner_with_rank',
  },
  myth_buster: {
    label: 'Myth Buster',
    description: 'Takes common beliefs and systematically debunks them with evidence',
    requiredComponents: ['verdict_box'],
    allowedComponents: ['stat_cards', 'big_statements', 'interactive_charts', 'quote_blocks', 'reddit_section', 'key_takeaways'],
    forbiddenComponents: ['product_cards', 'comparison_table', 'calculators', 'how_to_steps', 'forecast_section'],
    lengthRange: { min: 1000, max: 3500 },
    tone: 'contrarian',
    verdictRequired: true,
    verdictStyle: 'biggest_misconception',
  },
  timeline_article: {
    label: 'Timeline',
    description: 'Chronological entries with dates and narrative. Maps how something evolved over time.',
    requiredComponents: ['timeline'],
    allowedComponents: ['stat_cards', 'big_statements', 'interactive_charts', 'quote_blocks', 'key_takeaways'],
    forbiddenComponents: ['product_cards', 'comparison_table', 'calculators', 'how_to_steps'],
    lengthRange: { min: 800, max: 4000 },
    tone: 'authoritative_engaging',
    verdictRequired: false,
    verdictStyle: 'none',
  },
  visual_list: {
    label: 'Visual List',
    description: 'Image-first, story-second. Each item features a prominent image with editorial narrative.',
    requiredComponents: ['image_section'],
    allowedComponents: ['big_statements', 'stat_cards', 'key_takeaways', 'quote_blocks'],
    forbiddenComponents: ['comparison_table', 'calculators', 'how_to_steps', 'product_cards', 'interactive_charts', 'forecast_section'],
    lengthRange: { min: 800, max: 4000 },
    tone: 'opinionated_curated',
    verdictRequired: false,
    verdictStyle: 'none',
  },
} as const

export type ArticleType = keyof typeof ARTICLE_TYPES

export const ARTICLE_TYPE_LIST = Object.keys(ARTICLE_TYPES) as ArticleType[]

/** Human-readable label for an article type */
export function getArticleTypeLabel(type: string): string {
  return ARTICLE_TYPES[type as ArticleType]?.label ?? type.replace(/_/g, ' ')
}

/** Check if a component is allowed for a given article type */
export function isComponentAllowed(type: ArticleType, component: string): boolean {
  const config = ARTICLE_TYPES[type]
  if (!config) return false
  if ((config.forbiddenComponents as readonly string[]).includes(component)) return false
  if ((config.requiredComponents as readonly string[]).includes(component)) return true
  if ((config.allowedComponents as readonly string[]).includes(component)) return true
  return false
}

/** Get the forbidden components list for a given article type */
export function getForbiddenComponents(type: ArticleType): readonly string[] {
  return ARTICLE_TYPES[type]?.forbiddenComponents ?? []
}

/** Build a type list string for prompts */
export function getArticleTypePromptList(): string {
  return ARTICLE_TYPE_LIST.map(t => `- ${t}: ${ARTICLE_TYPES[t].description}`).join('\n')
}
