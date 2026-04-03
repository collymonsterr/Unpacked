export interface CategoryConfig {
  slug: string
  name: string
  dbValue: string
  description: string
}

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'tech',
    name: 'Tech',
    dbValue: 'tech',
    description: 'The gadgets, platforms, and breakthroughs actually worth your attention.',
  },
  {
    slug: 'finance',
    name: 'Finance',
    dbValue: 'finance',
    description: 'Money decisions explained clearly — from investing and budgeting to the economic forces shaping your wallet.',
  },
  {
    slug: 'health',
    name: 'Health',
    dbValue: 'health_fitness',
    description: 'Nutrition, fitness, and wellness advice backed by research — not influencer trends.',
  },
  {
    slug: 'travel',
    name: 'Travel',
    dbValue: 'travel',
    description: 'Destinations, planning guides, and honest takes on where to go and what to skip.',
  },
  {
    slug: 'home',
    name: 'Home',
    dbValue: 'home_living',
    description: 'Appliances, furniture, smart home gear, and the practical choices that make daily life better.',
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    dbValue: 'entertainment',
    description: 'Streaming, gaming, music, and pop culture — what\'s worth your time and what isn\'t.',
  },
  {
    slug: 'science',
    name: 'Science',
    dbValue: 'science',
    description: 'The discoveries and ideas reshaping how we understand the world — explained without the jargon.',
  },
  {
    slug: 'business',
    name: 'Business',
    dbValue: 'business',
    description: 'Strategy, startups, and market moves — the decisions behind the companies that matter.',
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    dbValue: 'automotive',
    description: 'Cars, EVs, and everything on four wheels — honest reviews and real-world comparisons.',
  },
  {
    slug: 'culture',
    name: 'Culture',
    dbValue: 'culture',
    description: 'The trends, conversations, and shifts shaping how we live, work, and think.',
  },
  {
    slug: 'news',
    name: 'News',
    dbValue: 'current_affairs',
    description: 'What\'s happening right now — analysed with context, not just reported as headlines.',
  },
  {
    slug: 'ai',
    name: 'AI',
    dbValue: 'ai_future',
    description: 'The tools, models, and breakthroughs driving the most important technology shift of the decade.',
  },
]

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map(c => [c.slug, c]))

/** Map from DB value to category config (for reverse lookup) */
export const CATEGORY_BY_DB_VALUE = new Map(CATEGORIES.map(c => [c.dbValue, c]))

/** Map DB category value to URL slug */
export function categoryToSlug(dbCategory: string): string {
  const config = CATEGORY_BY_DB_VALUE.get(dbCategory)
  if (config) return config.slug
  // Fallback: try matching directly as a slug
  if (CATEGORY_BY_SLUG.has(dbCategory)) return dbCategory
  // Last resort: convert to slug format
  return dbCategory.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

/** Map URL slug to DB category value */
export function slugToDbCategory(slug: string): string | null {
  const config = CATEGORY_BY_SLUG.get(slug)
  return config?.dbValue ?? null
}

/** Map URL slug to display name */
export function slugToCategory(slug: string): string | null {
  const config = CATEGORY_BY_SLUG.get(slug)
  return config?.name ?? null
}
