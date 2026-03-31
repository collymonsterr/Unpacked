/**
 * Centralised editorial rules — forbidden phrases, tone guidance, and quality constants.
 * Used by blueprint generation, prose writing, and the editorial pass.
 */

/**
 * Phrases that must NEVER appear in any article.
 * AI-tell language, hedging, filler, and cliches.
 */
export const FORBIDDEN_PHRASES = [
  'it depends on your personal preference',
  'there are many great options',
  'both are excellent choices',
  'ultimately it comes down to',
  "in today's fast-paced world",
  "it's worth noting that",
  'at the end of the day',
  'dive deep into',
  'navigate the landscape',
  'game-changer',
  'look no further',
  'without further ado',
  'in this article we will',
  "let's explore",
  'in conclusion',
  'to sum up',
  'all in all',
  'the bottom line is',
  'it goes without saying',
  'needless to say',
  'interestingly enough',
  "it's important to note",
  'as we all know',
  'in the world of',
  'when it comes to',
  "whether you're a beginner or an expert",
  'has something for everyone',
  'takes it to the next level',
  'a must-have for anyone',
  "you won't be disappointed",
  'the landscape of',
  'in the realm of',
  'leverage',
  'utilize',
  'facilitate',
  'in terms of',
  'at this point in time',
  'moving forward',
  'paradigm shift',
  'deep dive',
  'unpack',
  'holistic approach',
  'robust solution',
  'cutting-edge',
  'state-of-the-art',
  'innovative solution',
  'comprehensive guide',
  'everything you need to know',
] as const

/**
 * Tone descriptors mapped from article type tone codes.
 */
export const TONE_DESCRIPTIONS: Record<string, string> = {
  confident_practical: 'Confident and practical. You know exactly what works and you say it plainly. No need to justify every opinion.',
  direct_authoritative: 'Direct and authoritative. Pick the winner fast, explain why briefly, move on.',
  clear_authoritative: 'Clear and authoritative. You are the expert explaining to a smart non-expert. No condescension, no jargon without explanation.',
  thoughtful_advisory: 'Thoughtful and advisory. This is a life decision — be honest about trade-offs, but still have a clear recommendation.',
  practical_clear: 'Practical and clear. The reader wants to DO something. Every sentence should move them closer to completing the task.',
  opinionated_curated: 'Opinionated and curated. You tested these, you know which ones are worth it. Be brutal about the mediocre ones.',
  analytical_confident: 'Analytical and confident. You understand what this event means. Explain the implications, take a position on what happens next.',
  investigative: 'Investigative and evidence-driven. Follow the data. Challenge the hype. Say what others won\'t.',
  urgent_controlled: 'Urgent but controlled. Facts first, speculation clearly labelled. No breathless hype.',
  authoritative_engaging: 'Authoritative and engaging. This is the definitive piece. Synthesise everything, take a bold position, back it up.',
}

/**
 * Get a human-readable tone description for writing prompts.
 */
export function getToneDescription(toneCode: string): string {
  return TONE_DESCRIPTIONS[toneCode] ?? 'Write with confidence and clarity. Take clear positions backed by evidence.'
}
