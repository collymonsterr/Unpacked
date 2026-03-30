# CLAUDE.md — Unpacked (unpacked.fyi)

Read this before doing anything. Technical facts only — for current feature state see BUILD.md, for roadmap see PLAN.md.

---

## What This Project Is

A web platform where users type any question and receive a complete, visual, opinionated article in 2–3 minutes. Every article picks a winner. After generation, a second AI independently fact-checks every price and claim. Users put their name on articles and will eventually earn affiliate revenue from product recommendations.

**URL:** https://unpacked.fyi | **Repo:** GitHub → Vercel auto-deploy | **Name:** Unpacked (unpacked.fyi)

---

## The Founder

Solo non-developer using Claude Code as primary dev tool. All prompts must be explicit: exact UI elements, exact behaviour, exact colours and sizes, fallback logic. Vague prompts lead to broken implementations.

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

## Tech Stack

- **Framework:** Next.js (App Router), Vercel Pro
- **Database:** Supabase (PostgreSQL) — https://obyywahmmkrpsimjbdua.supabase.co
- **Auth:** Google OAuth via Supabase Auth (no email/password)
- **Storage:** Supabase Storage (bucket: article-images)
- **CSS:** Tailwind CSS | **Charts:** Recharts

---

## AI Pipeline

### Default (most articles)
1. **Planning:** Claude Haiku — classifies type, decides structure, produces `forbidden_components`
2. **Research:** Brave Search API — 4–10 searches, condensed summary (~3,000–4,000 tokens) → `lib/brave-research.ts`
3. **Writing:** Gemini 2.5 Flash — full article JSON → `lib/gemini-writer.ts`
4. **Cost:** ~$0.02–0.03/article

### Premium / deep dive
- Same planning + Brave research; writing uses Claude Sonnet (~$0.08–0.12/article)
- Sonnet does NOT use web search — research comes from Brave only
- Automatic fallback if Gemini fails (JSON validation, 2 retries before fallback)

### Fact-checking (all articles, async)
- Gemini 2.5 Flash with Google Search grounding
- Runs asynchronously after article delivered; independently verifies prices, specs, claims
- Deliberate different model from writer — prevents self-reinforcing errors
- API key: GOOGLE_GEMINI_API_KEY

### Hero images
- Primary: Brave image search for real editorial photos (2×2 picker)
- Owner can upload custom hero image
- Haiku-powered query generation via `hero_image_subject` in plan

---

## Article Classification (7 types)

Comparison, Explainer, Buyer Guide, Decision Guide, Tutorial, News, Trend Analysis

Each type has Required/Allowed/Forbidden component rules. The `forbidden_components` field in the plan JSON is passed to the writing prompt as a HARD CONSTRAINT. Visuals are conditional by type.

---

## Database — Key Columns on Articles Table

- `visibility` — private / unlisted / published (default: unlisted for anon, private for logged-in, published for admin)
- `is_featured`, `featured_position` — Featured section control (no separate is_hero column)
- `card_summary` — punchy one-liner for hero card, editable in admin
- `is_trending`, `trending_set_at` — Trending Today section (manual admin toggle)
- `view_count` — Most Popular section
- `hidden_from_homepage` — hides from homepage grid; article still accessible via URL
- `sort_order` — manual admin reorder
- `generation_options` JSONB — length, tone, visual density settings
- `forbidden_components` — in plan JSON, passed to writing prompt
- `fact_check` JSONB, `verified_at` — fact-check results
- `parent_article_id`, `root_article_id` — refine/fork lineage
- `user_id`, `user_name`, `user_avatar` — creator attribution

---

## localStorage Keys

- `pendingArticleId` — article being generated; recovery on refresh/tab switch
- `hasVisitedFeatured` — hero card rotation (first visit vs return)
- `featuredHeroId` — last featured article shown as hero, excluded from next selection
- `recentArticles` — up to 10 recently visited articles
- `unpacked_votes_[articleId]` — vote state per article
- `unpacked_session_id` — anonymous session for voting

---

## Key Files and Components

- `components/SearchForm.tsx` — homepage search/generate form
- `app/article/[slug]/ArticlePageClient.tsx` — article page, rendering, polling, completion detection
- `components/ArticleGenerating.tsx` — loading messages and progress display
- `components/ArticleOptions.tsx` — generation options: length, tone (opinionated/balanced/casual), visual density
- `components/ui/ArticleVoting.tsx` — voting (helpful/not_helpful + convinced/not_convinced)
- `lib/brave-research.ts` — Brave Search pre-research pipeline
- `lib/gemini-writer.ts` — Gemini Flash article generation + `refineWithGemini()`
- `lib/claude.ts` — Haiku planning + Sonnet premium/fallback + `refineArticle()`
- `lib/structured-data.ts` — JSON-LD: Article, Person, ClaimReview, Review, BreadcrumbList

---

## Homepage Structure

1. **Featured** — 1 hero card left (2fr) + 2×2 small cards right (3fr), 540px height
2. **Trending Today** — exactly 3 dark-style cards (manual admin toggle)
3. **Most Popular** — top 4 by `view_count` with rank badges
4. **Recent Articles** — 3 per row with category filter pills

---

## Admin System

Admin = authenticated user email matches `NEXT_PUBLIC_ADMIN_EMAIL`.

Per-article controls: Featured toggle, Trending toggle, Hero pin (one at a time), Hide, Delete, Drag-to-reorder, Category change, Regenerate, Hero image refresh, `card_summary` edit, Backfill.

**Permission model:**
- Admin only: delete, pin, visibility, update-type, reorder, regenerate, featured/trending toggles
- Owner or admin: replace-thumbnail, replace-image, set-primary-image, regenerate-images
- Authenticated: refine (creates a fork)
- Public: view, record view, feedback, fact-check, export

---

## Rate Limiting

- Create: 10/hour per user ID or IP | Refine: 20/hour
- Stored in Supabase `rate_limits` table (not in-memory — serverless safe)

---

## Cost Controls

- `api_usage_log` table logs every API call with token counts
- Duplicate call guard: same article ID + call type blocked within 5 minutes
- Query caching: checks for similar existing articles before generating
- Concurrency limiter: GEMINI_MAX_CONCURRENT=3

---

## Design System

- **Background:** warm cream/off-white (#FAFAF8)
- **Primary accent:** orange/amber (#BA7517 amber, #993C1D category text)
- **Feel:** Wirecutter meets The Verge — editorial, warm, opinionated
- **Verdict box:** trophy SVG in amber, grey background (#f0efed), italic serif text
- **Verified badge:** green shield. Label: "Verified" — NOT "Fact-checked"

---

## Environment Variables

```
ANTHROPIC_API_KEY              # Haiku planning + Sonnet premium/fallback
GOOGLE_GEMINI_API_KEY          # Gemini Flash writing + fact-checking
BRAVE_SEARCH_API_KEY           # Web research + image search (paid plan, $5/1000 queries)
OPENAI_API_KEY                 # GPT Image hero (legacy, phasing out)
NEXT_PUBLIC_SUPABASE_URL       # https://obyywahmmkrpsimjbdua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Public key
SUPABASE_SERVICE_ROLE_KEY      # Server-side only — never in client code
NEXT_PUBLIC_ADMIN_EMAIL        # Admin user's email
GEMINI_MAX_CONCURRENT=3        # Concurrent generation limit
```

---

## Two Audiences

1. **Creators** — generate articles, share them, earn affiliate revenue (eventually)
2. **Organic readers** — arrive via shared links on Reddit, social, etc.

Frame as a publishing platform, not an AI tool.

---

See BUILD.md for current feature state. See PLAN.md for the forward build plan.
