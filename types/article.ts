// Re-export from the single source of truth
import type { ArticleType as _ArticleType } from '@/lib/article-types'
export type ArticleType = _ArticleType

export type ArticleStatus = 'planning' | 'generating' | 'awaiting_auth' | 'complete' | 'verified' | 'error'

export type ArticleVisibility = 'private' | 'unlisted' | 'published'

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
  product_category?: string
  search_query: string
}

export interface SuggestionChips {
  refinements: string[]
  related: string[]
}

// ── Research Manifest (from enhanced planning) ─────────────────────────────

export interface BraveQuery {
  query: string
  purpose: 'core_facts' | 'economic_impact' | 'background' | 'wider_context' | 'product_review' | 'pricing' | 'specs' | 'community' | 'expert_opinion' | 'comparison' | 'how_to' | 'alternatives'
}

export interface RedditQuery {
  query: string
  subreddits: string[]
}

export interface ImageQueries {
  hero: { query: string; style: 'editorial_photo' | 'news_photo' | 'product_photo' | 'abstract' }
  products: Array<{ entity_name: string; query: string }>
}

export interface LiveDataQuery {
  source: 'polymarket' | 'yahoo_finance' | 'google_trends'
  query?: string
  symbols?: string[]
  purpose?: string
}

export interface ResearchManifest {
  brave_queries: BraveQuery[]
  reddit_queries: RedditQuery[]
  image_queries: ImageQueries
  live_data?: LiveDataQuery[]
}

export interface PlanSection {
  heading: string
  purpose: string
}

// ── Entity Cards + Synthesis (from research extraction) ─────────────────────

export type EntityType = 'product' | 'person' | 'company' | 'concept' | 'place' | 'event' | 'data_point'

export interface EntityFact {
  claim: string
  source: string
  source_url: string
  confidence: 'high' | 'medium' | 'low'
  finding_id: string
}

export interface EntityCard {
  id: string
  canonical_name: string
  type: EntityType
  aliases: string[]
  facts: EntityFact[]
  conflicts: string[]
  community_sentiment: string
  image_query: string
  freshness: string
  relevance_score: number
  product_fields?: {
    price?: string
    category?: string
    brand?: string
    key_specs?: Record<string, string>
  }
}

export interface ResearchSynthesis {
  thesis_direction: string
  comparison_axes: string[]
  strongest_arguments: Record<string, string>
  likely_winner: string | null
  caveats: string[]
  community_sentiment_summary: string
  key_data_points: string[]
  source_quality: string
  gaps: string[]
}

// ── Blueprint + Editorial Pass (Session 1.7C) ────────────────────────────────

export interface BlueprintSection {
  id: string
  heading: string
  purpose: string
  key_points: string[]
  evidence_ids: string[]
  target_words: number
  components: string[]
}

export interface ArticleBlueprint {
  thesis: string
  verdict_statement: string
  winner: string | null
  sections: BlueprintSection[]
  evidence_map: Record<string, string[]>
  what_not_to_say: string[]
  forbidden_phrases: string[]
  tone_notes: string
  target_word_count: number
}

export interface EditorIssue {
  section_id: string
  issue_type: 'hedging' | 'ai_phrase' | 'weak_verdict' | 'filler' | 'missing_attribution' | 'repetition' | 'creative_filler'
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface EditorResult {
  score: number
  issues: EditorIssue[]
  rewrites: Record<string, string>
  verdict_rewrite?: string
}

export type ArticleCategory =
  | 'tech' | 'finance' | 'health_fitness' | 'travel' | 'home_living'
  | 'entertainment' | 'science' | 'business' | 'automotive' | 'culture'
  | 'current_affairs' | 'ai_future'

export interface ArticlePlan {
  title: string
  article_type: ArticleType
  visual_strategy: VisualStrategy
  quick_verdict_preview: string
  entities: PlanEntity[]
  sections_outline: string[]
  research_queries: string[]
  loading_messages?: string[]
  hero_image_query?: string
  hero_image_subject?: string
  forbidden_components?: string[]
  suggestion_chips: SuggestionChips
  // Enhanced planning fields (Session 1.7A)
  research_manifest?: ResearchManifest
  article_type_confidence?: number
  alternative_types?: string[]
  category?: ArticleCategory
  sections?: PlanSection[]
}

// ── Article Sections (Step 2 output) ─────────────────────────────────────────

export type ProductType = 'physical' | 'software' | 'service' | 'place'

export interface ProductCard {
  type: 'product_card'
  heading: string
  entity_name: string
  product_type?: ProductType
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
  reddit_threads?: Array<{ title: string; url: string; subreddit: string }>
  quotes?: Array<{ text: string; source: string }>
}

export interface Sources {
  type: 'sources'
  items: Array<{ title: string; url: string }>
}

export interface FurtherReading {
  type: 'further_reading'
  items: Array<{ title: string; url: string; description: string }>
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

export interface InteractiveCalculatorSection {
  type: 'interactive_calculator'
  heading: string
  description?: string
  calculator_type: 'compound_interest' | 'mortgage' | 'roi_comparison' | 'budget' | 'custom'
  inputs: Array<{
    id: string
    label: string
    type: 'slider'
    min: number
    max: number
    default: number
    step: number
    unit?: string
  }>
  formula?: string
  outputs: Array<{
    id: string
    label: string
    format: 'currency' | 'percentage' | 'number'
  }>
  source?: string
}

export interface ImageSection {
  type: 'image_section'
  heading?: string
  images: Array<{
    search_query: string
    caption?: string
    image_url?: string | null
  }>
  layout: 'single' | 'gallery' | 'side-by-side'
}

// ── Live Data Cards (Session 1.7E) ──────────────────────────────────────────

export interface LiveDataCardSection {
  type: 'live_data_card'
  data_source: 'polymarket' | 'yahoo_finance' | 'google_trends'
  content: Record<string, unknown>
}

export type ArticleSection =
  | ProductCard
  | ComparisonTable
  | WarningBox
  | ContentSection
  | PriceTierBreakdown
  | CommunityInsights
  | Sources
  | FurtherReading
  | HeadToHeadShowdown
  | WhoThisIsFor
  | BarChartSection
  | ComparisonMatrixSection
  | PieChartSection
  | LineChartSection
  | StatCardsSection
  | TreemapSection
  | TimelineSection
  | ImageSection
  | InteractiveCalculatorSection
  | LiveDataCardSection

// ── Full Article ─────────────────────────────────────────────────────────────

export interface QuickVerdict {
  recommendation?: string  // Legacy — old articles use this
  bullets?: string[]       // New — 3-4 punchy takeaway bullets
  one_liner: string
}

export interface ExecutiveSummary {
  short_answer: string
  key_takeaways: string[]
  watch_out_for: string[]
}

// ── Image Attribution (Session 1.7D) ────────────────────────────────────────

export interface ImageAttribution {
  photographer: string
  photographer_url: string
  source_name: string  // "Pexels" or "Unsplash"
}

export interface ArticleContent {
  title: string
  article_type: ArticleType
  quick_verdict: QuickVerdict
  executive_summary: ExecutiveSummary
  sections: ArticleSection[]
  thumbnail_url?: string | null
  thumbnail_history?: string[]
  hero_attribution?: ImageAttribution | null
}

// ── Fact Check ──────────────────────────────────────────────────────────────

export interface FactCheckIssue {
  section_type: string
  entity_name?: string
  original_claim: string
  finding: string
  correction: string
  severity: 'critical' | 'minor' | 'note'
}

export interface FactCheckResult {
  issues_found: boolean
  total_issues: number
  checks_performed: number
  issues: FactCheckIssue[]
}

// ── Triple Fact-Check (Session 1.8B) ───────────────────────────────────────

export type ClaimCategory = 'price' | 'statistic' | 'date' | 'factual' | 'medical' | 'financial' | 'technical'

export interface VerifiedClaim {
  id: string
  text: string
  category: ClaimCategory
  verdict: 'verified' | 'flagged' | 'insufficient'
  evidence: Array<{
    source: string
    url: string
    snippet: string
  }>
  correction?: string
}

export interface HaikuReview {
  claim_id: string
  agrees_with_stage1: boolean
  confidence: 'high' | 'medium' | 'low'
  concerns?: string
}

export interface ArbitrationResult {
  claim_id: string
  verdict: 'verified' | 'flagged' | 'insufficient'
  reasoning: string
}

export interface FactCheckAuditClaim {
  id: string
  text: string
  category: string
  stage1_verdict: string
  stage1_evidence: Array<{ source: string; url: string; snippet: string }>
  stage2_review?: { agrees: boolean; confidence: string; concerns?: string }
  stage3_arbitration?: { verdict: string; reasoning: string }
  final_verdict: 'verified' | 'corrected' | 'softened' | 'insufficient'
  action_taken?: string
}

export interface FactCheckAuditSummary {
  verified: number
  corrected: number
  softened: number
  insufficient: number
  disagreements: number
  stages_run: number
}

export interface FactCheckAudit {
  timestamp: string
  total_claims: number
  stages_run: number
  claims: FactCheckAuditClaim[]
  summary: FactCheckAuditSummary
}

// ── Co-Pilot Refine Request ─────────────────────────────────────────────────

export interface CoPilotRefineRequest {
  /** Free-text instructions from the creator */
  instructions?: string
  /** Finding IDs to include in the rewrite */
  add_findings?: string[]
  /** Finding IDs to exclude from the rewrite */
  remove_findings?: string[]
  /** New article type — triggers full rewrite with different type rules */
  switch_type?: string
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
  user_id?: string | null
  user_name?: string | null
  user_avatar?: string | null
  fact_check?: FactCheckResult | null
  fact_check_audit?: FactCheckAudit | null
  verified_at?: string | null
  total_cost?: number
  view_count?: number
  hidden_from_homepage?: boolean
  sort_order?: number | null
  parent_article_id?: string | null
  root_article_id?: string | null
  is_featured?: boolean
  featured_position?: number | null
  is_trending?: boolean
  trending_set_at?: string | null
  visibility?: ArticleVisibility
  generation_options?: Record<string, unknown> | null
  research_preview?: {
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
  } | null
  research_findings?: Array<{
    id: string
    source: string
    source_type: 'web' | 'reddit' | 'twitter'
    url: string
    content: string
    used_in_article: boolean
  }> | null
  entity_cards?: EntityCard[] | null
  research_synthesis?: ResearchSynthesis | null
  blueprint?: ArticleBlueprint | null
  live_data?: Record<string, unknown>[] | null
  social_content?: Record<string, unknown> | null
  category?: string | null
  card_summary?: string | null
  created_at: string
  updated_at: string
}
