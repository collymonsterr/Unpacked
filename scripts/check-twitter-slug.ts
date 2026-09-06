/**
 * Inspect a specific article by slug for Twitter data.
 * Usage: npx tsx scripts/check-twitter-slug.ts <slug>
 */
import './load-env'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const slug = process.argv[2] || 'trump-iran-ceasefire'

const supabase = createClient(url, key)

async function main() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, query, status, created_at, plan, article, twitter_findings, twitter_summary')
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) { console.error(error); process.exit(1) }
  if (!data || data.length === 0) { console.log('Not found:', slug); return }

  const a = data[0] as any
  const plan = a.plan || {}
  const manifest = plan.research_manifest || plan.researchManifest || {}
  const tq = manifest.twitter_queries ?? manifest.twitterQueries ?? null

  console.log('id:        ', a.id)
  console.log('slug:      ', a.slug)
  console.log('title:     ', a.article?.title ?? '(none)')
  console.log('status:    ', a.status)
  console.log('created_at:', a.created_at)
  console.log('')
  console.log('=== plan.research_manifest.twitter_queries ===')
  console.log(tq === null ? '(absent/null)' : JSON.stringify(tq, null, 2))
  console.log('')
  console.log('=== twitter_findings ===')
  if (a.twitter_findings == null) console.log('(null)')
  else if (Array.isArray(a.twitter_findings) && a.twitter_findings.length === 0) console.log('(empty array)')
  else {
    console.log('count:', Array.isArray(a.twitter_findings) ? a.twitter_findings.length : 'not-array')
    console.log(JSON.stringify(a.twitter_findings, null, 2))
  }
  console.log('')
  console.log('=== twitter_summary ===')
  if (a.twitter_summary == null) console.log('(null)')
  else if (a.twitter_summary === '') console.log('(empty string)')
  else console.log(a.twitter_summary)
  console.log('')
  console.log('=== manifest keys ===', Object.keys(manifest))
}

main().catch((e) => { console.error(e); process.exit(1) })
