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

### Smart Decision Logic (built April 2026)
- **Planning step**: Haiku planner uses strict criteria per source (Polymarket only for forward-looking outcomes, Google Trends only for time-sensitive topics, Yahoo Finance only for direct financial connections). Max 2 sources per article (3 only when all tell different parts of the same story). `live_data_rationale` field required per query. `market_type` field (binary/multi_outcome) for Polymarket.
- **Post-fetch quality filters** in `executeLiveDataQueries()`:
  - Polymarket: volume must be ≥$500k (discarded if below — odds not liquid enough)
  - Google Trends: change must be ≥50% or trend rising/peaking (discarded if flat)
  - Yahoo Finance: at least one ticker must move ≥±0.5% today (all discarded if flat)
- **Blueprint awareness**: Blueprint receives live data that survived filters, plans section placement only for available data. No space allocated for discarded sources.

### Live Data Visualisation Components (built April 2026)
Four distinct components in `components/sections/LiveDataCard.tsx`, auto-selected by data type:
1. **Polymarket Multi-Outcome** — sorted outcome bars with colour coding (green/blue/amber/grey), volume display, source pill
2. **Polymarket Binary** — large probability display (4xl), Yes/No split columns, combined colour bar. Chart placeholder ready for historical odds when available (Polymarket API doesn't provide time series)
3. **Google Trends** — current interest score, % change vs prior 3 months, Recharts AreaChart with auto-scaled Y-axis (adapts to low data ranges), X/Y axis labels, unique gradient IDs per card, amber gradient fill, tooltip
4. **Yahoo Finance Grid** — 2×2 responsive grid of ticker cards, each with symbol/name/price/change badge (green/red tinted), inline SVG sparkline with configurable timeframe (1d/1m/3m/6m), period change display for multi-month timeframes, timeframe label on sparkline
- All components share: consistent card styling with `display: flex; flex-direction: column`, source pills, `CardFooter` (nowrap), IntersectionObserver fade-in
- Grid layout uses `items-stretch` for equal-height cards side by side
- Uses Recharts (already in project) for Google Trends chart
- SectionRenderer grouping logic uses flex containers for height equalisation
- Yahoo Finance `timeframe` field in planning schema → API range parameter → component display
- Markdown heading syntax (`## Text`) in article body auto-converted to styled `<h4>` subheadings (safety net in ContentSection.tsx)

---

## Onboarding Flow (built)

- First-time users (zero articles) see a modified hero on the homepage
- Headline: "Welcome to Unpacked, [first name]" using Google OAuth display name
- Normal search form + 6 hardcoded example prompt cards in a 2×2 grid (single column on mobile)
- Example prompts span 6 categories: Tech, Finance, Health, Travel, Home, News
- Clicking a card starts generation immediately and navigates to the article page
- "You have 3 free articles this month" shown below the cards
- Detection via `/api/profile/article-count` endpoint (checks user's total article count)
- Once user generates their first article, standard homepage hero shows forever
- Everything below the hero (Featured, Trending, Popular, Recent) is unchanged

---

## Category Pages (built — 12 categories)

- Dynamic route: `app/category/[slug]/page.tsx` with server-rendered pages
- 12 categories: tech, finance, health, travel, home, entertainment, science, business, automotive, culture, news, ai
- Category config: `lib/category-config.ts` with unique editorial descriptions per category
- Each page has: hero with name + description, article count, article grid (3 per row), sort dropdown (recent/popular/verified), pagination (12 per page)
- Empty state with link to homepage when category has zero articles
- SEO: `generateMetadata()` with title, description, OG tags, canonical URL
- All 12 category URLs added to `app/sitemap.ts`
- Navigation: "Explore" dropdown in Navbar shows all 12 categories, "View all →" link in homepage Recent Articles when a category filter is active, article page category label links to category page

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
5. Explore by Topic: 12 category chips with warm grey fill (`#EDECEA`), 8px radius (not fully rounded), amber hover (`#BA7517`), links to `/category/[slug]`
6. Recent Articles: 3 per row with category filter pills + "View all →" link
7. Footer

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
- **Expandable fact-check panel** — click "Triple-Verified · N claims" badge to see per-claim breakdown with verdict icons (green/amber/red), agreement status (Unanimous/Majority/Disputed), corrections inline. Summary stats at top. No model names exposed. Non-expandable when no audit data.
- Verified badge (green shield, "Verified" label) — now clickable with chevron when claims data exists
- Internal linking (client-side injection, zero DB writes, cached 1 hour)
- Product cards, comparison tables, calculators, charts (Recharts), verdict box
- PDF export (jspdf)
- Reddit community section (real threads from Brave)
- Refine/fork system (child article, lineage via parent/root IDs). **Image upload in refine**: paperclip icon in textarea footer, uploads to Supabase Storage (`refine-images/`), thumbnail preview with remove, 5MB limit, image URL passed to refine model for placement in article JSON.
- Navbar with search autocomplete (top 5 by view_count, published articles only)
- **Author block** — 40px avatar, 15px font-medium name, bio line. Social icons (X, LinkedIn, Medium) right-aligned at 18px with hover states. Flexbox justify-between layout.
- **Cost + generation time** — admin-only display showing "4¢ · 47s" from `generation_options.timings` breakdowns
- **Editor tab (EditorCoPilot)** — research findings, entity cards, synthesis, blueprint, live data. Finding selection with checkboxes, "Include selected" action bar (Add/Replace/Automatic modes), source links on findings. Animated badge showing unused findings count.
- **SharePanel** — 4-tab slide-out (Twitter thread, LinkedIn, Reddit, Image Cards) with copy buttons, character counts, subreddit submit links. Owner-only, lazy-loaded.
- **Social links** — `twitter_url`, `linkedin_url`, `medium_url` on profiles table. Settings page, API, creator profile, article author block all wired.

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
| `/pricing` | `app/pricing/page.tsx` | Pricing page, 3 tiers |
| `/founding-creators` | `app/founding-creators/page.tsx` | Founding Creators application |
| `/category/[slug]` | `app/category/[slug]/page.tsx` | Category pages, 12 categories |

---

## API Routes (39 confirmed)

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

## Tier System (built — waitlist mode, Stripe not yet connected)

- Three tiers: Free ($0, 3 articles/month), Standard ($12, 15/month), Pro ($29, 60/month)
- `profiles` table: `tier`, `monthly_article_limit`, `articles_used_this_month`, `month_reset_date`, `bonus_credits`, `is_founding_creator`, `tier_updated_at`
- `upgrade_waitlist` table for paid tier interest tracking
- Tier enforcement in `app/api/articles/create/route.ts` — checks allowance after rate limit, auto-resets monthly, admin bypasses all limits
- Bonus credits consumed after tier allowance exhausted
- Pricing page at `/pricing` — three-column layout, "Most popular" badge on Standard, waitlist CTA for paid tiers
- Waitlist API at `app/api/waitlist/route.ts`
- Usage API at `app/api/profile/usage/route.ts`
- Usage indicator on homepage hero: "2 of 3 articles remaining" (amber at 0)
- Limit reached modal with upgrade/share options
- Usage section on dashboard with progress bar, tier display, reset date
- Pricing link in navbar and footer

---

## Share Credits System (built)

- Earn 1 bonus credit per platform per article when sharing (max 4 per article: Twitter, LinkedIn, Reddit, Facebook)
- `share_credits_log` table with unique constraint on `(user_id, article_id, platform)`
- API: `app/api/articles/[id]/share-credit/route.ts` — POST to earn credit, GET to check earned platforms
- SharePanel updated with share credit tracking, toast notifications on credit earned
- Credits added to `profiles.bonus_credits` on earn
- Bonus credits consumed after tier allowance exhausted
- Dashboard shows share credit count and explanation
- Limit reached modal includes "Share to earn credits" option

---

## Founding Creators Programme (built)

- 100 founding creator spots, manual admin approval
- `founding_applications` table: user_id, status (pending/approved/rejected), application_text, reviewed_at, reviewed_by
- Application page at `/founding-creators` — pitch page with live counter, application form, status display
- API: `app/api/founding/route.ts` — GET status + approved count, POST application
- Admin API: `app/api/founding/admin/route.ts` — GET all applications, POST approve/reject
- Admin tab: `components/AdminFounders.tsx` — application table with filter tabs (pending/approved/rejected/all), approve/reject buttons
- On approval: `profiles.is_founding_creator = true`, `profiles.bonus_credits += 10`
- Monthly bonus reset: founding creators get +10 bonus credits on monthly reset (in `app/api/articles/create/route.ts`)
- Founding badge: amber "Founding Creator" badge shown on article author block and dashboard
- `is_founding_creator` boolean on profiles table

---

## Known Bugs (verified)

1. ~~**Big statements and pull quotes visually identical**~~ — **FIXED April 2026.** Pull quotes now use left-border italic style; big statements keep amber card + quote SVG.
2. ~~**Polymarket uses old Haiku model**~~ — **FIXED April 2026.** Updated to `claude-haiku-4-5-20251001`.
3. ~~**Editorial pass score threshold mismatch**~~ — **FIXED April 2026.** Code threshold aligned to ≤80, matching the prompt.
4. **In-memory state in serverless** — Gemini concurrency limiter, duplicate call guard, Yahoo Finance cache all in-memory. Work per-instance but don't coordinate across instances.

---

## Confirmed NOT Built

Verified absent from codebase as of April 2026:

- **Stripe / payment processing** — tier infrastructure built, but no Stripe checkout/webhooks/billing. Paid tiers are waitlist-only.
- **Stripe / payment processing** — tier infrastructure built, but no Stripe checkout/webhooks/billing. Paid tiers are waitlist-only.
- **Affiliate infrastructure** — no `affiliate_url` field, no link routing, no revenue tracking
- ~~**Category pages**~~ — **BUILT April 2026.** 12 category pages at `/category/[slug]` with SEO, pagination, sort.
- **Creator analytics dashboard** — not built (basic dashboard exists but no per-article analytics)
- **Referral system** — not built
- **Email capture / weekly digest** — not built
- **Trending questions dashboard** — not built (live data sources exist but no `/trending` page)
- **Vision-based image selection** — not built (filtering is rule-based, no GPT-4o-mini vision)
- **Canonical topic system** — not built
- ~~**Creator status / badges**~~ — Founding Creator badge built (amber badge on author block + dashboard). Topic ownership badges not yet built.
- **Views-for-premium mechanic** — not built
- **Screenshot-proof branding** — not built
- ~~**Onboarding flow**~~ — **BUILT April 2026.** First-time user hero with example prompt cards, disappears after first article.
