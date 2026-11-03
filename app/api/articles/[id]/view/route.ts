import { getSupabaseAdmin } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'

/**
 * How many views pass between writes to `articles.view_count`.
 *
 * Postgres cannot update one field in place — an UPDATE rewrites the whole row
 * (MVCC). The average article row is ~97KB, so incrementing a counter from 41
 * to 42 wrote 97KB of heap plus WAL. Across 11,502 views that is ~1.1GB of disk
 * writes to maintain an integer, which is what depleted the project's Disk IO
 * budget (Supabase alert, Nov 2026) and left the instance unresponsive.
 *
 * `article_views` still gets one small append-only row per view, so the
 * time-series stays exact. Only the expensive denormalised counter is batched,
 * and it can now trail the true figure by up to this many views.
 */
const VIEW_COUNT_WRITE_EVERY = 10

/** Early views are written through, so a new article doesn't sit on zero. */
const WRITE_THROUGH_BELOW = 10

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })
  const supabase = getSupabaseAdmin()

  // Append-only and cheap: a narrow row, no rewrite of the article.
  // This is the source of truth for view analytics.
  const { error: insertError } = await supabase.from('article_views').insert({ article_id: id })

  const { data } = await supabase
    .from('articles')
    .select('view_count')
    .eq('id', id)
    .single()

  if (!data) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const next = (data.view_count ?? 0) + 1
  const shouldWrite = next < WRITE_THROUGH_BELOW || next % VIEW_COUNT_WRITE_EVERY === 0

  if (shouldWrite) {
    const { error } = await supabase
      .from('articles')
      .update({ view_count: next })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Failed to increment view' }, { status: 500 })
    }
  }

  // A failed insert is not worth failing the request over — the counter above
  // is what the UI reads.
  if (insertError) console.warn('[view] article_views insert failed:', insertError.message)

  return Response.json({ ok: true, counted: shouldWrite })
}
