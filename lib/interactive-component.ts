import { createAnthropic } from '@/lib/anthropic-client'
import { logApiCall } from '@/lib/api-usage'
import { MODELS } from '@/lib/models'
import { extractJSON } from '@/lib/utils/extract-json'
import type {
  InteractiveComponentType,
  InteractiveComponentData,
  ArticleContent,
  ArticlePlan,
} from '@/types/article'

const anthropic = createAnthropic()

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

STRUCTURAL REQUIREMENTS (validation will reject non-conforming output):

decision_tool JSON shape:
  { "type": "decision_tool", "title": "string", "subtitle": "string",
    "questions": [{ "id": "q1", "text": "string", "options": [{ "label": "string", "next": "q2" | null, "recommendation_id": "rec1" (only on terminal options) }] }],
    "recommendations": [{ "id": "rec1", "name": "string", "reason": "string" }] }
  - Every option must have "next" pointing to a valid question id OR "recommendation_id" pointing to a valid recommendation id (never both null)
  - At least 2 questions, at least 2 recommendations, at least 2 options per question

scenario_simulator JSON shape:
  { "type": "scenario_simulator", "title": "string", "subtitle": "string",
    "scenarios": [{ "id": "s1", "name": "string", "probability": 35, "probability_source": "Polymarket" | "Research estimate",
      "impacts": [{ "dimension": "string", "value": -50 to +100, "label": "+40%", "description": "string" }],
      "verdict": "string" }] }
  - At least 2 scenarios, probabilities must be numbers 0-100, impact values must be numbers -100 to +100
  - Each scenario needs at least 1 impact dimension

interactive_map JSON shape:
  { "type": "interactive_map", "title": "string", "subtitle": "string",
    "center": { "lat": number, "lng": number }, "zoom": 1-18,
    "markers": [{ "lat": number, "lng": number, "title": "string", "description": "string", "color": "amber" | "green" | "red" | "blue" }],
    "routes": [{ "points": [{ "lat": number, "lng": number }], "color": "#hex", "label": "string" }],
    "zones": [{ "points": [{ "lat": number, "lng": number }], "color": "#hex", "label": "string" }] }
  - lat must be -90 to 90, lng must be -180 to 180 — REAL coordinates only
  - At least 2 markers required, routes need ≥2 points, zones need ≥3 points

comparison_calculator JSON shape:
  { "type": "comparison_calculator", "title": "string", "subtitle": "string",
    "inputs": [{ "id": "budget", "label": "string", "min": number, "max": number, "step": number, "default": number, "unit": "$" | "%" | "years" }],
    "outputs": [{ "id": "result1", "label": "string", "formula": "budget * 0.07", "unit": "$", "description": "string" }],
    "source": "string" }
  - Formulas reference input IDs only, use basic arithmetic only
  - min must be < max, step must be > 0, default must be between min and max

RULES:
- Use ONLY data that exists in the provided article or research
- All coordinates must be real and accurate — never approximate or round to whole degrees
- All formulas must be valid JavaScript expressions
- Keep question text concise (under 60 characters)
- Keep recommendation reasons under 100 words
- Keep scenario verdicts under 80 words
- Keep marker descriptions under 50 words
- Every id field must be a unique, non-empty string
- Never use null for required string fields — use an empty string if needed`

/**
 * Schema definitions for validation
 */
/** Check a value is a finite number (not NaN, not Infinity) */
function isNum(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

/**
 * Why `validateComponentData()` rejected something. Diagnosis only — the
 * boolean validator below stays the gate.
 */
function describeValidationFailure(data: unknown, type: InteractiveComponentType): string {
  if (!data || typeof data !== 'object') return 'not an object'
  const d = data as Record<string, unknown>
  if (d.type !== type) return `type is ${JSON.stringify(d.type)}, expected ${JSON.stringify(type)}`
  if (typeof d.title !== 'string' || !d.title) return 'missing or empty title'
  if (typeof d.subtitle !== 'string') return 'missing subtitle'

  const arrayFieldsByType: Record<string, string[]> = {
    decision_tool: ['questions', 'recommendations'],
    scenario_simulator: ['scenarios'],
    interactive_map: ['locations'],
    comparison_calculator: ['options', 'criteria'],
  }
  for (const field of arrayFieldsByType[type] ?? []) {
    const value = d[field]
    if (!Array.isArray(value)) return `${field} is not an array`
    if (value.length < 2) return `${field} has ${value.length} item(s), needs at least 2`
  }
  return 'a nested field failed its shape check'
}

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
      // Verify every question has an id, text, and at least 2 options
      const qs = dt.questions as Array<Record<string, unknown>>
      for (const q of qs) {
        if (typeof q.id !== 'string' || !q.id) return false
        if (typeof q.text !== 'string' || !q.text) return false
        if (!Array.isArray(q.options) || q.options.length < 2) return false
      }
      // Verify every recommendation has id + name + reason
      const recs = dt.recommendations as Array<Record<string, unknown>>
      for (const r of recs) {
        if (typeof r.id !== 'string' || !r.id) return false
        if (typeof r.name !== 'string' || !r.name) return false
        if (typeof r.reason !== 'string') return false
      }
      return true
    }
    case 'scenario_simulator': {
      const ss = d as Record<string, unknown>
      if (!Array.isArray(ss.scenarios) || ss.scenarios.length < 2) return false
      const scenarios = ss.scenarios as Array<Record<string, unknown>>
      for (const s of scenarios) {
        if (typeof s.id !== 'string' || !s.id) return false
        if (typeof s.name !== 'string' || !s.name) return false
        // Clamp probability to 0-100
        if (!isNum(s.probability)) return false
        s.probability = Math.max(0, Math.min(100, s.probability as number))
        if (!Array.isArray(s.impacts) || s.impacts.length < 1) return false
        const impacts = s.impacts as Array<Record<string, unknown>>
        for (const imp of impacts) {
          if (typeof imp.dimension !== 'string') return false
          if (!isNum(imp.value)) return false
          // Clamp impact value to -100..+100
          const clampedVal = Math.max(-100, Math.min(100, imp.value as number))
          imp.value = clampedVal
          if (typeof imp.label !== 'string') imp.label = `${clampedVal > 0 ? '+' : ''}${clampedVal}`
          if (typeof imp.description !== 'string') imp.description = ''
        }
        if (typeof s.verdict !== 'string') s.verdict = ''
      }
      return true
    }
    case 'interactive_map': {
      const im = d as Record<string, unknown>
      const center = im.center as Record<string, unknown> | undefined
      if (!center || !isNum(center.lat) || !isNum(center.lng)) return false
      // Validate lat/lng ranges
      if (Math.abs(center.lat as number) > 90 || Math.abs(center.lng as number) > 180) return false
      if (!isNum(im.zoom) || (im.zoom as number) < 1 || (im.zoom as number) > 18) return false
      if (!Array.isArray(im.markers) || im.markers.length < 2) return false
      const markers = im.markers as Array<Record<string, unknown>>
      for (const m of markers) {
        if (!isNum(m.lat) || !isNum(m.lng)) return false
        if (Math.abs(m.lat as number) > 90 || Math.abs(m.lng as number) > 180) return false
        if (typeof m.title !== 'string') m.title = 'Location'
        if (typeof m.description !== 'string') m.description = ''
      }
      // Validate route/zone coordinates if present
      if (Array.isArray(im.routes)) {
        for (const route of im.routes as Array<Record<string, unknown>>) {
          const pts = route.points as Array<Record<string, unknown>> | undefined
          if (!Array.isArray(pts) || pts.length < 2) continue
          for (const p of pts) {
            if (!isNum(p.lat) || !isNum(p.lng)) return false
            if (Math.abs(p.lat as number) > 90 || Math.abs(p.lng as number) > 180) return false
          }
        }
      }
      return true
    }
    case 'comparison_calculator': {
      const cc = d as Record<string, unknown>
      if (!Array.isArray(cc.inputs) || cc.inputs.length < 2) return false
      if (!Array.isArray(cc.outputs) || cc.outputs.length < 1) return false
      const inputs = cc.inputs as Array<Record<string, unknown>>
      for (const inp of inputs) {
        if (typeof inp.id !== 'string' || !inp.id) return false
        if (!isNum(inp.min) || !isNum(inp.max) || !isNum(inp.step) || !isNum(inp.default)) return false
        // Fix inverted ranges
        if ((inp.min as number) >= (inp.max as number)) return false
        if ((inp.step as number) <= 0) return false
        // Clamp default to valid range
        inp.default = Math.max(inp.min as number, Math.min(inp.max as number, inp.default as number))
      }
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
      model: MODELS.haiku,
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
      model: MODELS.haiku,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      articleId,
    })

    const parsed = extractJSON(text)
    if (parsed && validateComponentData(parsed, componentType)) {
      console.log(`[interactive] Generated ${componentType} for ${articleId} via Haiku`)
      return parsed as InteractiveComponentData
    }

    // Haiku output invalid — try Sonnet fallback.
    //
    // This path fired on 13 of 14 runs in the 14 days to 20 Oct 2026, making the
    // "cheaper first" attempt pure overhead. The cause was never recorded, so
    // log enough to diagnose it: a `max_tokens` stop means raise the ceiling (the
    // planning call had exactly that bug), while a failed field points at the
    // schema or the prompt.
    const failure = !parsed
      ? 'no JSON in response'
      : `failed validation: ${describeValidationFailure(parsed, componentType)}`
    console.warn(
      `[interactive] Haiku output invalid for ${articleId} (${componentType}) — ${failure}; ` +
      `stop_reason=${response.stop_reason} output_tokens=${response.usage?.output_tokens}. Trying Sonnet.`
    )

    const sonnetResponse = await anthropic.messages.create({
      model: MODELS.sonnet,
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
      model: MODELS.sonnet,
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
      model: MODELS.haiku,
      articleId,
      errorMessage: (err as Error).message,
    })
    return null
  }
}
