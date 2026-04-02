# BUILD.md — Unpacked Current Feature State

What exists right now, confirmed by full codebase audit April 2026. Update this file whenever a feature ships.

---

## AI Pipeline (fully built, 8 stages)

| Stage | What | Model | File |
|-------|------|-------|------|
| 1. Planning | Type classification, structure, research manifest, forbidden_components | Claude Haiku 4.5 | `lib/claude.ts` |
| 2. Research | Brave + Reddit + live data (parallel), entity cards, Haiku synthesis | Brave API + Haiku | `lib/research-orchestrator.ts` |
| 3. Blueprint | Thesis, winner, section skeleton, word budgets, big statement placement | Gemini 2.5 Flash | `lib/blueprint.ts` |
| 4. Writing | Full article JSON with validation + retry + fallback | Gemini Flash (default), Sonnet (premium/fallback) | `lib/gemini-writer.ts`, `lib/claude.ts` |
| 5. Editorial | 15-check scoring, section rewrites | Sonnet (primary), Gemini (fallback) | `lib/editorial-pass.ts` |
| 6. Images | Routed multi-source: Pexels → Unsplash → Brave | Haiku (query gen) | `lib/images.ts`, `lib/image-router.ts`, `lib/pexels.ts` |
| 7. Fact-check | Triple: Gemini+Google Search, Haiku credibility, GPT-4o-mini arbitration | 3 models | `lib/fact-check.ts` |
| 8. Social | X thread, LinkedIn post, Reddit summary, image cards | Gemini Flash | `lib/social-content.ts` |

Pipeline orchestrated by `lib/write-pipeline.ts` with parallel phases and timing data.

---

## Article Types (10, verified in `lib/article-types.ts`)

buyer_guide, comparison, explainer, decision_guide, how_to, roundup, news_analysis, trend_analysis, breaking_news, deep_dive

Each has required/allowed/forbidden components, length range, tone, verdict rules.

---

## Categories (12, top-level DB column)

Tech, Finance, Health, Travel, Home, Entertainment, Science, Business, Automotive, Culture, News, AI

---

## Live Data Integrations (3, all built and wired into research phase)

- **Polymarket** — prediction odds, 3-stage pipeline (fetch → blocklist → Haiku LLM selection) → `lib/data-sources/polymarket.ts`
- **Yahoo Finance** — stock quotes + sparklines, 5-symbol limit → `lib/data-sources/yahoo-finance.ts`
- **Google Trends** — 12-month timeline via SerpAPI, trend direction → `lib/data-sources/google-trends.ts`

All run in parallel during research phase via `executeLiveDataQueries()`.

---

## Sign-In Gate (built)

- Generation starts for all users immediately
- Anonymous users see research preview while waiting (`components/ResearchPreview.tsx`)
- Sign-in overlay with Google OAuth — redirect-based (not popup)
- Article pauses at `awaiting_auth` until sign-in
- State preserved via DB, not localStorage
- Auto-expires `awaiting_auth` articles after 24 hours

---

## Visibility System (built)

- Three-state: `private` / `unlisted` / `published`
- Defaults: anonymous → unlisted, logged-in → private, admin → published
- FirstDraftBanner UI controls for visibility change
- Existing articles migrated

---

## Voting System (built)

- `ArticleVoting` component with two cards:
  - Card 1: "Was this article helpful?" — Helpful (amber) / Not helpful (red)
  - Not helpful expands: 6 reason pills + 140-char textarea + Submit
  - Card 2: "Was the verdict convincing?" — only shown when article has verdict
  - Stats line at ≥5 total verdict votes
- localStorage: `unpacked_votes_[articleId]` (state) + `unpacked_session_id` (anon session)
- `article_votes` table with `reason` and `comment` columns

---

## Editorial System (built)

- `lib/editorial-rules.ts`: 50+ forbidden AI phrases, 20 filler patterns, 10 tone codes
- `lib/editorial-pass.ts`: Sonnet primary, Gemini fallback, 15 checks, section-level rewrites
- Applied automatically in pipeline after writing phase

---

## Image Pipeline (built — routed multi-source)

- `lib/image-router.ts` — routes by image type: hero editorial → pexels/unsplash/brave, news → brave only
- `lib/pexels.ts` — Pexels API with attribution (graceful fallback if key missing)
- `lib/images.ts` — hero + product images, Haiku query generation, candidate filtering
- Owner can upload custom hero image via Supabase Storage

---

## Research System (built — entity cards + synthesis)

- `lib/research-orchestrator.ts` orchestrates all research in parallel
- Entity card extraction from findings (structured: name, type, facts, sources, confidence)
- Haiku synthesis replaces flat research summaries
- Brave web + Reddit + live data all parallel
- `sanitizeSnippet()` in brave-research.ts prevents JSON failures from unescaped content

---

## Social Content Generation (built, async)

- `lib/social-content.ts` — generates X thread, LinkedIn post, Reddit summary, image cards
- Gemini Flash, ~$0.001/article
- Runs asynchronously after article delivery
- Saved to DB via `saveSocialContent()`

---

## Homepage (built)

1. PendingArticleRecovery → Navbar (no search) → HomepageHero → TrustStrip
2. Featured: 1 hero (2fr) + 2×2 small cards (3fr), 540px, pool-based rotation
3. Trending Today: 3 dark-style cards, manual admin toggle, pool-based
4. Most Popular: top 4 by view_count with rank badges
5. Recent Articles: 3 per row with category filter pills
6. Footer

Deduplicates article chains via `root_article_id`.

---

## Admin Dashboard (built — 4 tabs)

- **Overview:** stats summary
- **Articles:** 5 filter tabs, star/flame/eye toggles, drag-to-reorder (@dnd-kit), per-article controls
- **Costs:** API usage, Gemini vs Sonnet split, fallback rate %, amber alert >5%
- **Feedback:** vote data and comments

Admin = email matches `NEXT_PUBLIC_ADMIN_EMAIL`.

---

## Article Page Features (built)

- Server-rendered with JSON-LD injection (Article, Person, ClaimReview, Review, BreadcrumbList)
- Client-side polling for in-progress articles
- Fact-check bar with corrections display
- Verified badge (green shield, "Verified" label)
- Internal linking (client-side injection, zero DB writes, cached 1 hour)
- Product cards, comparison tables, calculators, charts (Recharts), verdict box
- PDF export (jspdf)
- Reddit community section (real threads from Brave)
- Refine/fork system (child article, lineage via parent/root IDs)
- Navbar with search autocomplete (top 5 by view_count, published articles only)

---

## Generation Options (built, wired to prompts)

- **Length:** quick / standard / deep
- **Tone:** opinionated / balanced / casual (+ 7 more codes in editorial-rules.ts)
- **Visual density:** configurable
- Profile preferences: location, currency, language merged into generation options

---

## Pages Confirmed Built

| Path | File | Notes |
|------|------|-------|
| `/` | `app/page.tsx` | Homepage, server component |
| `/article/[slug]` | `app/article/[slug]/page.tsx` | Article page, UUID or slug lookup |
| `/admin` | `app/admin/page.tsx` | Admin dashboard, 4 tabs |
| `/about` | `app/about/page.tsx` | 8 sections, typewriter hero |
| `/how-it-works` | `app/how-it-works/page.tsx` | Explanation page |
| `/updates` | `app/updates/page.tsx` | Changelog |
| `/dashboard` | `app/dashboard/page.tsx` | User dashboard |
| `/creators` | `app/creators/page.tsx` | Creator listing |
| `/creator/[id]` | `app/creator/[id]/page.tsx` | Creator profile |
| `/settings` | `app/settings/page.tsx` | User settings |
| `/recent` | `app/recent/page.tsx` | Recent articles |
| `/build` | `app/build/page.tsx` | Build page |

---

## API Routes (37 confirmed)

Covering: articles CRUD, admin actions, search, saved articles, profile management, voting, fact-check, images, social content, rate limiting.

---

## Cost Controls (built)

- `api_usage_log` table with token counts and cost tracking
- `MODEL_PRICING` in `lib/api-usage.ts` with per-model rates
- Duplicate call guard (in-memory, 5-min window)
- Query caching (similar article check before generation)
- Concurrency limiter: `GEMINI_MAX_CONCURRENT=3` (in-memory)
- Admin Costs tab: usage breakdown, fallback monitoring

---

## SEO (built)

- JSON-LD structured data: Article, Person, ClaimReview, Review, BreadcrumbList
- Sitemap, robots.txt, OG tags, canonical URLs
- Security headers in next.config.ts (X-Content-Type-Options, X-Frame-Options, etc.)

---

## Known Bugs (verified)

1. ~~**Big statements and pull quotes visually identical**~~ — **FIXED April 2026.** Pull quotes now use left-border italic style; big statements keep amber card + quote SVG.
2. ~~**Polymarket uses old Haiku model**~~ — **FIXED April 2026.** Updated to `claude-haiku-4-5-20251001`.
3. ~~**Editorial pass score threshold mismatch**~~ — **FIXED April 2026.** Code threshold aligned to ≤80, matching the prompt.
4. **In-memory state in serverless** — Gemini concurrency limiter, duplicate call guard, Yahoo Finance cache all in-memory. Work per-instance but don't coordinate across instances.

---

## Confirmed NOT Built

Verified absent from codebase as of April 2026:

- **Stripe / payment processing** — zero files
- **Affiliate infrastructure** — no `affiliate_url` field, no link routing, no revenue tracking
- **Category pages** — no `/category/[slug]` routes
- **Creator analytics dashboard** — not built (basic dashboard exists but no per-article analytics)
- **Referral system** — not built
- **Email capture / weekly digest** — not built
- **Trending questions dashboard** — not built (live data sources exist but no `/trending` page)
- **Social links on profiles** — no `twitter_url` or `linkedin_url` in profiles table
- **Vision-based image selection** — not built (filtering is rule-based, no GPT-4o-mini vision)
- **Canonical topic system** — not built
- **Creator status / badges** — not built
- **Views-for-premium mechanic** — not built
- **Research Companion tab** — not built (research preview exists for sign-in gate, but no persistent research tab on articles)
- **Screenshot-proof branding** — not built
- **One-click social posting** — social content is generated but no one-click copy/post UI
- **Onboarding flow** — not built
- ~~**Author block prominence**~~ — already done: 40px avatar, 15px font-medium name, bio line, Twitter link.
