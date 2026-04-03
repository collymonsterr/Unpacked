export interface CategoryConfig {
  slug: string
  name: string
  description: string
}

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'tech',
    name: 'Tech',
    description: 'The gadgets, platforms, and breakthroughs actually worth your attention.',
  },
  {
    slug: 'finance',
    name: 'Finance',
    description: 'Money decisions explained clearly — from investing and budgeting to the economic forces shaping your wallet.',
  },
  {
    slug: 'health',
    name: 'Health',
    description: 'Nutrition, fitness, and wellness advice backed by research — not influencer trends.',
  },
  {
    slug: 'travel',
    name: 'Travel',
    description: 'Destinations, planning guides, and honest takes on where to go and what to skip.',
  },
  {
    slug: 'home',
    name: 'Home',
    description: 'Appliances, furniture, smart home gear, and the practical choices that make daily life better.',
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    description: 'Streaming, gaming, music, and pop culture — what\'s worth your time and what isn\'t.',
  },
  {
    slug: 'science',
    name: 'Science',
    description: 'The discoveries and ideas reshaping how we understand the world — explained without the jargon.',
  },
  {
    slug: 'business',
    name: 'Business',
    description: 'Strategy, startups, and market moves — the decisions behind the companies that matter.',
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    description: 'Cars, EVs, and everything on four wheels — honest reviews and real-world comparisons.',
  },
  {
    slug: 'culture',
    name: 'Culture',
    description: 'The trends, conversations, and shifts shaping how we live, work, and think.',
  },
  {
    slug: 'news',
    name: 'News',
    description: 'What\'s happening right now — analysed with context, not just reported as headlines.',
  },
  {
    slug: 'ai',
    name: 'AI',
    description: 'The tools, models, and breakthroughs driving the most important technology shift of the decade.',
  },
]

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map(c => [c.slug, c]))

/** Map DB category names to URL slugs */
export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, '-')
}

/** Map URL slug back to DB category name */
export function slugToCategory(slug: string): string | null {
  const config = CATEGORY_BY_SLUG.get(slug)
  return config?.name ?? null
}
