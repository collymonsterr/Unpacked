import slugify from 'slugify'
import { getSupabaseAdmin } from './supabase'

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true, trim: true }).slice(0, 80)

  // Check if slug exists
  const { data } = await getSupabaseAdmin()
    .from('articles')
    .select('slug')
    .eq('slug', base)
    .maybeSingle()

  if (!data) return base

  // Append random 4-char suffix
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}
