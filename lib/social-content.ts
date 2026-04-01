/**
 * Social Content Generation (Session 1.9)
 *
 * Generates platform-specific social content from a published article:
 * - X/Twitter thread (3-5 tweets)
 * - LinkedIn post
 * - Reddit summary with suggested subreddits
 * - Image card data (verdict, stat, comparison)
 *
 * Uses Gemini 2.5 Flash for cost efficiency (~$0.001/article).
 * Runs async after article generation — never blocks delivery.
 */

import { logApiCall } from '@/lib/api-usage'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { ArticleContent } from '@/types/article'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ImageCardData {
  type: 'verdict' | 'stat' | 'comparison'
  title: string
  content: string
  subtitle?: string
  creator_name: string
  article_url: string
}

export interface SocialContent {
  twitter_thread: string[]
  linkedin_post: string
  reddit_summary: string
  suggested_subreddits: string[]
  image_cards: ImageCardData[]
}

// ── Gemini call ──────────────────────────────────────────────────────────────

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGemini(prompt: string, articleId?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Missing GOOGLE_GEMINI_API_KEY')

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  }

  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const inputTokens = Math.round(prompt.length / 3.8)
  const outputTokens = Math.round(text.length / 3.8)

  logApiCall({
    callType: 'social_content',
    model: 'gemini-2.5-flash',
    inputTokens,
    outputTokens,
    articleId,
  })

  return text
}

// ── Content extraction ───────────────────────────────────────────────────────

function extractArticleContext(article: ArticleContent): string {
  const parts: string[] = []

  parts.push(`TITLE: ${article.title}`)
  parts.push(`TYPE: ${article.article_type}`)

  if (article.quick_verdict) {
    const v = article.quick_verdict
    parts.push(`VERDICT: ${v.one_liner}`)
    if (v.recommendation) parts.push(`RECOMMENDATION: ${v.recommendation}`)
    if (v.bullets?.length) parts.push(`KEY POINTS: ${v.bullets.join('; ')}`)
  }

  if (article.executive_summary) {
    parts.push(`EXECUTIVE SUMMARY: ${article.executive_summary}`)
  }

  // Extract key data points from sections
  const sections = article.sections ?? []
  for (const s of sections) {
    if (s.type === 'stat_cards' && 'cards' in s && Array.isArray(s.cards)) {
      const stats = s.cards.map((c: { value?: string; label?: string }) => `${c.value} ${c.label}`).join('; ')
      parts.push(`KEY STATS: ${stats}`)
    }
    if (s.type === 'live_data_card' && 'content' in s) {
      const c = s.content as Record<string, unknown>
      if (c.symbol && c.price) {
        parts.push(`LIVE DATA: ${c.symbol} at $${c.price} (${c.changePercent}%)`)
      }
    }
  }

  // Cap at ~3000 chars to keep prompt lean
  return parts.join('\n').slice(0, 3000)
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(
  articleContext: string,
  creatorName: string,
  articleUrl: string,
  articleType: string,
  category: string,
): string {
  return `You are a social media strategist for Unpacked (unpacked.fyi), a research-driven article platform. Generate social sharing content for this article.

ARTICLE:
${articleContext}

CREATOR: ${creatorName}
URL: ${articleUrl}
TYPE: ${articleType}
CATEGORY: ${category}

Generate sharing content in JSON format. Follow these rules EXACTLY:

X/TWITTER THREAD (3-5 tweets):
- Each tweet MUST be under 280 characters
- Tweet 1: Strong hook — compelling claim or verdict. End with "↓"
- Tweet 2-4: One data point or finding per tweet. Short, punchy.
- Final tweet: "I published a full breakdown on @UnpackedFYI → ${articleUrl}"
- NO hashtags. Maximum ONE emoji per tweet, only if natural.
- Tone: confident, direct — like telling a friend something interesting

LINKEDIN POST (150-300 words):
- Open with a surprising insight or contrarian take (NOT a summary)
- 2-3 short paragraphs with key findings
- What surprised me / what I learned
- Sign-off: "Created with Unpacked · ${creatorName}"
- NO hashtags in body. One line of 3-5 hashtags at the very end is fine.
- Professional but not corporate

REDDIT SUMMARY:
- Lead with value, NOT the link
- Format: "I looked into [topic] and here's what I found:"
- 3-5 key findings as bullet points
- The verdict / what surprised me
- Link at END: "Full article with sources and data: ${articleUrl}"
- NO marketing language whatsoever
- Suggest 1-2 relevant subreddits based on category

IMAGE CARDS (1-3):
- Always include a "verdict" card with the main thesis/winner
- If there are compelling stats, include a "stat" card with one key data point
- If it's a comparison/buyer guide, include a "comparison" card with winner vs runner-up
- Each card needs: type, title (article title), content (the text to display), optional subtitle

Return ONLY valid JSON in this exact format:
{
  "twitter_thread": ["tweet 1", "tweet 2", ...],
  "linkedin_post": "full post text",
  "reddit_summary": "full reddit post text",
  "suggested_subreddits": ["subreddit1", "subreddit2"],
  "image_cards": [
    {"type": "verdict", "title": "...", "content": "...", "subtitle": "..."},
    {"type": "stat", "title": "...", "content": "...", "subtitle": "..."}
  ]
}`
}

// ── Parse response ───────────────────────────────────────────────────────────

function parseSocialContent(
  raw: string,
  creatorName: string,
  articleUrl: string,
): SocialContent | null {
  try {
    // Extract JSON from potential markdown code fences
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[1].trim())

    // Validate and clean twitter thread
    const twitter_thread: string[] = Array.isArray(parsed.twitter_thread)
      ? parsed.twitter_thread
          .map((t: unknown) => String(t).trim())
          .filter((t: string) => t.length > 0 && t.length <= 300) // Allow slight overage, display will show count
      : []

    const linkedin_post = typeof parsed.linkedin_post === 'string' ? parsed.linkedin_post.trim() : ''
    const reddit_summary = typeof parsed.reddit_summary === 'string' ? parsed.reddit_summary.trim() : ''

    const suggested_subreddits: string[] = Array.isArray(parsed.suggested_subreddits)
      ? parsed.suggested_subreddits
          .map((s: unknown) => String(s).replace(/^r\//, '').trim())
          .filter((s: string) => s.length > 0)
      : []

    const image_cards: ImageCardData[] = Array.isArray(parsed.image_cards)
      ? parsed.image_cards
          .filter((c: Record<string, unknown>) => c.type && c.content)
          .map((c: Record<string, unknown>) => ({
            type: c.type as 'verdict' | 'stat' | 'comparison',
            title: String(c.title ?? ''),
            content: String(c.content ?? ''),
            subtitle: c.subtitle ? String(c.subtitle) : undefined,
            creator_name: creatorName,
            article_url: articleUrl,
          }))
      : []

    if (twitter_thread.length === 0 && !linkedin_post && !reddit_summary) {
      return null
    }

    return {
      twitter_thread,
      linkedin_post,
      reddit_summary,
      suggested_subreddits,
      image_cards,
    }
  } catch (err) {
    console.warn('[social-content] Failed to parse response:', (err as Error).message)
    return null
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate social content for an article.
 * Returns null on any failure — social content is a nice-to-have.
 */
export async function generateSocialContent(
  article: ArticleContent,
  query: string,
  creatorName: string,
  articleUrl: string,
  articleType: string,
  category: string,
  articleId?: string,
): Promise<SocialContent | null> {
  try {
    const context = extractArticleContext(article)
    const prompt = buildPrompt(context, creatorName, articleUrl, articleType, category)
    const raw = await callGemini(prompt, articleId)
    const content = parseSocialContent(raw, creatorName, articleUrl)

    if (content) {
      console.log(`[social-content] Generated: ${content.twitter_thread.length} tweets, ${content.linkedin_post.length} chars LinkedIn, ${content.suggested_subreddits.length} subreddits`)
    } else {
      console.warn('[social-content] Generation returned empty/invalid content')
    }

    return content
  } catch (err) {
    console.error('[social-content] Generation failed:', (err as Error).message)
    return null
  }
}

/**
 * Save social content to the article record.
 */
export async function saveSocialContent(articleId: string, content: SocialContent): Promise<void> {
  const db = getSupabaseAdmin()
  const { error } = await db
    .from('articles')
    .update({ social_content: content })
    .eq('id', articleId)

  if (error) {
    console.error('[social-content] Failed to save:', error.message)
  }
}
