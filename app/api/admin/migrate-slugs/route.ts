import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { generateUniqueSlug } from '@/lib/slug'

export const maxDuration = 120

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { data: articles } = await db
    .from('articles')
    .select('id, slug, article, query')
    .in('status', ['complete', 'verified', 'generating', 'planning'])
    .order('created_at', { ascending: true })

  if (!articles || articles.length === 0) {
    return Response.json({ message: 'No articles found', changes: [] })
  }

  const changes: Array<{ title: string; oldSlug: string; newSlug: string; status: 'updated' | 'skipped' }> = []

  for (const row of articles) {
    // Use AI-generated title if available, otherwise use query
    const title = row.article?.title ?? row.query
    if (!title) {
      changes.push({ title: '(no title)', oldSlug: row.slug, newSlug: row.slug, status: 'skipped' })
      continue
    }

    // Generate clean slug, excluding this article's own ID from uniqueness check
    const newSlug = await generateUniqueSlug(title, row.id)

    if (newSlug === row.slug) {
      changes.push({ title, oldSlug: row.slug, newSlug, status: 'skipped' })
      continue
    }

    // Update the slug
    const { error } = await db
      .from('articles')
      .update({ slug: newSlug })
      .eq('id', row.id)

    if (error) {
      console.error(`[migrate-slugs] Failed to update ${row.id}:`, error.message)
      changes.push({ title, oldSlug: row.slug, newSlug: `ERROR: ${error.message}`, status: 'skipped' })
    } else {
      changes.push({ title, oldSlug: row.slug, newSlug, status: 'updated' })
    }
  }

  const updated = changes.filter(c => c.status === 'updated').length
  const skipped = changes.filter(c => c.status === 'skipped').length

  return Response.json({
    message: `Migration complete: ${updated} updated, ${skipped} skipped`,
    total: articles.length,
    updated,
    skipped,
    changes,
  })
}
