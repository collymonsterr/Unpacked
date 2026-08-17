# CLAUDE.md — Unpacked (unpacked.fyi)

Read this before doing anything. Technical facts only — verified against codebase April 2026.

For current feature state see BUILD.md. For roadmap see PLAN.md.

---

## What This Project Is

A web platform where users type any question and receive a complete, visual, opinionated article in 2–3 minutes. Every article picks a winner. After generation, three AI models independently fact-check every claim. Users put their name on articles and will eventually earn affiliate revenue from product recommendations.

**URL:** https://unpacked.fyi | **Repo:** GitHub → Vercel auto-deploy | **Name:** Unpacked (unpacked.fyi)

---

## Editorial Voice

Every article must have an opinion. Banned phrases: "it depends," "both are excellent," "ultimately," plus 50+ forbidden AI phrases defined in `lib/editorial-rules.ts`. The platform is Wirecutter meets The Verge — editorial, warm, opinionated. Frame as a publishing platform, not an AI tool.

Two audiences: **Creators** (generate articles, share, eventually earn affiliate revenue) and **Organic readers** (arrive via shared links on Reddit, social, etc.).

---

## The Founder

Colin — solo non-developer, Dubai-based, using Claude Code as primary dev tool. All prompts must be explicit: exact UI elements, exact behaviour, exact colours and sizes, fallback logic. Vague prompts lead to broken implementations.

---

## CRITICAL: Development Workflow

**Use investigate-plan-approve-code for any significant change.**

1. **Investigate** — read and show the current relevant code first
2. **Plan** — write out exactly what you intend to change and why
3. **Approve** — wait for founder confirmation before touching anything
4. **Code** — only then implement

Applies to: anything touching the generation flow, homepage layout, article page structure, or any multi-component change. Small cosmetic tweaks (copy, colour, single-component) can go direct.

**Never assume something is implemented without verifying it in the code first.**

---

## Tech Stack (verified)

- **Framework:** Next.js 16.2.0, App Router, Turbopack, React 19.2.4, TypeScript 5.9
- **Hosting:** Vercel Pro, auto-deploy from GitHub
- **Database:** Supabase PostgreSQL — https://obyywahmmkrpsimjbdua.supabase.co
- **Auth:** Google OAuth via Supabase Auth (no email/password)
- **Storage:** Supabase Storage (bucket: article-images)
- **CSS:** Tailwind CSS 4 | **Charts:** Recharts 3.8 | **PDF:** jspdf 4.2
- **Drag-and-drop:** @dnd-kit (admin reorder)
- **AI SDKs:** @anthropic-ai/sdk 0.80, @google/generative-ai, openai

---

## AI Pipeline — 8 Stages

Every article flows through these stages in order. File paths and models verified against code.

**Model IDs live in one place — `lib/models.ts`.** All active inference calls import `MODELS` (`haiku` = `claude-haiku-4-5-20251001`, `sonnet` = `claude-sonnet-5`, `geminiFlash` = `gemini-2.5-flash`, `gptMini` = `gpt-4o-mini` for fact-check only, `gptImage` = `gpt-image-1`). Change a model there and every stage updates at once. (May 2026: Sonnet bumped 4→5; fact-check review Haiku bumped 4.0→4.5; OpenAI removed from image selection.)

### Stage 1: Planning → `lib/claude.ts` → `planArticle()`
- **Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Classifies article type (14 types), decides structure, produces `forbidden_components`
- Generates research manifest: `brave_queries`, `reddit_queries`, `live_data_queries`
- Generates `hero_image_subject` for image search
- Opinion elements: controversial_take, misunderstanding, prediction, winner_and_loser
- 400+ line system prompt with all type definitions and rules

### Stage 2: Research → `lib/research-orchestrator.ts` → `executeResearch()`
- Runs in parallel: Brave web search + Reddit search + Twitter/X search + live data queries
- **Brave:** `lib/brave-research.ts` — 4–10 searches, `sanitizeSnippet()` prevents JSON failures, optional per-query `freshness` (pd/pw/pm)
- **Reddit:** `executeRedditQueries()` — Brave site:reddit.com searches (discovery) + **Reddit native comment fetching** (`lib/reddit-comments.ts` → `fetchTopComments()`, public `.json`, no key) for the top ~6 threads. Haiku (`summariseRedditFindings()`) then SELECTS the single best real comment per thread by index (rejects sarcasm/jokes/questions/off-topic), and that verbatim comment becomes the card quote (`snippet`) with a `comment_url` permalink. Falls back to the Brave fragment per-thread if comments don't load. On by default; disable with `REDDIT_NATIVE_API=off`.
- **Twitter/X:** `executeTwitterQueries()` — via Brave site:x.com searches; filters by canonical `x.com/{handle}/status/{id}` URL pattern, snippet ≥50 chars, max 8 findings; stored as `twitter_findings` (top-level JSONB column). Haiku sentiment paragraph stored as `twitter_summary` (TEXT column). NO Twitter SDK, NO API key required.
- **Live data:** `executeLiveDataQueries()` — Polymarket + Yahoo Finance + Google Trends (all parallel)
- Entity card extraction from research findings
- **Synthesis:** Haiku call (`buildSynthesis()`) — runs in parallel with `summariseTwitterFindings()` (also Haiku)

### Stage 3: Blueprint → `lib/blueprint.ts` → `generateBlueprint()`
- **Model:** Gemini 2.5 Flash (temp 0.2, thinkingBudget: 0)
- Produces: thesis, winner, section skeleton, evidence requirements, word budgets
- Big statement placement rules (3–5, never consecutive)
- Visual density rules, chart data integrity rules
- Fallback: `buildFallbackBlueprint()` if Gemini fails

### Stage 4: Writing → `lib/gemini-writer.ts` → `writeWithGemini()`
- **Default model:** Gemini 2.5 Flash (temp 0.3, maxOutputTokens: 65536)
- **Premium/fallback:** Claude Sonnet (`MODELS.sonnet` = `claude-sonnet-5`) via `lib/claude.ts` → `writeWithSonnet()`
- 3 retries with JSON validation before Sonnet fallback
- `validateArticleSchema()` checks structure
- `formatLiveDataForPrompt()` injects live data
- Concurrency limiter: `GEMINI_MAX_CONCURRENT=3` (in-memory — serverless caveat)
- **Cost:** ~$0.02–0.03 default, ~$0.08–0.12 Sonnet

### Stage 5: Editorial Pass → `lib/editorial-pass.ts` → `runEditorialPass()`
- **Primary:** Claude Sonnet (`MODELS.sonnet` = `claude-sonnet-5`)
- **Fallback:** Gemini Flash
- 15 editorial checks, rewrites weak sections via `applyEditorRewrites()`
- Rewrite threshold: prompt says ≤80, code applies at ≤80 (aligned April 2026)
- If both models fail, returns score 85 (never blocks pipeline)
- Rules: `lib/editorial-rules.ts` — `FORBIDDEN_PHRASES` (50+), `FILLER_PATTERNS` (20), `TONE_DESCRIPTIONS` (10 codes)

### Stage 6: Images → `lib/images.ts` + `lib/image-router.ts`
- `routeImageRequest()` returns ordered source list per image type
- Hero editorial: Pexels → Unsplash → Brave
- News/products: Brave only
- `generateHeroQuery()` — Haiku-powered smart query
- `resolveHeroCandidates()` — tries sources in priority order
- `enrichArticleWithImages()` — product images + editorial sections
- Filtering: REJECTED_PATTERNS, SMALL_IMAGE_PATTERNS, TEXT_IMAGE_PATTERNS, PREFERRED_HOSTNAMES
- Pexels integration: `lib/pexels.ts` (requires `PEXELS_API_KEY`, graceful fallback if missing)

### Stage 7: Fact-Check → `lib/fact-check.ts` → `runTripleFactCheck()`
- **Stage 1:** Gemini + Google Search grounding + claim extraction (`stage1GeminiVerification()`, thinkingBudget: 0)
- **Stage 2:** Haiku credibility review (`stage2HaikuReview()` — uses `MODELS.haiku` = `claude-haiku-4-5-20251001`)
- **Stage 3:** GPT-4o-mini arbitration (`stage3Arbitration()` — conditional, only when stages disagree)
- `applyCorrections()` modifies article, `buildAudit()` creates trail, `determineFinalVerdict()` for consensus
- Runs async after article delivered

### Stage 8: Social Content → `lib/social-content.ts` → `generateSocialContent()`
- **Model:** Gemini Flash (~$0.001/article)
- Generates: X thread, LinkedIn post, Reddit summary, image cards
- `saveSocialContent()` saves to DB
- Runs async after article delivered

### Pipeline Orchestration → `lib/write-pipeline.ts` → `runWritePipeline()`
- Phase 1: Blueprint
- Phase 2: Write + hero image (parallel)
- Phase 3: Editorial pass + product images (parallel)
- Phase 4: Fact-check + social content (async, after delivery)
- Timing data persisted to `generation_options.timings`

---

## Article Classification — 14 Types (verified)

Defined in `lib/article-types.ts`:

buyer_guide, comparison, explainer, decision_guide, how_to, roundup, ranked_list, myth_buster, timeline_article, visual_list, news_analysis, trend_analysis, breaking_news, deep_dive

Each type has: requiredComponents, allowedComponents, forbiddenComponents, lengthRange, tone, verdictRequired, verdictStyle. Helpers: `getArticleTypeLabel()`, `isComponentAllowed()`, `getForbiddenComponents()`.

---

## 12 Categories (verified as top-level DB column)

Tech, Finance, Health, Travel, Home, Entertainment, Science, Business, Automotive, Culture, News, AI

---

## Live Data Sources (all built)

| Source | File | Requires | Notes |
|--------|------|----------|-------|
| Polymarket | `lib/data-sources/polymarket.ts` | Free API | 3-stage: fetch → blocklist → Haiku LLM selection. Uses `claude-haiku-4-5-20251001`. |
| Yahoo Finance | `lib/data-sources/yahoo-finance.ts` | Free API | 5-symbol limit, sparklines from 1-month daily close. In-memory 5-min cache |
| Google Trends | `lib/data-sources/google-trends.ts` | `SERPAPI_KEY` | 12-month timeline, trend direction: rising/declining/stable/peaking |

---

## Sign-In Gate (built)

- Generation starts for all users, research runs immediately
- Anonymous users see research preview (`components/ResearchPreview.tsx`) while waiting
- Sign-in gate (`components/SignInGate.tsx`) overlays with Google OAuth (redirect-based, NOT popup)
- Article pauses at `awaiting_auth` status until sign-in
- Authenticated users: full pipeline runs
- Generation state preserved via DB (not localStorage)

---

## Known Bugs and Issues

### SERVERLESS: In-memory state won't persist across invocations
- Gemini concurrency limiter in `lib/gemini-writer.ts` — in-memory
- Duplicate call guard in `lib/api-usage.ts` — in-memory (5-min window)
- Yahoo Finance cache in `lib/data-sources/yahoo-finance.ts` — in-memory (5-min)
- These work within a single serverless instance but don't coordinate across instances

### Previously Missing — Now Built
- ~~**Account deletion**~~ — built April 2026 (`POST /api/profile/delete` + settings UI)
- ~~**Sign-in gate terms acceptance**~~ — built April 2026 (terms line below Google sign-in button)

---

## Database — Key Columns on Articles Table

- `visibility` — private / unlisted / published (default: published for logged-in, unlisted for anonymous)
- `status` — generating / awaiting_auth / complete / verified / error
- `article_type` — one of 14 types
- `category` — one of 12 categories (top-level column)
- `is_featured`, `featured_position` — Featured section control
- `card_summary` — punchy one-liner for hero card, editable in admin
- `is_trending`, `trending_set_at` — Trending Today section (manual admin toggle)
- `view_count` — Most Popular section
- `hidden_from_homepage` — hides from homepage grid; article still accessible via URL
- `sort_order` — manual admin reorder
- `generation_options` JSONB — length, tone, visual density, timings
- `forbidden_components` — in plan JSON, passed to writing prompt
- `fact_check` JSONB, `verified_at` — fact-check results
- `parent_article_id`, `root_article_id` — refine/fork lineage
- `user_id`, `user_name`, `user_avatar` — creator attribution
- `research_preview` JSONB — shown during sign-in gate
- `entity_cards` JSONB — structured research entities
- `twitter_findings` JSONB — array of `{ id, author_handle, snippet, url }` from Brave site:x.com searches
- `twitter_summary` TEXT — Haiku-generated paragraph summarising X conversation
- `blueprint` JSONB — section skeleton from blueprint phase
- `social_content` JSONB — generated social posts

---

## localStorage Keys

- `pendingArticleId` — article being generated; recovery on refresh/tab switch
- `hasVisitedFeatured` — hero card rotation (first visit vs return)
- `featuredHeroId` — last featured article shown as hero
- `recentArticles` — up to 10 recently visited articles
- `unpacked_votes_[articleId]` — vote state per article
- `unpacked_session_id` — anonymous session for voting
- `unpacked_visibility_nudge_[articleId]` — one-time visibility pill pulse animation

---

## Key Files (verified to exist)

### Pipeline
- `lib/claude.ts` — Haiku planning + Sonnet premium/fallback + `refineArticle()`
- `lib/research-orchestrator.ts` — parallel research + entity cards + synthesis
- `lib/brave-research.ts` — Brave Search queries + `sanitizeSnippet()`
- `lib/blueprint.ts` — Gemini blueprint generation
- `lib/gemini-writer.ts` — Gemini Flash writing + `refineWithGemini()`
- `lib/editorial-pass.ts` — Sonnet/Gemini editorial scoring and rewriting
- `lib/editorial-rules.ts` — forbidden phrases, filler patterns, tone descriptions
- `lib/write-pipeline.ts` — orchestrates all phases with timing
- `lib/fact-check.ts` — triple fact-check pipeline
- `lib/social-content.ts` — social content generation
- `lib/images.ts` — hero + product image fetching
- `lib/image-router.ts` — source routing by image type
- `lib/pexels.ts` — Pexels API integration
- `lib/article-types.ts` — 14 type definitions with component rules
- `lib/stripe-config.ts` — Stripe instance, price IDs, tier limits
- `lib/url-prefetch.ts` — URL detection, content fetching (tweets/Reddit/articles), context injection

### Live Data
- `lib/data-sources/polymarket.ts` — prediction market odds
- `lib/data-sources/yahoo-finance.ts` — stock quotes + sparklines
- `lib/data-sources/google-trends.ts` — search interest trends

### Pages
- `app/page.tsx` — homepage (server component)
- `app/article/[slug]/page.tsx` — article page (server, JSON-LD injection)
- `app/article/[slug]/ArticlePageClient.tsx` — article rendering + polling
- `app/article/[slug]/edit/page.tsx` — full-document editor (server, owner/admin gate)
- `app/article/[slug]/edit/EditFullClient.tsx` — Google Docs–style editor: write/reorder modes, auto-resize textareas, dnd-kit reorder, Cmd+S save
- `app/admin/page.tsx` — admin dashboard (4 tabs: overview, articles, costs, feedback)
- `app/plan/page.tsx` — plan mode interactive editorial brief
- `app/terms/page.tsx` — Terms of Service (static)
- `app/privacy/page.tsx` — Privacy Policy (static, GDPR-compliant)
- `app/copyright/page.tsx` — Copyright Policy (static)
- `app/pricing/page.tsx` — pricing page (3 tiers, waitlist for paid)
- `app/founding-creators/page.tsx` — Founding Creators application
- `app/category/[slug]/page.tsx` — 12 category pages with SEO

### Components
- `components/SearchForm.tsx` — homepage search/generate form
- `components/ArticleGenerating.tsx` — loading messages and progress
- `components/ArticleOptions.tsx` — generation options: length, tone, visual density
- `components/SignInGate.tsx` — modal overlay with Google OAuth
- `components/ResearchPreview.tsx` — research findings during sign-in
- `components/ui/ArticleVoting.tsx` — voting (helpful/not_helpful + convinced/not_convinced)
- `components/ui/FactCheckBar.tsx` — fact-check bar + expandable claims panel + verified badge
- `components/EditorCoPilot.tsx` — Editor tab: research findings, selection, rewrite controls
- `components/editor/FindingCard.tsx` — individual research finding with source link + checkbox
- `components/SharePanel.tsx` — 4-tab social content panel (Twitter, LinkedIn, Reddit, Image Cards)

### API Routes (59 total)
- `app/api/articles/create/route.ts` — main generation flow
- `app/api/articles/plan-preview/route.ts` — plan mode: planning + research + angle generation
- `app/api/articles/search/route.ts` — navbar autocomplete
- `app/api/articles/[id]/edit-full/route.ts` — patches article JSONB from full-document editor (no AI call); owner/admin gate; whitelisted fields per section type; tags modified sections with `edited: true`
- `app/api/improve-prompt/route.ts` — Haiku-powered query improvement suggestions
- `app/api/cron/daily-article/route.ts` — **Vercel Cron** daily auto-article. Auth: `CRON_SECRET` bearer or admin session. Picks a topical subject (`lib/daily-topic.ts`) → runs the full pipeline → publishes (admin-attributed). 20h double-run guard; `?force=1` for manual admin runs. Schedule in `vercel.json` (`0 6 * * *` = 7am Dublin).

### Other
- `lib/api-usage.ts` — cost logging + duplicate guard
- `lib/structured-data.ts` — JSON-LD: Article, Person, ClaimReview, Review, BreadcrumbList
- `lib/internal-links.ts` — client-side internal link injection

---

## Homepage Structure

1. **PendingArticleRecovery** — recovers in-progress articles
2. **Navbar** (no search on homepage) — menu order: About, Pricing, Creators, Explore
3. **HomepageHero** — headline: "Ask Anything. Get the Best Answer on the Internet." (amber accent), subline about 3-minute articles, search form, example chips
4. **TrustStrip** — 3-column layout: "Real opinions. Clear verdict." (Reddit/X/Expert reviews) | "Triple fact-checked" (Gemini/Claude/Grok) | "Live data. Not training data." (Polymarket/Yahoo Finance/Google Trends)
5. **Featured** — 1 hero card left (2fr) + 2×2 small cards right (3fr), 540px height, pool-based rotation
6. **Trending Today** — exactly 3 dark-style cards (manual admin toggle, pool-based)
7. **Most Popular** — top 4 by `view_count` with rank badges
8. **RecentArticlesGrid** — 3 per row with category filter pills
9. **Footer**

Deduplicates article chains via `root_article_id`.

---

## Admin System

Admin = authenticated user email matches `NEXT_PUBLIC_ADMIN_EMAIL`.

4 tabs: Overview, Articles, Costs, Feedback.

Per-article controls: Featured toggle, Trending toggle, Hero pin (one at a time), Hide, Delete, Drag-to-reorder, Category change, Regenerate, Hero image refresh, `card_summary` edit, Backfill.

**Permission model:**
- Admin only: delete, pin, visibility, update-type, reorder, regenerate, featured/trending toggles
- Owner or admin: replace-thumbnail, replace-image, set-primary-image, regenerate-images
- Authenticated: refine (creates a fork)
- Public: view, record view, feedback, fact-check, export

---

## Design System

- **Background:** warm cream/off-white (#FAFAF8)
- **Primary accent:** orange/amber (#BA7517 amber, #993C1D category text)
- **Feel:** Wirecutter meets The Verge — editorial, warm, opinionated
- **Verdict box:** trophy SVG in amber, grey background (#f0efed), italic serif text
- **Verified badge:** green shield. Label: "Verified" — NOT "Fact-checked"
- **Big statements:** amber `#FAEEDA`, quote SVG, `#633806` text
- **Pull quotes:** left-border italic style (visually distinct from big statements)

---

## Environment Variables

```
ANTHROPIC_API_KEY              # Haiku planning + Sonnet premium/fallback + editorial
GOOGLE_GEMINI_API_KEY          # Gemini Flash writing + blueprint + fact-check + social
BRAVE_SEARCH_API_KEY           # Web research + image search (paid plan)
OPENAI_API_KEY                 # GPT-4o-mini fact-check arbitration
PEXELS_API_KEY                 # Pexels image search (hero editorial)
UNSPLASH_ACCESS_KEY            # Unsplash image search (hero fallback)
SERPAPI_KEY                    # Google Trends data
STRIPE_WEBHOOK_SECRET          # Webhook signing secret (from Stripe Dashboard)
STRIPE_PRICE_STANDARD          # Stripe price ID for Standard tier ($12/month)
STRIPE_PRICE_PRO               # Stripe price ID for Pro tier ($29/month)
NEXT_PUBLIC_SUPABASE_URL       # https://obyywahmmkrpsimjbdua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Public key
SUPABASE_SERVICE_ROLE_KEY      # Server-side only — never in client code
NEXT_PUBLIC_ADMIN_EMAIL        # Admin user's email
NEXT_PUBLIC_ADMIN_USER_ID      # Admin user's Supabase UUID (used in useAdminMode hook)
ADMIN_USER_ID                  # Server-side admin user ID (lib/auth-check.ts)
ADMIN_EMAIL                    # Server-side admin email (lib/auth-check.ts)
GEMINI_MAX_CONCURRENT=3        # Concurrent generation limit (in-memory)
CRON_SECRET                    # Vercel Cron auth — sent as `Authorization: Bearer` to /api/cron/* (set in Vercel)
DAILY_ARTICLE_VISIBILITY       # Optional: 'unlisted' turns the daily auto-article into a review queue (default: published)
REDDIT_NATIVE_API              # Optional: 'off' disables Reddit native comment fetching (default: on)
```

---

## Rate Limiting

- Create: 10/hour per user ID or IP | Refine: 20/hour | Plan preview: 20/hour per user
- Stored in Supabase `rate_limits` table (not in-memory — serverless safe)
- Tier-based article allowance: Free 3/month, Standard 15/month, Pro 60/month (checked in create route, admin bypasses)

---

## Cost Controls

- `api_usage_log` table logs every API call with token counts
- `MODEL_PRICING` in `lib/api-usage.ts` for per-model cost rates
- Duplicate call guard: same article ID + call type blocked within 5 minutes (in-memory)
- Query caching: checks for similar existing articles before generating
- Concurrency limiter: GEMINI_MAX_CONCURRENT=3 (in-memory)
- Fallback monitoring in admin Costs tab: Gemini vs Sonnet split, fallback rate %, amber alert when >5%

---

## Article Creation Flow (verified in `app/api/articles/create/route.ts`)

1. Rate limit check
2. Query cache check (similar existing articles)
3. Auth check (determines visibility default)
4. Background work via `after()`:
   - Plan article (Haiku)
   - Run research (parallel: Brave + Reddit + live data)
   - **If anonymous:** build research preview, pause at `awaiting_auth`
   - **If authenticated:** run full `runWritePipeline()`
5. Auto-cleanup: articles stuck in `generating` >10min → error, `awaiting_auth` >24h → expired
6. Profile preferences merged into generation options (location, currency, language)

---

## Mandatory Process Rules

### 1. Documentation Updates
When any feature ships, update BUILD.md immediately. When the plan changes, update PLAN.md. When a non-trivial decision is made, append it to DECISIONS.md. CLAUDE.md only changes when the tech stack, pipeline, or architecture changes. OVERVIEW.md and STRATEGY.md change only when product positioning or growth strategy shifts.

### 2. Session Start
At the start of every session, read CLAUDE.md, BUILD.md, PLAN.md, OVERVIEW.md, and STRATEGY.md before doing anything. Verify your understanding of the current state matches what's documented.

**The canonical doc set is exactly 7 files in the repo root:** CLAUDE.md, BUILD.md, PLAN.md, DECISIONS.md, OVERVIEW.md, STRATEGY.md, README.md. If you encounter any other markdown file in the root, flag it — it is either drift or a working draft that should be moved to `docs/drafts/` or deleted.

### 3. Autonomous Execution
When the founder gives a clear, detailed brief: execute it fully without stopping to ask questions. When the brief is ambiguous or high-risk: use investigate-plan-approve-code.

### 4. Proactive Engineering
If you see a bug while working on something else, note it. Don't fix it silently (scope creep) but don't ignore it either. Flag it clearly: "Found while working on X: [bug description]. Want me to fix it?"

### 5. Deployment
Never push directly to main without confirmation. Always verify the build succeeds locally before committing. Test API routes with actual data when possible.

### 6. Code Quality
No placeholder implementations. No "TODO: implement later" unless explicitly agreed. No unused imports or dead code. Preserve existing patterns — don't refactor code you weren't asked to touch.

### 7. Page-Specific Fixes — Always Link
Whenever a fix or change targets a specific page (homepage, /about, /how-it-works, /pricing, /article/[slug], /admin, etc.), end the response with a direct live link to that page so the founder can click through and verify immediately. Format: `https://unpacked.fyi/<path>` on its own line at the end of the summary. For multi-page changes, list each affected page. For changes that aren't user-visible (pipeline internals, prompts, types) no link is needed.

---

See BUILD.md for current feature state. See PLAN.md for the forward build plan.
