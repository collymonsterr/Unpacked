/**
 * Inspect latest article for Twitter data.
 * Usage: npx tsx scripts/check-latest-twitter.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, query, status, created_at, plan, twitter_findings, twitter_summary')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Query error:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('No articles found')
    return
  }

  const a = data[0] as any
  const plan = a.plan || {}
  const manifest = plan.research_manifest || plan.researchManifest || {}
  const twitterQueries = manifest.twitter_queries ?? manifest.twitterQueries ?? null

  console.log('=== LATEST ARTICLE ===')
  console.log('id:           ', a.id)
  console.log('slug:         ', a.slug)
  console.log('title:        ', a.title)
  console.log('query:        ', a.query)
  console.log('status:       ', a.status)
  console.log('created_at:   ', a.created_at)
  console.log('')
  console.log('=== PLAN.twitter_queries ===')
  if (twitterQueries === null || twitterQueries === undefined) {
    console.log('(absent / null)')
  } else if (Array.isArray(twitterQueries) && twitterQueries.length === 0) {
    console.log('(empty array)')
  } else {
    console.log(JSON.stringify(twitterQueries, null, 2))
  }
  console.log('')
  console.log('=== twitter_findings column ===')
  if (a.twitter_findings === null || a.twitter_findings === undefined) {
    console.log('(null)')
  } else if (Array.isArray(a.twitter_findings) && a.twitter_findings.length === 0) {
    console.log('(empty array)')
  } else {
    console.log('count:', Array.isArray(a.twitter_findings) ? a.twitter_findings.length : 'not-array')
    console.log(JSON.stringify(a.twitter_findings, null, 2))
  }
  console.log('')
  console.log('=== twitter_summary column ===')
  if (a.twitter_summary === null || a.twitter_summary === undefined) {
    console.log('(null)')
  } else if (a.twitter_summary === '') {
    console.log('(empty string)')
  } else {
    console.log(a.twitter_summary)
  }
  console.log('')
  console.log('=== manifest keys present ===')
  console.log(Object.keys(manifest))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
