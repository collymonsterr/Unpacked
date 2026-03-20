# ArticleAI

## What This Is

ArticleAI generates full, opinionated, magazine-quality articles from a single query. Users type something like "Best beginner electric guitars under $500" and get a structured article with product cards, comparison tables, data charts, editorial photos, and a clear verdict — written like a senior product journalist, not an AI chatbot.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack dev) |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (Anthropic) with web search tool |
| Image Search | Brave Search API |
| Charts | Recharts |
| Styling | Tailwind CSS + CSS custom properties for theming |
| Fonts | Sora (headings), Outfit (body) via Google Fonts |
| Deployment | Vercel |

## Project Structure

```
app/
  page.tsx                          # Homepage (search + recent articles grid)
  layout.tsx                        # Root layout with fonts, metadata
  article/[slug]/
    page.tsx                        # Server component — fetches article by slug
    ArticlePageClient.tsx           # Client component — polling, refinement, article display
  api/articles/
    create/route.ts                 # POST — plan article, save to DB, kick off generation
    recent/route.ts                 # GET — homepage article cards (pinned first)
    [id]/
      route.ts                      # GET — fetch single article by ID (used for polling)
      generate/route.ts             # POST — write article + enrich images (called by create)
      refine/route.ts               # POST — apply refinement instruction to existing article
      regenerate-images/route.ts    # POST — re-fetch product + thumbnail images
      pin/route.ts                  # POST — toggle pinned status
      delete/route.ts               # DELETE — remove article

components/
  SearchForm.tsx                    # Homepage search with contextual loading messages
  ArticleView.tsx                   # Full article renderer with gear menu (pin/regenerate/delete)
  ArticleSkeleton.tsx               # Loading skeleton shown while article generates
  RecentArticlesGrid.tsx            # Homepage card grid
  sections/
    SectionRenderer.tsx             # Maps section types to components
    ProductCard.tsx                 # Product cards with hero image + thumbnail strip
    ImageSection.tsx                # Editorial photos (single/gallery/side-by-side layouts)
    BarChartSection.tsx             # Recharts bar chart
    LineChartSection.tsx            # Recharts line chart
    PieChartSection.tsx             # Recharts pie/donut chart
    TreemapSection.tsx              # Recharts treemap
    ComparisonMatrix.tsx            # Radar-style comparison
    StatCards.tsx                   # Key numbers at a glance
    TimelineSection.tsx             # Chronological events
    ComparisonTable.tsx             # Side-by-side data table
    ContentSection.tsx              # Prose paragraphs (supports markdown)
    HeadToHead.tsx                  # Category-by-category winner comparison
    CommunityInsights.tsx           # Reddit/forum sentiment
    PriceTierBreakdown.tsx          # Budget/mid/premium tier picks
    WarningBox.tsx                  # Things to avoid
    WhoThisIsFor.tsx                # User profile recommendations
    QuickVerdict.tsx                # Top-level verdict box
    ExecutiveSummary.tsx            # Key takeaways + watch out for
    Sources.tsx                     # Source links
  ui/
    ArticleTypeBadge.tsx            # Colored badge per article type
    Logo.tsx                        # Site logo
    RefinementInput.tsx             # Inline refinement text input
    SuggestionChips.tsx             # Clickable suggestion pills

lib/
  claude.ts                         # Claude API calls (planArticle, writeArticle, refineArticle)
  images.ts                         # Brave image search, filtering, ranking, enrichment
  article-config.ts                 # Visual strategy defaults + article type labels
  supabase.ts                       # Supabase client factories (anon + admin)
  slug.ts                           # Slug generation from titles

types/
  article.ts                        # All TypeScript types (sections, plan, article, DB row)
```

## Article Generation Pipeline

1. **Plan** (`planArticle`) — Claude classifies the query into an article type, sets a visual strategy, identifies entities, outlines sections
2. **Write** (`writeArticle`) — Claude writes the full article JSON with web search (up to 5 searches), following the visual strategy from the plan
3. **Enrich** (`enrichArticleWithImages`) — Brave Search fetches product images for product cards and editorial photos for image sections
4. **Thumbnail** (`fetchThumbnailImage`) — Separate Brave search for an article-level hero image

Steps 3 and 4 run in parallel after step 2.

## Article Types

`buyer_guide` | `comparison` | `decision_guide` | `explainer` | `news` | `planning` | `trend_analysis` | `tutorial`

Each type has a default `VisualStrategy` in `lib/article-config.ts` that controls which section types the AI should use.

## Critical Implementation Details

1. **Next.js 16 params**: Route handler `params` is a Promise — always `await params` before accessing properties.
2. **Claude prompts are the product**: The system prompts in `lib/claude.ts` are long and detailed by design. Do not simplify or shorten them.
3. **Recharts + opacity bug**: Chart sections (`bar_chart`, `line_chart`, `pie_chart`, `treemap`) must NOT be rendered inside `opacity: 0` containers. `SectionRenderer` uses `fade-in-up-chart` (no opacity change) for these types and `fade-in-up` (with opacity) for all others.
4. **Image graceful degradation**: Images frequently fail to load. Every image component has `onError` handling. Product cards work with 0-5 images. Image sections filter out failed images.
5. **Brave image ranking**: `lib/images.ts` prioritizes images from Amazon, Apple, Samsung, Best Buy, Walmart, Shopify, B&H Photo. Rejects SVGs, GIFs, favicons, Reddit thumbnails, and tracking pixels.
6. **Polling**: Article pages poll `GET /api/articles/[id]` every 2-3 seconds while `status === 'generating'`.
7. **`after()` for background work**: The create endpoint uses Next.js `after()` to run article generation after responding with the article ID.
8. **Supabase clients**: Use `getSupabase()` for anon access, `getSupabaseAdmin()` for service-role operations. Never instantiate at module level (breaks builds without env vars).

## Environment Variables

```
ANTHROPIC_API_KEY          # Claude API key
BRAVE_SEARCH_API_KEY       # Brave Search API key (image search)
NEXT_PUBLIC_SUPABASE_URL   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY  # Supabase service role key (server-side only)
```

## Database Schema

Single `articles` table:
- `id` (uuid, PK)
- `slug` (text, unique)
- `query` (text)
- `status` (text: planning | generating | complete | error)
- `plan` (jsonb, nullable)
- `article` (jsonb, nullable)
- `suggestion_chips` (jsonb, nullable)
- `pinned` (boolean, default false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
```

## Deployment

- Hosted on Vercel at https://articleai-three.vercel.app
- GitHub: https://github.com/collymonsterr/articleai
- All env vars must be set in Vercel project settings
- `NEXT_PUBLIC_*` vars are needed at build time
- Git committer email must match a GitHub account email to avoid deployment blocks

## Style & Theming

CSS custom properties defined in `globals.css`:
- `--accent` (orange), `--text-primary`, `--text-secondary`, `--card`, `--border`, etc.
- Dark mode support via `prefers-color-scheme: dark`
- Fonts: `--font-sora` for headings, `--font-outfit` for body text
- Mobile-first responsive design throughout
