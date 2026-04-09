import Anthropic from '@anthropic-ai/sdk'
import { logApiCall } from '@/lib/api-usage'
import { extractJSON } from '@/lib/utils/extract-json'
import type {
  InteractiveComponentType,
  InteractiveComponentData,
  ArticleContent,
  ArticlePlan,
} from '@/types/article'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are an interactive component data generator for Unpacked, a publishing platform. You receive an article and its research data. Your job is to generate structured JSON data for an interactive component that helps readers make a decision or understand the content better.

You will be told which component type to generate. Generate the data using ONLY facts, figures, products, and analysis from the article and research. Never invent data.

COMPONENT TYPES:

1. decision_tool — A step-by-step question flow leading to a specific recommendation.
   - 3-5 questions with 2-4 options each
   - Each path must lead to a specific recommendation from the article's actual products/options
   - Questions should be about the reader's needs (budget, use case, priorities)
   - Every recommendation must have a clear reason drawn from the article's analysis

2. scenario_simulator — Shows 3-4 named scenarios with probability estimates and impacts.
   - Use Polymarket probabilities if available in the article data, otherwise use research estimates
   - Each scenario needs 3-4 impact dimensions with a -100 to +100 value scale
   - Include a verdict paragraph per scenario drawn from the article's analysis
   - Label values clearly ("+40%", "-2.3%", "$85/barrel")

3. interactive_map — Geographic data with real coordinates.
   - Center and zoom level for the map
   - Markers with REAL lat/lng coordinates (never approximate)
   - Optional route lines with real coordinate arrays
   - Optional highlighted zones
   - Each marker needs a title and description with data from the article

4. comparison_calculator — Sliders/inputs that produce personalised results.
   - 3-6 input sliders with sensible min/max/step/default values
   - Output formulas as JavaScript expressions referencing input IDs
   - Formulas must use only basic arithmetic: +, -, *, /, Math.pow(), Math.round(), Math.max(), Math.min()
   - Include units (currency symbols, %) and clear labels
   - Data source attribution

RULES:
- Use ONLY data that exists in the provided article or research
- All coordinates must be real and accurate
- All formulas must be valid JavaScript expressions
- Keep question text concise (under 60 characters)
- Keep recommendation reasons under 100 words
- Keep scenario verdicts under 80 words
- Keep marker descriptions under 50 words`

/**
 * Schema definitions for validation
 */
function validateComponentData(data: unknown, type: InteractiveComponentType): data is InteractiveComponentData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (d.type !== type) return false
  if (typeof d.title !== 'string' || !d.title) return false
  if (typeof d.subtitle !== 'string') return false

  switch (type) {
    case 'decision_tool': {
      const dt = d as Record<string, unknown>
      if (!Array.isArray(dt.questions) || dt.questions.length < 2) return false
      if (!Array.isArray(dt.recommendations) || dt.recommendations.length < 2) return false
      return true
    }
    case 'scenario_simulator': {
      const ss = d as Record<string, unknown>
      if (!Array.isArray(ss.scenarios) || ss.scenarios.length < 2) return false
      return true
    }
    case 'interactive_map': {
      const im = d as Record<string, unknown>
      if (!im.center || typeof im.zoom !== 'number') return false
      if (!Array.isArray(im.markers) || im.markers.length < 2) return false
      return true
    }
    case 'comparison_calculator': {
      const cc = d as Record<string, unknown>
      if (!Array.isArray(cc.inputs) || cc.inputs.length < 2) return false
      if (!Array.isArray(cc.outputs) || cc.outputs.length < 1) return false
      return true
    }
    default:
      return false
  }
}

/**
 * Summarise article sections to stay under token budget.
 * Keeps headings + truncated content for each section.
 */
function summariseArticle(article: ArticleContent): string {
  const parts: string[] = []
  parts.push(`Title: ${article.title}`)
  parts.push(`Type: ${article.article_type}`)
  if (article.quick_verdict?.one_liner) {
    parts.push(`Verdict: ${article.quick_verdict.one_liner}`)
  }
  if (article.executive_summary?.key_takeaways) {
    parts.push(`Key takeaways: ${article.executive_summary.key_takeaways.join('; ')}`)
  }

  for (const section of article.sections ?? []) {
    const heading = (section as { heading?: string }).heading ?? section.type
    let content = ''

    switch (section.type) {
      case 'content_section': {
        const cs = section as unknown as { body?: string }
        content = cs.body?.slice(0, 300) ?? ''
        break
      }
      case 'product_card': {
        const pc = section as unknown as { entity_name: string; price: string; verdict: string; pros?: string[]; cons?: string[] }
        content = `${pc.entity_name} — ${pc.price}. Verdict: ${pc.verdict}. Pros: ${pc.pros?.join(', ') ?? 'N/A'}. Cons: ${pc.cons?.join(', ') ?? 'N/A'}`
        break
      }
      case 'comparison_table': {
        const ct = section as unknown as { rows: string[][] }
        content = ct.rows?.map(r => r.join(' vs ')).join('; ') ?? ''
        break
      }
      case 'stat_cards': {
        const sc = section as unknown as { cards: Array<{ label: string; value: string }> }
        content = sc.cards?.map(c => `${c.label}: ${c.value}`).join('; ') ?? ''
        break
      }
      case 'live_data_card': {
        const ld = section as unknown as { data_source: string; content: Record<string, unknown> }
        content = `[${ld.data_source}] ${JSON.stringify(ld.content).slice(0, 300)}`
        break
      }
      default: {
        // Serialize other section types briefly
        const json = JSON.stringify(section)
        content = json.slice(0, 200)
      }
    }

    parts.push(`## ${heading}\n${content}`)
  }

  // Trim to ~6000 chars to stay under ~2000 tokens
  const full = parts.join('\n\n')
  return full.length > 6000 ? full.slice(0, 6000) + '\n\n[truncated]' : full
}

/**
 * Generate an interactive component for an article.
 * Returns the component data or null if generation fails or is skipped.
 */
export async function generateInteractiveComponent(
  article: ArticleContent,
  plan: ArticlePlan,
  researchFindings: Array<{ source: string; content: string }> | null,
  articleId: string,
): Promise<InteractiveComponentData | null> {
  const componentType = plan.interactive_component_type
  if (!componentType) {
    console.log(`[interactive] Skipped for ${articleId}: planner set null`)
    return null
  }

  const articleSummary = summariseArticle(article)

  // Build research context (top 10 findings, truncated)
  const researchContext = researchFindings
    ? researchFindings
        .slice(0, 10)
        .map(f => `[${f.source}] ${f.content.slice(0, 200)}`)
        .join('\n\n')
    : ''

  const userMessage = `Generate a ${componentType} component for this article.

Article type: ${plan.article_type}
Component type to generate: ${componentType}

ARTICLE CONTENT:
${articleSummary}

${researchContext ? `RESEARCH FINDINGS:\n${researchContext}` : ''}

Respond with valid JSON matching the ${componentType} schema. Include the "type" field set to "${componentType}".`

  try {
    // Try Haiku first (cheaper)
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    logApiCall({
      callType: 'interactive_component',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      articleId,
    })

    const parsed = extractJSON(text)
    if (parsed && validateComponentData(parsed, componentType)) {
      console.log(`[interactive] Generated ${componentType} for ${articleId} via Haiku`)
      return parsed as InteractiveComponentData
    }

    // Haiku output invalid — try Sonnet fallback
    console.warn(`[interactive] Haiku output invalid for ${articleId}, trying Sonnet fallback`)

    const sonnetResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const sonnetText = sonnetResponse.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    logApiCall({
      callType: 'interactive_component_fallback',
      model: 'claude-sonnet-4-20250514',
      inputTokens: sonnetResponse.usage?.input_tokens,
      outputTokens: sonnetResponse.usage?.output_tokens,
      articleId,
    })

    const sonnetParsed = extractJSON(sonnetText)
    if (sonnetParsed && validateComponentData(sonnetParsed, componentType)) {
      console.log(`[interactive] Generated ${componentType} for ${articleId} via Sonnet fallback`)
      return sonnetParsed as InteractiveComponentData
    }

    console.error(`[interactive] Both models failed validation for ${articleId}`)
    return null
  } catch (err) {
    console.error(`[interactive] Generation failed for ${articleId}:`, (err as Error).message)
    logApiCall({
      callType: 'interactive_component',
      model: 'claude-haiku-4-5-20251001',
      articleId,
      errorMessage: (err as Error).message,
    })
    return null
  }
}
