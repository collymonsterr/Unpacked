# BUILD.md — Unpacked Current Feature State

What exists right now, confirmed by codebase investigation. Update this file whenever a feature ships.

---

## Core Platform (stable since launch)

- Article generation pipeline: Haiku planning → Brave research → Gemini Flash writing → async fact-check
- 7 article types with `forbidden_components` enforcement
- Product cards, comparison tables, calculators, charts, verdict box
- Fact-check bar with corrections display
- Reddit community section (real threads sourced from Brave search)
- Hero image system: 2×2 Brave image picker, owner upload, Haiku-powered query generation
- Article refine/fork system (creates child article, lineage tracked via parent/root IDs)
- SEO: JSON-LD structured data, sitemap, robots.txt, OG tags, canonical URLs
- Internal linking: client-side injection, zero DB writes
- Admin system: three tabs (Overview, Articles, Costs)
- Pool-based homepage rotation: featured and trending use curated pools
- Generation options UI: length (quick/standard/deep), tone (opinionated/balanced/casual), visual density — all wired through to Gemini prompt via `buildSimpleOptionsPrompt()`

---

## Completed in March 2026 Build Session

### Visibility system
- Three-state `visibility` column on articles table: `private` / `unlisted` / `published`
- Default assignment in `app/api/articles/create/route.ts`: anonymous → unlisted, logged-in → private, admin → published
- FirstDraftBanner UI controls for visibility change
- Existing articles migrated

### Voting system
- `ArticleVoting` component replaces `ArticleFeedback` (fully removed from `ArticleView.tsx`)
- Card 1: "Was this article helpful?" — Helpful (amber) / Not helpful (red)
  - Not helpful expands: 6 reason pills + 140-char textarea + Submit button
- Card 2: "Was the verdict convincing?" — only shown when article has a verdict
  - Not convinced expands textarea + Submit button
  - Stats line shown when ≥5 total verdict votes: "X% found the verdict convincing · N votes"
- Vote values: `helpful`/`not_helpful` and `convinced`/`not_convinced`
- localStorage keys: `unpacked_votes_[articleId]` (state) + `unpacked_session_id` (anon session)
- `article_votes` table has `reason` and `comment` columns; vote API saves both

### Generation improvements
- Stuck-generation auto-expire: on each new create request, articles stuck in `generating` for >10 minutes are set to `error`
- Error state copy: "Something went wrong generating this article" with "Ask a new question →" CTA

### Gemini improvements
- `sanitizeSnippet()` in `lib/brave-research.ts`: replaces `"` with `'` and `\` with `/` at 5 call sites — fixes JSON parse failure from unescaped research content
- `maxOutputTokens: 65536` in `lib/gemini-writer.ts` (both `writeWithGemini` and `refineWithGemini`)
- `refineWithGemini()` exported from `lib/gemini-writer.ts`; `refineArticle()` in `lib/claude.ts` tries Gemini first, falls back to Sonnet
- Fallback monitoring in admin Costs tab: Gemini vs Sonnet split, fallback rate %, estimated extra cost, amber alert when rate >5%

### Structured data
- `lib/structured-data.ts`: Person schema on Article (author name), ClaimReview per fact-check correction, Review schema from verdict
- `app/article/[slug]/page.tsx` conditionally injects ClaimReview and Review scripts

### Pages confirmed built
- `/updates` — `app/updates/page.tsx`
- `/how-it-works` — `app/how-it-works/page.tsx`

### Other
- About page rebuilt: 8 sections, typewriter hero, AI language removed
- Admin Articles tab: 5 filter tabs, star/flame/eye toggles

---

## Confirmed Gaps (Not Yet Built)

Verified absent from codebase:

- **Author block prominence** — avatar is `w-5 h-5` (20px), name `text-sm` / `var(--text-secondary)`. Too small and muted. Needs: 40px avatar, prominent name, bio line below.
- **Social links on profiles** — no `twitter_url` or `linkedin_url` in profiles table or API. Profile returns: display_name, bio, website, location, currency, language only.
- **Sign-in gate** — no auth required before generation. Anonymous users get `visibility: 'unlisted'` and proceed unblocked.
- **Stripe** — zero files. No subscription tiers, no payment processing.
- **Affiliate infrastructure** — no `affiliate_url` field, no link routing, no revenue tracking.
- **Category pages** — no `/category/[slug]` routes.
- **One-click social repurposing** — not built.
- **Research Companion tab** — not built; `research_findings` field does not exist on articles table (research is discarded after writing).
- **Creator analytics dashboard** — not built.
- **Referral system** — not built.
- **Trending questions dashboard** — not built.
- **Email capture / weekly digest** — not built.
- **Profile photo upload** — Google avatar only; Supabase Storage upload not wired to profiles.

---

## What Previous CLAUDE.md Got Wrong

Items CLAUDE.md listed as "Stage 3 — not yet built" that are actually fully built:
- **Visibility system** (private/unlisted/published) — BUILT and wired
- **`refineWithGemini`** in `lib/gemini-writer.ts` — BUILT
- **Fallback rate monitoring** in admin Costs tab — BUILT
- **`sanitizeSnippet()` JSON fix** — BUILT
- **`/updates` changelog page** — BUILT (CLAUDE.md listed as ⬜ pending)
