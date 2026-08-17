import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { MODELS } from '@/lib/models'
import { CATEGORIES } from '@/lib/category-config'
import Anthropic from '@anthropic-ai/sdk'

const VALID_CATEGORIES = CATEGORIES.map(c => c.dbValue)

const HAIKU_MODEL = MODELS.haiku

/** Extract first ~200 words of readable text from article JSON */
function extractContent(article: Record<string, unknown>): string {
  const parts: string[] = []

  if (article.introduction && typeof article.introduction === 'string') {
    parts.push(article.introduction)
  }

  const sections = article.sections
  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (typeof section === 'object' && section !== null) {
        const s = section as Record<string, unknown>
        if (typeof s.content === 'string') parts.push(s.content)
        if (typeof s.body === 'string') parts.push(s.body)
        if (typeof s.text === 'string') parts.push(s.text)
        // For product cards, use the description
        if (typeof s.description === 'string') parts.push(s.description)
      }
      // Stop once we have enough
      if (parts.join(' ').split(/\s+/).length > 250) break
    }
  }

  const fullText = parts.join(' ')
  const words = fullText.split(/\s+/)
  return words.slice(0, 200).join(' ')
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey })
  const db = getSupabaseAdmin()

  // Fetch all published articles
  const { data: articles, error: fetchError } = await db
    .from('articles')
    .select('id, slug, query, category, article')
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')
    .order('created_at', { ascending: false })

  if (fetchError || !articles) {
    return Response.json({ error: 'Failed to fetch articles', detail: fetchError?.message }, { status: 500 })
  }

  const validSet = new Set(VALID_CATEGORIES)
  const results: Array<{ id: string; slug: string; old: string | null; new_cat: string; changed: boolean }> = []
  let errors = 0

  // Use streaming response so the admin UI can show progress
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'start', total: articles.length })

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i]
        const art = article.article as Record<string, unknown> | null
        const title = (art?.title as string) ?? article.query ?? ''
        const content = art ? extractContent(art) : ''

        if (!title && !content) {
          send({ type: 'skip', index: i, id: article.id, reason: 'no content' })
          continue
        }

        try {
          const response = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 50,
            messages: [
              {
                role: 'user',
                content: `Classify this article into exactly one category. Choose from: ${VALID_CATEGORIES.join(', ')}. Only return the category value, nothing else.\n\nTitle: ${title}\nContent: ${content}`,
              },
            ],
          })

          const raw = (response.content[0] as { type: string; text: string }).text.trim().toLowerCase()
          // Clean up — sometimes the model wraps in quotes or adds extra text
          const cleaned = raw.replace(/['"]/g, '').trim()
          const newCat = validSet.has(cleaned) ? cleaned : null

          if (newCat) {
            const changed = article.category !== newCat
            if (changed) {
              await db.from('articles').update({ category: newCat }).eq('id', article.id)
            }
            results.push({
              id: article.id,
              slug: article.slug,
              old: article.category,
              new_cat: newCat,
              changed,
            })
            send({ type: 'progress', index: i, id: article.id, slug: article.slug, old: article.category, new_cat: newCat, changed })
          } else {
            errors++
            send({ type: 'error', index: i, id: article.id, slug: article.slug, reason: `Invalid category: "${raw}"` })
          }
        } catch (err) {
          errors++
          send({ type: 'error', index: i, id: article.id, slug: article.slug, reason: String(err) })
        }

        // Small delay to avoid rate limits
        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Summary
      const changedCount = results.filter(r => r.changed).length
      const categoryCounts: Record<string, number> = {}
      for (const r of results) {
        categoryCounts[r.new_cat] = (categoryCounts[r.new_cat] ?? 0) + 1
      }

      send({
        type: 'complete',
        total: articles.length,
        classified: results.length,
        changed: changedCount,
        unchanged: results.length - changedCount,
        errors,
        categoryCounts,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
