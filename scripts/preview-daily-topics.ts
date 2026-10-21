/**
 * Dry-run the daily topic picker across every beat. Picks topics only — it
 * never generates or publishes an article.
 *
 * Usage:
 *   npx tsx scripts/preview-daily-topics.ts            # all 14 beats
 *   npx tsx scripts/preview-daily-topics.ts Gaming     # one beat
 *   npx tsx scripts/preview-daily-topics.ts --headlines # show raw input too
 *
 * Costs a couple of Brave searches plus one Haiku call per beat (fractions of
 * a cent). Use it to judge topic quality before trusting the cron.
 */
import './load-env'
import { BEATS, discover, pickTopicForBeat } from '../lib/daily-topic'

async function main() {
  const args = process.argv.slice(2)
  const showHeadlines = args.includes('--headlines')
  const only = args.find(a => !a.startsWith('--'))
  const beats = only
    ? BEATS.filter(b => b.category.toLowerCase() === only.toLowerCase())
    : BEATS

  if (beats.length === 0) {
    console.error(`No beat called "${only}". Available: ${BEATS.map(b => b.category).join(', ')}`)
    process.exit(1)
  }

  let picked = 0
  for (const beat of beats) {
    console.log(`\n${'='.repeat(70)}\nBEAT: ${beat.category}`)
    const headlines = await discover(beat)
    console.log(`${headlines.length} stories survived filtering`)
    if (showHeadlines) for (const h of headlines) console.log(`   ${h.slice(0, 150)}`)

    if (headlines.length === 0) { console.log('   -> no usable stories, cron would skip'); continue }

    const topic = await pickTopicForBeat(beat, headlines)
    if (!topic) {
      console.log('   -> DECLINED (nothing cleared the bar)')
    } else {
      picked++
      console.log(`   -> QUERY:     ${topic.query}`)
      console.log(`      category:  ${topic.category}`)
      console.log(`      rationale: ${topic.rationale}`)
    }
  }
  console.log(`\n${'='.repeat(70)}\n${picked}/${beats.length} beats produced a topic.`)
}

main().catch(e => { console.error(e); process.exit(1) })
