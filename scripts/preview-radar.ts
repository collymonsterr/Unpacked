/**
 * Dry-run Story Radar: collect, cluster, score and rank what's trending.
 * Shows the evidence behind every score. Publishes nothing, costs only a few
 * Brave news calls (HN is free).
 *
 * Usage: npx tsx scripts/preview-radar.ts [topN]
 */
import './load-env'
import { BEATS } from '../lib/daily-topic'
import { collectHackerNews, collectNews, rankStories, type Candidate } from '../lib/story-radar'

async function main() {
  const topN = Number(process.argv[2] ?? 20)

  const [hn, ...newsBatches] = await Promise.all([
    collectHackerNews(),
    ...BEATS.map(b => collectNews(b.category, b.phrases)),
  ])
  const candidates: Candidate[] = [hn, ...newsBatches].flat()

  console.log(`collected ${candidates.length} candidates (${hn.length} from HN, ${candidates.length - hn.length} from news)`)

  const ranked = rankStories(candidates)
  console.log(`clustered into ${ranked.length} stories\n`)
  console.log('='.repeat(78))

  for (const s of ranked.slice(0, topN)) {
    const bar = '█'.repeat(Math.round(s.score / 5)).padEnd(20, '·')
    console.log(`\n[${String(s.score).padStart(3)}] ${bar}  ${s.beat}`)
    console.log(`  ${s.title.slice(0, 92)}`)
    console.log(`  ${s.evidence}`)
    if (s.members.length > 1) {
      for (const m of s.members.slice(1, 4)) console.log(`     also: ${m.hostname} — ${m.title.slice(0, 66)}`)
    }
  }
  console.log(`\n${'='.repeat(78)}`)
  const multi = ranked.filter(s => s.sources > 1).length
  console.log(`${multi} of ${ranked.length} stories are corroborated by 2+ sources.`)
}

main().catch(e => { console.error(e); process.exit(1) })
