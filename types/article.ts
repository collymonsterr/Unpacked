export type ArticleType =
  | 'buyer_guide'
  | 'comparison'
  | 'decision_guide'
  | 'explainer'
  | 'news'
  | 'planning'
  | 'trend_analysis'
  | 'tutorial'

export type ArticleStatus = 'planning' | 'generating' | 'complete' | 'error'

export type ImageDensity = 'none' | 'low' | 'medium' | 'high'

export interface VisualStrategy {
  image_density: ImageDensity
  use_product_cards: boolean
  use_image_gallery: boolean
  use_comparison_table: boolean
  use_charts: boolean
  use_timelines: boolean
  use_stat_cards: boolean
  use_worked_examples: boolean
  use_callout_boxes: boolean
  use_quote_blocks: boolean
}

// ── Plan (Step 1 output) ─────────────────────────────────────────────────────

export interface PlanEntity {
  name: string
  search_query: string
}

export interface SuggestionChips {
  refinements: string[]
  related: string[]
}

export interface ArticlePlan {
  title: string
  article_type: ArticleType
  visual_strategy: VisualStrategy
  quick_verdict_preview: string
  entities: PlanEntity[]
  sections_outline: string[]
  research_queries: string[]
  suggestion_chips: SuggestionChips
}

// ── Article Sections (Step 2 output) ─────────────────────────────────────────

export interface ProductCard {
  type: 'product_card'
  heading: string
  entity_name: string
  price: string
  key_specs: Record<string, string>
  opinion: string
  verdict: string
  image_url?: string | null
  image_urls?: string[]
  links?: Array<{ label: string; url: string }>
}

export interface ComparisonTable {
  type: 'comparison_table'
  heading: string
  columns: string[]
  rows: string[][]
}

export interface WarningBox {
  type: 'warning_box'
  heading: string
  items: Array<{ name: string; reason: string }>
}

export interface ContentSection {
  type: 'content_section'
  heading: string
  content: string
}

export interface PriceTierBreakdown {
  type: 'price_tier_breakdown'
  heading: string
  tiers: Array<{ range: string; summary: string; pick: string }>
}

export interface CommunityInsights {
  type: 'community_insights'
  heading: string
  consensus: 'strong' | 'mixed' | 'divided'
  consensus_summary: string
  insights: Array<{ source: string; summary: string; sentiment: 'positive' | 'negative' | 'mixed' }>
}

export interface Sources {
  type: 'sources'
  items: Array<{ title: string; url: string }>
}

export interface HeadToHeadShowdown {
  type: 'head_to_head'
  heading: string
  categories: Array<{ category: string; winner: string; explanation: string }>
}

export interface WhoThisIsFor {
  type: 'who_this_is_for'
  heading: string
  profiles: Array<{ user_type: string; recommendation: string }>
}

// ── Data Visualisation Sections ─────────────────────────────────────────────

export interface BarChartSection {
  type: 'bar_chart'
  heading: string
  description?: string
  orientation: 'vertical' | 'horizontal'
  x_label?: string
  y_label?: string
  data: Array<{ label: string; value: number; highlight?: boolean }>
  source?: string
}

export interface ComparisonMatrixSection {
  type: 'comparison_matrix'
  heading: string
  description?: string
  items: string[]
  metrics: Array<{ name: string; scores: number[]; max: number }>
}

export interface PieChartSection {
  type: 'pie_chart'
  heading: string
  description?: string
  variant: 'pie' | 'donut'
  data: Array<{ label: string; value: number; highlight?: boolean }>
  unit?: string
  source?: string
}

export interface LineChartSection {
  type: 'line_chart'
  heading: string
  description?: string
  x_label?: string
  y_label?: string
  series: Array<{
    name: string
    data: Array<{ x: string; y: number }>
  }>
  fill_area?: boolean
  source?: string
}

export interface StatCardsSection {
  type: 'stat_cards'
  heading: string
  cards: Array<{
    value: string
    label: string
    trend?: 'up' | 'down' | null
  }>
  source?: string
}

export interface TreemapSection {
  type: 'treemap'
  heading: string
  description?: string
  data: Array<{ label: string; value: number; highlight?: boolean }>
  unit?: string
  source?: string
}

export interface TimelineSection {
  type: 'timeline'
  heading: string
  events: Array<{
    year: string
    title: string
    description: string
  }>
}

export type ArticleSection =
  | ProductCard
  | ComparisonTable
  | WarningBox
  | ContentSection
  | PriceTierBreakdown
  | CommunityInsights
  | Sources
  | HeadToHeadShowdown
  | WhoThisIsFor
  | BarChartSection
  | ComparisonMatrixSection
  | PieChartSection
  | LineChartSection
  | StatCardsSection
  | TreemapSection
  | TimelineSection

// ── Full Article ─────────────────────────────────────────────────────────────

export interface QuickVerdict {
  recommendation: string
  one_liner: string
}

export interface ExecutiveSummary {
  short_answer: string
  key_takeaways: string[]
  watch_out_for: string[]
}

export interface ArticleContent {
  title: string
  article_type: ArticleType
  quick_verdict: QuickVerdict
  executive_summary: ExecutiveSummary
  sections: ArticleSection[]
  thumbnail_url?: string | null
}

// ── Database row ─────────────────────────────────────────────────────────────

export interface ArticleRow {
  id: string
  slug: string
  query: string
  status: ArticleStatus
  plan: ArticlePlan | null
  article: ArticleContent | null
  suggestion_chips: SuggestionChips | null
  pinned?: boolean
  created_at: string
  updated_at: string
}
