# BUILD.md — Unpacked Current Feature State

What exists right now, confirmed by full codebase audit September 2026. Update this file whenever a feature ships.

---

## AI Pipeline (fully built, 8 stages)

| Stage | What | Model | File |
|-------|------|-------|------|
| 1. Planning | Type classification, structure, research manifest, forbidden_components | Claude Haiku 4.5 | `lib/claude.ts` |
| 2. Research | Brave + Reddit (native comments) + Twitter/X + live data (parallel), entity cards, Haiku synthesis, Haiku Twitter sentiment, Haiku Reddit comment selection | Brave API + Reddit `.json` + Haiku | `lib/research-orchestrator.ts`, `lib/reddit-comments.ts` |
| 3. Blueprint | Thesis, winner, section skeleton, word budgets, big statement placement | Gemini 2.5 Flash | `lib/blueprint.ts` |
| 4. Writing | Full article JSON with validation + retry + fallback | Gemini Flash (default), Sonnet (premium/fallback) | `lib/gemini-writer.ts`, `lib/claude.ts` |
| 5. Editorial | 15-check scoring, section rewrites | Sonnet (primary), Gemini (fallback) | `lib/editorial-pass.ts` |
| 6. Images | Google Images first → vision-pick best → rehost to Supabase (stock = fallback) | Haiku (query gen + vision selection) | `lib/images.ts`, `lib/image-router.ts`, `lib/google-images.ts`, `lib/image-selector.ts`, `lib/image-storage.ts`, `lib/pexels.ts` |
| 7. Fact-check | Triple: Gemini+Google Search, Haiku credibility, GPT-4o-mini arbitration | 3 models | `lib/fact-check.ts` |
| 8. Social | X thread, LinkedIn post, Reddit summary, image cards | Gemini Flash | `lib/social-content.ts` |

Pipeline orchestrated by `lib/write-pipeline.ts` with parallel phases and timing data.

**Model IDs are centralized in `lib/models.ts`** (May 2026). Every active inference call imports `MODELS` — one edit re-points the whole pipeline. Same pass: Sonnet 4→**5** (editorial, premium/deep write, refine, interactive components), fact-check review Haiku 4.0→**4.5** (was the one stale model), and **OpenAI dropped from image selection** (Haiku 4.5 vision → `candidates[0]`; OpenAI kept only for fact-check arbitration). Sonnet-5 price in the cost tables is a placeholder = Sonnet 4 — verify. Deferred (Tier 2/3): conditional editorial pass, batched section-image vision, and collapsing the blueprint/editorial scaffolding — pending editorial-rewrite-rate data.

---

## Article Types (14, verified in `lib/article-types.ts`)

buyer_guide, comparison, explainer, decision_guide, how_to, roundup, ranked_list, myth_buster, timeline_article, visual_list, news_analysis, trend_analysis, breaking_news, deep_dive

Each has required/allowed/forbidden components, length range, tone, verdict rules.

### New types (April 2026)
- **ranked_list**: Numbered ranking from worst to best. Each item gets a rank number, name, and evidence. Picks a clear #1. Uses `ranked_item` section type with items array. Rendering: large amber rank number (36px) left, content right. Component: `RankedItemSection.tsx`.
- **myth_buster**: Myth/reality pairs with evidence-based debunking. Uses `myth_reality` section type with pairs array. Rendering: red "MYTH" block + green "REALITY" block per pair. Component: `MythRealitySection.tsx`.
- **timeline_article**: Chronological narrative with dates. Uses existing `timeline` section type. Narrative structure with cause-and-effect. Named `timeline_article` (not `timeline`) to avoid collision with the timeline component name.
- **visual_list**: Image-first editorial list. Each item leads with an `image_section` followed by `content_section` narrative. High image density. Only used when stock photos are likely available. Analytical sections (Key Takeaways, Watch Out For) suppressed via empty executive_summary arrays in writing + blueprint prompts. Duplicate heading safety net in ContentSection.tsx strips first line of body text if it matches the section heading.

---

## Categories (12, top-level DB column)

Tech, Finance, Health, Travel, Home, Entertainment, Science, Business, Automotive, Culture, News, AI

### Category Classification (built April 2026)
- **Reclassification tool**: Admin dashboard button triggers Haiku-based reclassification of all published articles (`/api/admin/reclassify-categories`). Uses title + first 200 words of content. Streams progress via SSE. Safe to re-run anytime.
- **Active category threshold**: Homepage "Explore by Topic" pills and Navbar "Explore" dropdown only show categories with >= 5 published articles. Powered by `/api/categories/active` (1-hour cache). Falls back to all 12 categories if API fails.
- **Category pages always work**: All 12 `/category/[slug]` pages remain accessible regardless of article count. Only navigation visibility is gated.
- **Current distribution (April 2026)**: Finance 43, Tech 33, AI 25, Automotive 15, News 13, Business 12, Home 8, Travel 8, Health 7 (visible) | Entertainment 3, Science 1, Culture 1 (hidden from nav)

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

## URL Pre-Fetch Layer (built April 2026)

- Users can paste tweet, Reddit, or article URLs directly into the search box
- **URL detection**: `detectUrls()` in `lib/url-prefetch.ts` classifies URLs as tweet, reddit, or article
- **Tweet fetching**: Twitter oEmbed API (free, no auth) → falls back to Brave Search if oEmbed fails. Returns full tweet text.
- **Reddit fetching**: `.json` endpoint on Reddit post URL → falls back to Brave. Returns title, selftext, author, score, comments.
- **Article fetching**: Brave Search for the URL → returns snippet/description
- **Context injection**: `buildPrefetchContext()` prepends the fetched content to the planning prompt so the planner sees the actual source material
- **Source metadata**: Stored in `generation_options.source_tweet` / `.source_reddit` / `.source_article` on the article record (for future "Inspired by @handle" display)
- **SearchForm indicator**: 12px muted text below search box when URL detected: "Tweet detected — we'll extract the content and build an article from it" (or Reddit/Article variant)
- Wired into both `plan-preview` and `create` routes (Phase 0, before planning)
- No new API keys required — uses existing Brave Search + free Twitter oEmbed

---

## Planning Refusal Handling (built April 2026)

- **Query sanitisation (Layer 1)** — `sanitizeQueryForPlanning()` in `lib/claude.ts` strips idiomatic phrases that trigger false-positive safety refusals: "before you die" → "in your lifetime", "killer deals" → "amazing deals", "drop dead gorgeous" → "stunning", "destroyed Blockbuster" → "disrupted Blockbuster", etc. 11 rules. Original query preserved for display — only the planning API call gets the sanitised version.
- **3-attempt retry (Layer 2)** — Attempt 1: sanitised query. Attempt 2: sanitised query + strong anti-refusal framing with auto-detected topic domain. Attempt 3: LLM-rephrased query via `rephraseQueryForPlanning()` (Haiku call to neutralise phrasing). All 3 must fail before showing an error.
- **JSON-first detection** — tries to parse valid JSON from Haiku's response before checking for refusal phrases. If the model wraps a disclaimer around valid JSON, uses the JSON instead of erroring.
- **Refusal logging (Layer 4)** — all refused queries logged to `api_usage_log` with `call_type: 'plan_refused'` and the refusal text in `error_message`. Rephrase calls logged as `plan_rephrase`. Visible in admin Costs tab.
- **Smart error messaging (Layer 3)** — when all 3 attempts fail, error includes a clickable suggestion generated by Haiku (the rephrased query). Plan page shows amber "Try instead: ..." button that pre-fills the search. Falls back to generic message if suggestion generation also fails.

---

## Sign-In Gate (built)

- Generation starts for all users immediately
- Anonymous users see research preview while waiting (`components/ResearchPreview.tsx`)
- Sign-in overlay with Google OAuth — redirect-based (not popup)
- Article pauses at `awaiting_auth` until sign-in
- State preserved via DB, not localStorage
- Auto-expires `awaiting_auth` articles after 24 hours

---

## Visibility System (built, updated April 2026)

- Three-state: `private` / `unlisted` / `published`
- **Defaults: anonymous → unlisted, logged-in → published** (changed from private April 2026)
- ~~FirstDraftBanner~~ — replaced by EditorBar (April 2026). File `components/FirstDraftBanner.tsx` still exists but is no longer rendered.
- **Inline visibility dropdown** on article metadata row (owner-only). Shows current state as a coloured pill (green Published / amber Unlisted / grey Private) with dropdown to change. Replaces the old Publish/Share flow as the primary visibility control.
- **One-time pulse animation** on the visibility pill for return visits — amber glow that plays once per article to draw attention, tracked via `unpacked_visibility_nudge_[articleId]` in localStorage. Does not fire during initial generation.

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
- `lib/editorial-pass.ts`: Sonnet primary, Gemini fallback, 16 checks, section-level rewrites
- Applied automatically in pipeline after writing phase
- **No verdict in title rule (April 2026)**: Enforced at 4 layers — writing prompt (gemini-writer.ts), blueprint prompt (blueprint.ts), plan-mode headline generation (plan-preview route), and editorial pass check #16 (flags + rewrites titles that reveal the winner). Titles must create curiosity, not satisfy it.
- **Executive summary restrictions (April 2026)**: Key Takeaways + Watch Out For only on buyer_guide, decision_guide, how_to. Key Takeaways only (no Watch Out For) on comparison, explainer, deep_dive. Neither on ranked_list, myth_buster, timeline_article, visual_list, news_analysis, trend_analysis, breaking_news, roundup. Enforced in writing prompt, blueprint prompt, `forbiddenComponents` in article-types.ts, AND hard-code post-write sanitisation in `write-pipeline.ts` → `sanitiseArticleForType()` (strips executive_summary arrays and forbidden sections by heading pattern).
- **Fact-check correction sanitisation (April 2026)**: `applyCorrections()` in `lib/fact-check.ts` now sanitises correction text to strip instructional prefixes ("Update the claim to...", "Clarify that...") before replacing original claims. Prompt also updated to instruct the model to output corrected prose directly.
- **Image caption deduplication (April 2026)**: `ImageSection.tsx` hides captions that are generic image descriptions (starting with "A ", "The ", etc., under 120 chars) since they duplicate the alt text. Captions with editorial context (source attribution, dates, locations) still display. Writing prompt updated to require distinct alt_text vs caption.
- **Structural editorial fixes (April 2026)** — four simultaneous fixes to remove redundancy and improve narrative shape across all article types:
  1. **Suppress Quick Verdict prose for knowledge/news types**: `executive_summary.short_answer` cleared for explainer, deep_dive, myth_buster, timeline_article, news_analysis, trend_analysis, visual_list — the amber verdict box already states the thesis. Writer prompt updated to leave it empty for these types; `sanitiseArticleForType()` enforces via `SUPPRESS_SHORT_ANSWER_TYPES` set. `ExecutiveSummary.tsx` renders null when all fields are empty.
  2. **Mandatory closing editorial section**: Every article now ends with exactly one closing section before further_reading/sources. Heading varies by type — "Bottom Line" (product types, 80-120 words, decisive reinforcement), "Why This Matters"/"The Bigger Picture" (knowledge types, 140-180 words, forward-looking opinion), "What to Watch" (news types, 100-140 words, committed forecast), "Final Tips" (how_to), or 2-3 sentences (visual_list). Enforced in both writer prompt and blueprint prompt (rule 11).
  3. **Stat card / prose duplication rule**: Writer prompt explicitly forbids stat cards that repeat numbers already stated in the preceding prose. Cards must complement prose with different data. Blueprint prompt (rule 12) enforces the same at planning time — section key_points cannot include the same figures as the stat_cards component.
  4. **Narrative structure for explainer & deep_dive**: Writer tone guidance updated so explainer and deep_dive follow a 5-step narrative: common belief → contradicting case → turning point → mechanism → closing editorial. Blueprint prompt (rule 13) plans section order to build this tension. Product types, news types, how_to, and ranked_list explicitly excluded from this structure.
- **Video Embed Support (May 2026)** — Phase 2D1+2D2 shipped together:
  - New `video_embed` section type. Component `components/sections/VideoEmbed.tsx` renders responsive 16:9 iframe with click-to-play thumbnail (lazy load — keeps articles with 10+ videos lightweight). Supports YouTube (watch/youtu.be/embed/shorts) and Vimeo URLs. Provider badge, optional caption + context line.
  - New `video_queries` field on planner output. Haiku only emits for intrinsically video-based topics (best DJ sets, best speeches, ad campaigns, music videos, TED talks). Strict guardrails — explicitly excludes buyer guides, news analysis, explainers, how-tos.
  - New `lib/brave-video-search.ts` calls Brave `/videos/search` in parallel with web/Reddit/Twitter research. Filters to YouTube/Vimeo only. Dedupes by canonical video ID across queries.
  - Video findings injected into writer prompt (Gemini + Sonnet) with strict rule: copy URLs EXACTLY, never invent. For ranked_list video articles, writer pairs each content_section with a matching video_embed. Schema validator updated. Wired through `runWritePipeline` and `executeResearch` orchestration.
  - Persistence: video_findings passed in-memory only; not yet stored on articles row (Editor's Notes surfacing deferred to 2D3).

---

## Image Pipeline (rebuilt May 2026 — Google-Images-first + vision selection + rehosting)

Mirrors how a human sources an image: search the best index (Google Images) with the literal subject, visually scan the grid, pick the best, and save a copy. Replaces the old stock-first, regex-pick-first[0] approach that returned generic "person at a laptop" photos for specific/named subjects (e.g. "Opus 4.8").

- `lib/google-images.ts` — **primary source for every article.** `searchGoogleImages(query, opts)` hits SerpAPI `engine=google_images` (reuses the existing `SERPAPI_KEY` already used for Google Trends — no new credentials). `safe=active`, large-size bias (`tbs=isz:l`). Maps `images_results[]` → `ImageCandidate` with real dimensions + a small `thumbnail` URL. Returns `[]` on missing key/failure (graceful fallback).
- `lib/image-selector.ts` — **vision selection.** `selectBestImage(candidates, subject, context)` sends candidate *thumbnails* (small, fast, Google-CDN reliable) to Claude Haiku 4.5 vision in one call and picks the single most on-subject, sharp, text/watermark-free image. Fallback GPT-4o-mini; final fallback `candidates[0]`. Skips the call when <2 candidates. Logs `api_usage_log` (`call_type: 'image_selection'`).
- `lib/image-storage.ts` — **rehosting.** `rehostImage(url, articleId, kind)` downloads the chosen image (10s timeout, 10MB cap, content-type check) and uploads to Supabase Storage `article-images` under `heroes/`/`sections/`/`products/`, returning a stable, hotlink-proof public URL. `null` on failure → caller keeps the original URL. Skips images already on our storage.
- `lib/image-router.ts` — routes by image type with **Google first** in every branch: hero editorial → google/pexels/unsplash/brave; hero news/product + product → google/brave; editorial sections → google (+ stock or brave). Dimension/landscape filters in `filterImageCandidates()` are now meaningful (Google returns real dims).
- `lib/images.ts` — `fetchHeroImage()` resolves a candidate pool, vision-picks, then rehosts. `resolveSectionImage()` does the same for editorial sections. `fetchProductImages()` is Google-first (primary product image rehosted; gallery extras hotlinked). Haiku query gen (`generateHeroQuery`) + planner `hero_image_query` both lead with the literal named subject.
- `lib/pexels.ts` / `lib/unsplash.ts` — stock libraries, now **fallback only** (used when Google/SerpAPI returns nothing).
- Owner can still upload a custom hero image via Supabase Storage; admin "Replace thumbnail" still offers multiple candidates (no vision-collapse there — the user picks).

---

## Research System (built — entity cards + synthesis)

- `lib/research-orchestrator.ts` orchestrates all research in parallel
- Entity card extraction from findings (structured: name, type, facts, sources, confidence)
- Haiku synthesis replaces flat research summaries — runs in parallel with Twitter sentiment Haiku call
- Brave web + Reddit + Twitter/X + live data all parallel
- `sanitizeSnippet()` in brave-research.ts prevents JSON failures from unescaped content
- **Per-query freshness** (built April 2026): planner sets `freshness: pd | pw | pm | none` per Reddit/Twitter query; passed through to Brave Search as the `freshness` URL param. Backwards-compatible normalisation in `lib/claude.ts` `normaliseSocialQueries()` handles all legacy/cached plan shapes.
- **Reddit thread quality filter**: fetches `.json` metadata for each Reddit thread URL (public API, no auth). Discards threads with fewer than 10 comments. If all threads fail the filter, keeps the one with the highest comment count. 200ms delay between metadata fetches to avoid Reddit rate limits. Comment count (`num_comments`) and score passed through to plan page sentiment display, article JSON, and writing phase for credibility ("In a thread with 47 comments on r/MechanicalKeyboards...").
- **Twitter/X integration** (built April 2026, redesigned April 2026): planner emits 3-5 `twitter_queries` targeting reactions/debate/criticism (not official accounts). `executeTwitterQueries()` runs them through Brave Search with `site:x.com`, filters to canonical `x.com/{handle}/status/{id}` URLs, requires snippet ≥50 chars, dedupes by tweet id, caps at 12 findings, returns `{findings, rawCount}` for volume signal. Future-proofed for TwitterAPI.io swap (`TWITTER_API_KEY` env var check + comment block documenting integration). HTML entity decoding (`decodeHtmlEntities()`) applied to all Brave snippets. `summariseTwitterFindings()` generates structured JSON via Haiku: per-tweet viewpoint classification (pro/sceptical/neutral), sentiment split with dynamic labels and percentages, context trigger line, and summary paragraph. Persisted to 5 columns: `twitter_findings` (JSONB, includes `viewpoint` per finding), `twitter_summary` (TEXT), `twitter_sentiment_split` (JSONB: `{pro_label, sceptical_label, pro_pct, sceptical_pct, neutral_pct, summary}`), `twitter_context_trigger` (TEXT), `twitter_posts_analysed` (INTEGER). NO Twitter SDK, NO iframes, NO API key required. Rendered via `TwitterSentimentSection` inside `SectionRenderer` after Reddit section (or after last body section as fallback). UI: sentiment meter bar (green/red), 3-tab filter (All voices / Pro / Sceptical), letter avatars with viewpoint colours, left border accent, viewpoint pills, interleaved pro/sceptical in "All voices" view, load more button, **owner ✕ dismiss buttons** with fade-out animation and reserve replacement, footer with post count. Graceful degradation: older articles without sentiment_split show basic card layout without meter/tabs/pills. Section render-gated to ≥2 findings. Both refine paths copy all 5 twitter columns to child articles.
- **Reddit Sentiment Section** (built April 2026): new `RedditSentimentSection.tsx` renders Reddit thread data from top-level `reddit_threads` column (not embedded in article JSON). Research fetches up to 8 Reddit threads (via Brave `site:reddit.com`), enriches with metadata (score, comment count), runs Haiku sentiment analysis in parallel with Twitter/synthesis calls. `summariseRedditFindings()` produces structured JSON: per-thread viewpoint classification, sentiment split with dynamic labels, context trigger, summary paragraph. Persisted to 4 columns: `reddit_threads` (JSONB, full pool with viewpoints), `reddit_sentiment_split` (JSONB), `reddit_context_trigger` (TEXT), `reddit_threads_analysed` (INTEGER). UI: "What Reddit is saying" heading with Reddit snoo icon, sentiment meter bar (green/red) in light orange box (#FFF0E6), full-width stacked cards (NOT 2-column — visual contrast with Twitter grid), Reddit snoo + subreddit name in #FF4500, comment count, upvote score, viewpoint pills, "Read full discussion" links, **owner ✕ dismiss with reserve replacement**. Shows 4 cards by default with "Load more discussions" button. Footer shows subreddit names. Both refine paths copy all 4 reddit columns. Injection order in SectionRenderer: community_insights → Reddit → interactive → Twitter.
- **Reddit native comments — real quotes, not Brave blurbs (rebuilt May 2026)**: the card quote used to be `matchingFinding.content.slice(0,200)` — Brave's truncated web-search *preview* of the Reddit page, which produced mid-sentence cutoffs, off-topic/wrong-product comments, sarcasm, and prospective-buyer questions. New `lib/reddit-comments.ts` → `fetchTopComments()` reads the **actual top-voted comments** from each thread's public `.json` (no auth/key; polite User-Agent; 6s timeout; one retry on `old.reddit.com`; 10-min in-memory cache; markdown-stripped + sentence-trimmed via `cleanCommentBody()`). **Fetch once, use twice:** the Brave comment-count filter (`enrichAndFilterRedditThreads` in `brave-research.ts`) already fetched each thread's `.json` for `num_comments`/`score` — both callers now share one cached `fetchThreadData()`, so reading comments adds **~0 extra Reddit requests** (no double-fetching, lower rate-limit risk). For the top ~6 most-engaged deduped threads, `summariseRedditFindings()` (Haiku) **SELECTS the single best real comment per thread by index** (`best_comments[]`) — rejecting sarcasm, jokes, questions, off-topic, and wrong-product comments — and that verbatim comment becomes the card `snippet`, with `comment_url` linking to the exact comment. Sentiment split + viewpoints are now grounded in real comments, not blurbs. **Three-tier safety net**: thread comments don't load → that card uses the Brave fragment; whole step fails → today's behaviour; never blocks the pipeline. **On by default** (no env var needed); set `REDDIT_NATIVE_API=off` to disable. Selection-by-index guarantees quotes are real (no model-written quote text). Cost: free Reddit fetches + the existing Haiku call (now fed real comments). Caveat: Reddit can block data-center IPs, so the hit-rate isn't 100% — but it degrades to the previous behaviour, never worse.

---

## Daily Automated Article (built May 2026 — Vercel Cron; topic quality rebuilt Oct 2026)

**Topic discovery rebuilt Oct 2026.** The first weeks of auto-articles were weak ("Is cushcore the cozy decor trend worth embracing", "Is Sam's Club's new deli find truly a weeknight dinner"). Root cause was not the prompt: discovery ran on Brave's **web** index with phrases like `"food trend this week"`, which is exactly what SEO content farms optimise for — the picker was choosing the best of a bad list. Now: Brave **news** index, event-shaped queries, listicle/landing-page filtering, per-outlet caps, and the picker is explicitly allowed to publish nothing. Verified across all 14 beats on 15 Oct: 13 produced real stories (GTA 6 launch trailer, Fox's $22bn Roku acquisition, Tesla Roadster debut, SpaceX ISS solar arrays) and Finance correctly declined as a duplicate of the previous day's CPI article. Preview without generating: `npx tsx scripts/preview-daily-topics.ts`.

Fresh, fully-generated articles published automatically — no human in the loop. **~10/week** with a category spread (tuned May 2026 from 1/day to hit the founder's 5–12/week target).

- **Trigger:** Two Vercel Cron schedules (`vercel.json`), both hitting `app/api/cron/daily-article/route.ts` (GET): `0 6 * * *` (daily, 07:00 Dublin, **slot 0**) + `0 14 * * 1,3,5` (Mon/Wed/Fri 15:00 Dublin, **slot 1**) → 7 + 3 = ~10/week. (If Vercel collapses the two same-path entries, it degrades to 7/week — still in range.)
- **Weekly spread:** one article per run, each from a different **beat**. `slot` offsets the beat to the OPPOSITE side of the 14-beat ring, so a day's two articles are far-apart categories and the week fans out across the calendar — never 5 of the same category. A hard **weekly cap of 12** (`source: 'daily_cron'` count over 7 days) prevents overshoot.
- **Cheap mode (cost control):** daily articles run with `length: 'quick'` (800–1200 words, fewer sections/images) and `generation_options.cheap = true`, which makes `runEditorialPass()` skip the premium Sonnet 5 editor and run the same checks on **Gemini Flash** (~½¢ vs ~8¢ — the biggest per-article saving). Keeps the cron at **~$5/month** at ~10/week.
- **Auth & guards:** Vercel sends `Authorization: Bearer ${CRON_SECRET}` (set `CRON_SECRET` in Vercel env); an admin session is also accepted. `?force=1` bypasses guards for a manual browser test. Three guards (all skipped by `?force=1`): a **5-hour** recent-run guard (blocks accidental double-fires, not the morning+afternoon pair); the **weekly cap of 12**; and a **monthly $ budget** — sums this month's `daily_cron` `total_cost` (per-article LLM spend) plus a flat `$0.08`/article search estimate (Brave + SerpAPI aren't logged per-article), and skips once it hits `DAILY_ARTICLE_MONTHLY_BUDGET` (default **$5**). The weekly cap bounds volume; the budget bounds dollars.
- **Topic selection (`lib/daily-topic.ts` → `pickDailyTopic(slot)`):** 14 editorial beats (Tech, AI, Science, Space, Health, Culture, Entertainment, Gaming, Business, Automotive, Food, Home, Sports, Finance — weighted away from partisan politics). Brave discovery on the beat (`freshness: pw`, broadening to `pm` on a quiet week — so it's topical-over-the-week, **not only same-day breaking**), avoids the last 14 days of auto-topics, then **Haiku picks ONE current, concrete, opinion-friendly query**. Returns null (that run skips) if there's no real signal. Logged as `daily_topic`.
- **Generation:** reuses the **exact production pipeline** — `planArticle()` → `executeResearch()` → `runWritePipeline()` (fact-check + social async inside it) — inline (`maxDuration = 300`). **Attributed to the admin user** (`ADMIN_USER_ID`), tagged `generation_options.source = 'daily_cron'` with `_slot`/`_beat`/`_topicRationale` for spread traceability.
- **Visibility:** `published` by default (live + homepage). `DAILY_ARTICLE_VISIBILITY=unlisted` turns it into a **review queue** (live URL, off homepage until the founder publishes).
- **Cost:** ~10–14¢/article in cheap mode (quick length + Gemini editorial + Gemini writer + Brave/SerpAPI search) → **~$5/month at ~10/week**, hard-capped by the monthly budget guard. Returns `{ ok, id, slug, title, url, rationale }` on success, or `{ ok:false, reason }` when a guard skips (`ran_recently` / `weekly_cap_reached` / `monthly_budget_reached` / `no_topic_signal`).

---

## Interactive Components (built April 2026, async)

Bespoke interactive tools generated per article — decision trees, scenario simulators, maps, and calculators. No other content platform generates tailored interactive tools from article content.

**Pipeline:**
- Planner (Stage 1) sets `interactive_component_type` field: `decision_tool | scenario_simulator | interactive_map | comparison_calculator | null`. Null means no component — no downstream cost.
- After article delivery, `generateInteractiveComponent()` in `lib/interactive-component.ts` fires async (same pattern as fact-check/social content).
- Calls Haiku 4.5 to generate structured JSON data (not HTML). Falls back to Sonnet if Haiku output fails validation.
- Validates output against component type schema before saving.
- Stored as `interactive_component` JSONB column on articles table.
- Cost: ~$0.005-0.01/article (Haiku), ~$0.05-0.08 if Sonnet fallback needed.
- Logged to `api_usage_log` as `interactive_component` (or `interactive_component_fallback`).

**Four component types (pre-built React components, not LLM-generated HTML):**
1. **Decision Tool** (`components/interactive/DecisionTool.tsx`) — Step-by-step question flow with branching paths leading to personalised recommendations. Progress bar, animated transitions, restart button. For buyer_guide, comparison, decision_guide.
2. **Scenario Simulator** (`components/interactive/ScenarioSimulator.tsx`) — 3-4 named scenarios with probability estimates (Polymarket if available), animated impact bars across 3-4 dimensions, verdict per scenario. For news_analysis, breaking_news, trend_analysis.
3. **Interactive Map** (`components/interactive/InteractiveMap.tsx`) — Leaflet.js map (loaded from cdnjs) with OpenStreetMap tiles, custom markers with popups, route polylines, highlighted zones. Real coordinates only. For geopolitical, travel articles.
4. **Comparison Calculator** (`components/interactive/ComparisonCalculator.tsx`) — Slider inputs with real-time formula evaluation, personalised output cards. Safe formula evaluation via restricted `new Function()` scope. For financial decision articles.

**Rendering:**
- `InteractiveComponentSection` wrapper (`components/interactive/InteractiveComponentSection.tsx`) with amber left border, type label, title, "Generated for this article" footer.
- Injected via `SectionRenderer` after community_insights (before Twitter sentiment), with fallback positions before sources or at end.
- All components lazy-loaded via `next/dynamic` with `ssr: false`.
- Fully responsive, matches platform design system colours and fonts.

**Admin controls:**
- "Regenerate Interactive" button in AdminMenu (per-article) → `POST /api/articles/[id]/regenerate-interactive`
- Backfill endpoint → `POST /api/admin/backfill-interactive` (processes up to 50 articles in batches of 5 with 2s delay)
- Both refine paths copy `interactive_component` to child articles.

---

## Social Content Generation (built, async)

- `lib/social-content.ts` — generates X thread, LinkedIn post, Reddit summary, image cards
- Gemini Flash, ~$0.001/article
- Runs asynchronously after article delivery
- Saved to DB via `saveSocialContent()`

---

## Homepage (built, updated September 2026)

**Two homepages, chosen server-side.** `app/page.tsx` detects sign-in state via `isAuthenticatedVisitor()` and renders `MarketingHomepage` (signed out — sells the product) or `SearchHomepage` (signed in — puts search first). Both draw from the same single query.

1. PendingArticleRecovery → Navbar (no search) → HomepageHero → TrustStrip
2. Featured: 1 hero (2fr) + 2×2 small cards (3fr), 540px — **rotates automatically every 6 hours** (see below)
3. Trending Today: 3 dark-style cards, manual admin toggle, pool-based
4. Most Popular: top 4 by view_count with rank badges
5. Explore by Topic: 12 category chips with warm grey fill (`#EDECEA`), 8px radius (not fully rounded), amber hover (`#BA7517`), links to `/category/[slug]`
6. Recent Articles: 3 per row with category filter pills + "View all →" link
7. Footer

Deduplicates article chains via `root_article_id`.

### Featured rotation (built November 2026)

**The Featured block now changes on its own.** It was a manual `is_featured` toggle
plus a client-side random hero, and the four small cards were always the four
newest picks — so the block looked identical for days and only moved if someone
opened the admin dashboard.

`lib/featured-rotation.ts` derives the five articles from the clock instead:

- **Eligible pool** = hand-picked (`is_featured`) **+ everything published in the
  last 14 days**, so new articles reach the homepage with no admin action.
- **Rotates every 6 hours** — four different blocks a day. A 5-article window
  walks through a seeded shuffle, so consecutive windows share *no* articles and
  a full sweep covers the pool before the order is redrawn.
- Verified against production data: 29 eligible articles, 0 repeats between
  consecutive windows, whole pool seen inside ~1.5 days.

Side effects of the change:
- `FeaturedSection` is now a **server component** — no `'use client'`, no hooks,
  no `localStorage`. Links are in the initial HTML (better for crawlers, and the
  540px placeholder flash before hydration is gone).
- `hasVisitedFeatured` and `featuredHeroId` localStorage keys are **retired**.
- Recent Articles now excludes only the five articles *currently shown*, not the
  whole featured pool — the pool holds every recent article, so excluding all of
  it would have emptied that grid. 18 formerly-featured articles that were
  invisible in Recent now appear there when they are not on show.
- Zero extra database cost: the rotation is computed, not stored.

Trending Today still uses the old manual-toggle + client-random approach and has
the same staleness problem (16 in its pool).

### Hero (updated April 2026)
- **Logged-out headline:** "Ask Anything. Get the / Best Answer on the Internet." — second line in amber `#BA7517`
- **Logged-out subline:** "A complete visual article — researched, fact-checked, and ready in three minutes."
- **Logged-in returning:** "Welcome back, [name]. What do you want to know today?"
- **First-time onboarding:** "Welcome to Unpacked, [name]" with 6 example prompt cards
- Three feature boxes ("Visual, not walls of text" / "Researched, not generated" / "Verified, not guessed") **removed** — replaced by the trust strip below

### Trust Strip (rebuilt April 2026)
Three-column layout with thin vertical dividers (desktop) / stacked with horizontal dividers (mobile). Each column: icon + claim text (13px) + proof pills (10px, 4px radius, font-weight 500).

| Column | Icon | Claim | Pills |
|--------|------|-------|-------|
| 1 | Speech bubble (muted) | Real opinions. Clear verdict. | `Reddit` `X` `Expert reviews` — neutral grey bg |
| 2 | Green checkmark | Triple fact-checked | `Gemini` (green) `Claude` (purple) `Grok` (blue) |
| 3 | Pulse/chart (amber) | Live data. Not training data. | `Polymarket` `Yahoo Finance` `Google Trends` — amber tint |

Top/bottom borders, 18px padding. Component: `components/TrustStrip.tsx`.

**Note:** Trust strip says "Grok" but actual fact-check pipeline uses GPT-4o-mini for arbitration. Intentional — Grok is a stronger consumer brand name.

### Card payload projection (built September 2026)

Listing cards render from `ArticleCardData` (`lib/article-card.ts`), not from `ArticleRow`. `toArticleCard()` resolves the ~18 scalars a card actually needs on the server; the heavy JSONB never crosses into a client component.

- Homepage query selects scalars plus `plan->>category` and `fact_check->>checks_performed` projections. `plan`, `fact_check` and `suggestion_chips` are no longer fetched whole; `article` is fetched (reading time needs section text) but stays server-side.
- **Measured:** the 200 full rows previously passed to client components serialised to **5.77 MB**. Rendered homepage HTML is now **441 KB**.
- `TYPE_LABELS` / `typeLabel()` are shared from `lib/article-card.ts` — the four duplicate local copies (Featured, Trending, Popular, Recent) are gone, and the shared map now covers all 14 types (the old copies were missing `ranked_list`, `myth_buster`, `timeline_article`, `visual_list`, so those cards rendered a de-underscored fallback).

**Rule: never pass an `ArticleRow` into a listing component.**

---

## Admin Dashboard (built — 5 tabs)

- **Overview:** Total Views, Total Articles breakdown (Published/Unlisted/Private/Error), Avg Views/Article, Article Types count. Content Health section: no-hero-image count, unverified count, zero-views count, last 7d/30d generation counts, avg word count. 30-day views chart, top articles, articles by type, views by category, content by category. Users section.
- **Articles:** 5 sub-tabs (All, Featured, Trending, Hidden, No Image). Filter dropdowns: Visibility (All/Published/Unlisted/Private), Fact-check (All/Verified/Unverified), Sort (Date/Views/Title). Star/flame/eye toggles, drag-to-reorder (@dnd-kit), per-article controls.
- **Costs:** Pipeline health cards (avg gen time 7d, failed gens 7d, avg cost/article 7d). Monthly stats: total spend, avg per article, articles, API calls. Fallback monitoring: Gemini vs Sonnet split, rate %, amber alert >5%. Daily spend chart, provider/call-type breakdown. Recent articles cost table.
- **Feedback:** Weekly summary (votes, positive %, top issues). Negative feedback list with real article titles from JSONB (clickable links, "Deleted article" for missing). Resolved toggle per item (checkbox, resolved items sorted below with reduced opacity). Requires `resolved` boolean column on `article_feedback` table.
- **Founders:** Application management with approve/reject.

Admin = email matches `NEXT_PUBLIC_ADMIN_EMAIL`.

---

## Article Page Features (built)

- Server-rendered with JSON-LD injection (Article, Person, ClaimReview, Review, BreadcrumbList)
- Client-side polling for in-progress articles
- Fact-check bar with corrections display
- **Expandable fact-check panel** — click "Triple-Verified · N claims" badge to see per-claim breakdown with verdict icons (green/amber/red), agreement status (Unanimous/Majority/Disputed), corrections inline. Summary stats at top. No internal model names exposed. Non-expandable when no audit data.
- **Per-model breakdown** — verification report shows progress bars for each model (branded as Gemini/Grok/Perplexity — consumer-facing names). Confirmed/flagged counts. Only shows models that actually ran.
- **Disputed claims callout** — amber-highlighted section in both the bottom panel and claims panel. Shows claim text, plain-English explanation, and correction (if any). Only appears when claims were corrected or softened.
- **Card badges** — Small green shield icon (16px hero, 14px small cards) inline next to article title on all homepage cards (Featured, Trending, Popular, Recent) when `fact_check` data exists. NOT an image overlay — sits next to the title text. TripleCheckBadge component exists but is unused (dead code).
- **Trust strip upgrade** — homepage trust strip rebuilt April 2026 as a 3-column layout: real opinions (Reddit/X/Expert reviews), triple fact-checked (Gemini/Claude/Grok), live data (Polymarket/Yahoo Finance/Google Trends). See Homepage section for details.
- **Fact-check explainer** — green info box at top of both the bottom-bar expanded panel and inline ClaimsPanel. Mentions Google Gemini and Claude by name. Text: "Every factual claim was extracted and checked by Google Gemini with live web search, then reviewed by Claude for credibility. Corrections are applied automatically."
- Verified badge (green shield, "Verified" label) — now clickable with chevron when claims data exists
- Internal linking (client-side injection, zero DB writes, cached 1 hour)
- Product cards, comparison tables, calculators, charts (Recharts), verdict box
- PDF export (jspdf)
- Reddit community section (real threads from Brave). **Removable quotes**: owner sees ✕ on hover (40% opacity on mobile) for each pull quote and insight card. Removes from article JSON via `POST /api/articles/[id]/remove-quote`. Toast hints about remaining quotes in Editor's Notes. If all quotes/insights removed, entire section auto-hides.
- Refine/fork system (child article, lineage via parent/root IDs). **Image upload in refine**: paperclip icon in textarea footer, uploads to Supabase Storage (`refine-images/`), thumbnail preview with remove, 5MB limit, image URL passed to refine model for placement in article JSON. **Surgical refine prompts (April 2026)**: refine now instructs the model to make ONLY the requested change, preserving all unchanged sections verbatim. Research findings passed as context to prevent hallucinated replacements. Title mutation safeguard: title reverts to original unless the user explicitly asks for a title change (keyword detection). Article type preserved on all refines. Structural diff check logs warnings when >50% of sections change unexpectedly. Research findings, entity cards, and synthesis now carried forward to child articles. **Image handling in refine (April 2026)**: 4 image rules in both Gemini and Sonnet refine prompts (upload preservation, swap-only-URL, remove-only-target, preserve-untouched). `enrichArticleWithImages()` skips images that already have a URL set (prevents stock photo overwrite of user uploads). Post-refine image validation: detects wiped image URLs and dropped image_sections, restores from pre-refine article unless user explicitly requested removal.
- **Section-level editing** — owner sees ✕ (replace) and ✎ (edit) icon buttons on hover for each body section (excluding sources/further_reading). Two distinct tools:
  - **✎ Edit** — inline text input for quick section rewrites. Same as before.
  - **✕ Replace** — dims section to 15% opacity with blur, shows a replacement bar (amber-bordered card, `#BA7517`, 12px radius, subtle shadow). Bar contains: header ("What should replace this section?"), contextual suggestion pills from unused research findings and entity cards (fetched via `POST /api/articles/[id]/section-suggestions` — no AI call, pure data comparison), "or describe what you want" divider, text input with "Replace" button, and "Just remove this section entirely" link at bottom. Suggestion pills: `#E8E6E0` border default, amber hover/selected, pre-fill the text input on click. Replace action calls existing section-edit API. On success: green left border (`#22C55E`) + "Updated" indicator fades out after 10 seconds. On error: restores original section. Only one section can be in replacement mode at a time. Cancel restores section to full opacity. Mobile: pills wrap, input/button stack vertically.
  - APIs: `POST /api/articles/[id]/section-edit` (remove/edit), `POST /api/articles/[id]/section-suggestions` (contextual pills). Components: `SectionToolbar.tsx`, `SectionRenderer.tsx`.
- **Editor Bar** — persistent owner-only toolbar between article metadata and hero image. Replaces FirstDraftBanner, visibility pulse animation, and Editor tab nudge animation. Seven action buttons: Sections (scroll to first section), Images (scroll to hero), Research (opens Editor tab, shows amber badge with unused findings count), Edit (navigates to full-document editor at `/article/[slug]/edit`), Share (opens SharePanel), Export (PDF via window.print()), Visibility (dropdown: Published/Unlisted/Private). Contextual helper text rotates: "Make it public" for new unpublished articles, "{N} findings weren't used" when research is available, "Share to earn bonus articles" when published. Mobile: icon-only buttons (labels hidden), visibility pill keeps text. Component: `components/ui/EditorBar.tsx`.
- **Full-Document Editor** (`/article/[slug]/edit`) — Google Docs / ChatGPT Canvas style editor for an article's text content. Owner or admin only (server-side gate in `app/article/[slug]/edit/page.tsx`). Sticky toolbar with Back link, Write/Reorder mode toggle, edit counter, Cancel, and amber Save (`#BA7517`). One continuous document below: editable title (serif, 26px), metadata line (article type · category · section count · live word count), then every section rendered in order. **Write mode**: content sections show editable heading + auto-resizing textarea (no internal scroll, height set to scrollHeight on every input). Big statements render in their amber `#FAEEDA` card with serif italic editable text. Product cards expose heading + opinion + verdict only — specs/price stay locked. Image sections render the actual image inline with alt-text caption (image editing happens on the article page, not here). Charts, tables, calculators, comparison matrices, timelines, ranked lists, myth/reality, etc. render as compact descriptive placeholders showing data shape (e.g. "5 data points", "3 items × 8 metrics") with a type icon — heading is editable, body data is locked. Focused fields show a 3px amber left border. Modified fields show a small amber "Edited" pill underneath. **Reorder mode**: collapses to a compact list (drag handle + type pill + heading), drag-and-drop via @dnd-kit/sortable. Switching back to Write mode preserves the new order. **Save** sends `{ title, sections: [...with _originalIndex] }` to `POST /api/articles/[id]/edit-full`, which patches the JSONB directly (no AI call), tags any modified section with `edited: true`, then redirects to the article page with `?edited=1`. **UX**: Cmd/Ctrl+S saves, beforeunload warning if unsaved changes, confirm dialog on Cancel with changes. Files: `app/article/[slug]/edit/page.tsx`, `app/article/[slug]/edit/EditFullClient.tsx`, `app/api/articles/[id]/edit-full/route.ts`.
- **Improve prompt chip** — SearchForm calls `/api/improve-prompt` (Haiku) to generate 3 alternative query suggestions. Helps users refine vague questions before generating.
- **Navbar search autocomplete** — searches across article title (JSONB `article->>title`), original query, slug, card_summary, and category. Three parallel queries ranked by relevance: title matches first, then query/slug, then card_summary/category. Returns top 6 by view_count, published articles only. Displays real article title from JSONB, card_summary subtitle, category pill, and view count. Component: `components/ui/NavSearchBar.tsx`, API: `/api/articles/search`.
- **Author block** — 40px avatar, 15px font-medium name, bio line. Social icons (X, LinkedIn, Medium) right-aligned at 18px with hover states. Flexbox justify-between layout.
- **Cost + generation time** — admin-only display showing "4¢ · 47s" from `generation_options.timings` breakdowns
- **Editor tab (EditorCoPilot)** — research findings, entity cards, synthesis, blueprint, live data. Finding selection with checkboxes, "Include selected" action bar (Add/Replace/Automatic modes), source links on findings. Animated badge showing unused findings count.
- **SharePanel** — 4-tab slide-out (Twitter thread, LinkedIn, Reddit, Image Cards) with copy buttons, character counts, subreddit submit links. Owner-only, lazy-loaded.
- **Social links** — `twitter_url`, `linkedin_url`, `medium_url` on profiles table. Settings page, API, creator profile, article author block all wired.
- **Inline image replacement (section images)** — owner/admin hover overlay on `image_section` images (single, gallery, side-by-side). Dark overlay (50% opacity) with "Replace image" button (file picker + drag-and-drop) and "Remove" button. Uploads to Supabase Storage, then calls `POST /api/articles/[id]/swap-image` for surgical JSON update (no AI model involved). Success: green border flash. Remove: confirmation dialog, then splices image from article JSON. Touch: tap to show overlay, 44px touch targets. Component: `ImageSwapOverlay.tsx` (shared, reusable). API: `app/api/articles/[id]/swap-image/route.ts` (supports hero/section/product targets, only section wired). Scope: section images only — hero and product card images retain their existing controls.
- **Bottom CTA** — conversion block below Related Articles. Three versions: (A) logged-out: pen icon, heading, source-count subline, stats strip, search input + "Unpack it" button, category-contextual example pills; (B) logged-in non-owner: lighter heading, search + pills, fork link ("Write your own take on…"); (C) owner: hidden. Search input navigates to `/?q=...`. 12 category pill sets. Component: `components/ArticleBottomCTA.tsx`.

---

## Generation Options (built, wired to prompts)

- **Length:** quick / standard / deep
- **Tone:** opinionated / balanced / technical (+ 7 more codes in editorial-rules.ts). Renamed from "casual" April 2026.
- **Visual density:** configurable
- Profile preferences: location, currency, language merged into generation options

---

## Pages Confirmed Built

| Path | File | Notes |
|------|------|-------|
| `/` | `app/page.tsx` | Homepage, server component |
| `/article/[slug]` | `app/article/[slug]/page.tsx` | Article page, UUID or exact slug lookup. Custom branded not-found page (`not-found.tsx`). |
| `/admin` | `app/admin/page.tsx` | Admin dashboard, 4 tabs |
| `/about` | `app/about/page.tsx` | Rebuilt April 2026: Hero → Challenger → Comparison → How it works → 3 dark tiles → Reddit/X section → Interactive charts → Triple fact-check → CTA → Featured articles |
| `/how-it-works` | `app/how-it-works/page.tsx` | Rebuilt April 2026 as the consolidated investor/partner page (noindex). 10 sections: Hero+Problem → Stats strip → ChatGPT comparison + 6-point differentiation → Any topic/any format + live data sources → 5-stage pipeline (public framing) → Why now → The gap → Wirecutter + automation → Business (who pays, creators as distribution, flywheel, numbers + Calculator) → Founder + tech stack. `/vision` folded in here — 301 redirect lives in `next.config.ts`. |
| `/updates` | `app/updates/page.tsx` | Changelog |
| `/dashboard` | `app/dashboard/page.tsx` | User dashboard |
| `/creators` | `app/creators/page.tsx` | Rebuilt April 2026: server component, visual mock article, How it works, feature cards, honest monetisation ("coming soon"), featured articles from DB, founding creators callout |
| `/creator/[id]` | `app/creator/[id]/page.tsx` | Creator profile |
| `/settings` | `app/settings/page.tsx` | User settings |
| `/recent` | `app/recent/page.tsx` | Recent articles |
| `/build` | `app/build/page.tsx` | Build page |
| `/pricing` | `app/pricing/page.tsx` | Pricing page, 3 tiers |
| `/founding-creators` | `app/founding-creators/page.tsx` | Founding Creators application |
| `/plan` | `app/plan/page.tsx` | Plan Mode — interactive editorial brief |
| `/category/[slug]` | `app/category/[slug]/page.tsx` | Category pages, 12 categories |
| `/terms` | `app/terms/page.tsx` | Terms of Service, static |
| `/privacy` | `app/privacy/page.tsx` | Privacy Policy (GDPR-compliant), static |
| `/copyright` | `app/copyright/page.tsx` | Copyright Policy + takedown procedure, static |

---

## API Routes (61 confirmed)

Covering: articles CRUD (create, view, delete, refine, regenerate, visibility, type switch), admin (costs, feedback, analytics, users, backfill, reclassify, migrate), article features (fact-check, featured, trending, pin, hide, share-credit, social-content, card-summary, research, cost-breakdown, section-edit, section-suggestions, edit-full), images (upload-hero, replace-image, replace-thumbnail, set-primary-image, regenerate-images, upload-refine-image, swap-image), stripe (checkout, webhook, portal), profile (profile, usage, article-count), founding creators, improve-prompt, plan-preview, categories, saved-articles, waitlist, search, recent, reorder, claim, start-writing.

---

## Cost Controls (built)

- `api_usage_log` table with token counts and cost tracking
- `MODEL_PRICING` in `lib/api-usage.ts` with per-model rates
- Duplicate call guard (in-memory, 5-min window)
- Query caching (similar article check before generation)
- Concurrency limiter: `GEMINI_MAX_CONCURRENT=3` (in-memory)
- Admin Costs tab: usage breakdown, fallback monitoring

---

## SEO (built, extended September 2026)

- JSON-LD structured data: Article, Person, ClaimReview, Review, BreadcrumbList
- Sitemap, robots.txt, OG tags, canonical URLs
- Security headers in next.config.ts (X-Content-Type-Options, X-Frame-Options, etc.)

### Canonicalisation — one indexable URL per intent (built September 2026)

`lib/seo-canonical.ts` is the single map. No article rows are deleted; every entry is reversible by editing that file.

| Mechanism | Effect | Current entries |
|-----------|--------|-----------------|
| `SLUG_REDIRECTS` | Permanent redirect (308, which Google treats as 301) | 21 |
| `NOINDEX_SLUGS` | Live + linkable, out of sitemap, `robots: noindex, follow` | 2 (`macbook-neo`, `macbook-neo-vs-dell-inspiron-14`) |
| `DEBRIS_PATTERNS` | Filtered from listings + sitemap, blocked at slug generation | 6 matches in DB |

Keeper rules: **R1** editorial decision wins → **R2** a `-N` suffixed slug always loses to its unsuffixed twin → **R3** otherwise higher `view_count` wins.

Wired into: article page (redirect + canonical + robots), `app/sitemap.ts`, `app/page.tsx`, `app/category/[slug]/page.tsx` (excluded in SQL so pagination stays even), and `lib/slug.ts` (`cleanSlug()` strips test markers so debris is never minted again).

**Verified against the live DB before shipping:** all 21 redirect targets exist, are `complete`/`verified` and `published`; no redirect chains; the debris regex matched exactly the 6 known test artefacts with no false positives on real articles (e.g. `chatgpt-build-production-app-test` stays indexable). Sitemap article URLs dropped from **231 to 208** (21 redirects + 2 noindexed removed); total sitemap is 224 entries including 16 static/category pages.

---

## Tier System (built — Stripe Checkout connected)

- Three tiers: Free ($0, 3 articles/month), Standard ($12, 15/month), Pro ($29, 60/month)
- `profiles` table: `tier`, `monthly_article_limit`, `articles_used_this_month`, `month_reset_date`, `bonus_credits`, `is_founding_creator`, `tier_updated_at`, `stripe_customer_id`, `stripe_subscription_id`, `payment_failed`
- `upgrade_waitlist` table for paid tier interest tracking (cleaned up on successful checkout)
- Tier enforcement in `app/api/articles/create/route.ts` — checks allowance after rate limit, auto-resets monthly, admin bypasses all limits
- Bonus credits consumed after tier allowance exhausted
- **Stripe Checkout (April 2026):**
  - `lib/stripe-config.ts` — Stripe instance, price ID mapping, tier limits
  - `app/api/stripe/checkout/route.ts` — creates Stripe Checkout session, creates/reuses Stripe customer
  - `app/api/stripe/webhook/route.ts` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Raw body + signature verification.
  - `app/api/stripe/portal/route.ts` — creates Stripe Billing Portal session for managing subscription
  - Stripe SDK: `stripe` (server) + `@stripe/stripe-js` (client, for future use)
  - Env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Migration: `scripts/add-stripe-columns.sql` (stripe_customer_id, stripe_subscription_id, payment_failed)
- Pricing page at `/pricing` — three-column layout, "Most popular" badge on Standard, real checkout buttons for paid tiers (redirects to Stripe Checkout). Shows "Current plan" when already subscribed. Sign-in redirects back with `?checkout=tier` param.
- Waitlist API at `app/api/waitlist/route.ts` (still exists; waitlist entries cleaned on checkout completion)
- Usage API at `app/api/profile/usage/route.ts`
- Usage indicator on homepage hero: "2 of 3 articles remaining" (amber at 0)
- Limit reached modal with upgrade/share options
- Usage section on dashboard with progress bar, tier display, reset date
- Upgrade success toast on `/dashboard?upgraded=true` — green banner with tier name
- Settings page: "Manage billing" section for paid users → redirects to Stripe Customer Portal (payment method, invoices, cancellation)
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

## Plan Mode — Interactive Editorial Brief (v7, upgraded April 2026)

Two buttons on homepage: **"Plan first"** (outline amber border, `#BA7517` text, 8px radius) and **"Unpack it"** (solid `#BA7517`, white text, 8px radius).

**"Unpack it"** — existing flow unchanged. Runs the full 8-stage pipeline immediately with standard defaults.

**"Plan first"** — requires authentication. Redirects to Google OAuth if not signed in, then returns to `/plan?q=...`.

### 3 Angle Options

After planning + research, an additional Haiku call generates 3 different article angles. Each angle has:
- **Headline** — publication-ready title
- **Article type** — from 10 valid types, each different. Type pill with dark tooltip showing description + feature tags.
- **Pitch** — 2 sentences explaining the angle
- **5 questions** — specific to that angle's type
- **4-5 scope pills** — per-angle focus narrowing

Angles displayed as selectable radio cards. Switching angles instantly swaps questions and scope pills (client-side, no API call). Findings and sentiment stay the same.

### Interactive Sections

1. **Angle Selection** — 3 radio cards with headline, type pill (with tooltip), pitch, radio dot. First pre-selected.
2. **Scope Pills** — "NARROW YOUR FOCUS". Toggle on/off, multiple allowed. Reset on angle switch.
3. **Products** — Conditional: only shows for buyer_guide, comparison, roundup, ranked_list. 2-column grid. Hover ✕ to exclude (35% opacity + strikethrough + Undo). "+ Add a product" input supports comma-separated entries (each creates its own card). User-added products have ✕ to remove (instant, no undo — they're user-added, not from research).
4. **Key Findings** — Top 4 data-backed findings from synthesis/entity cards/research. Not raw source titles. Same ✕/Undo pattern. "+ Add something the research missed." User-added findings have ✕ to remove.
5. **Questions** — 5 per-angle questions generated as genuine reader questions (not rephrased section headings). Per-angle state preserved on switch. Same ✕/Undo pattern. "+ Add a question." User-added questions have ✕ to remove.
6. **Community Sentiment** — Top 3 active (amber border) + 2 reserve (40% opacity, grey border). Click reserve to promote. ✕ on active only. Hidden if no Reddit data. Haiku summarizes Reddit thread titles into one-sentence community insights (parallel with angle generation, ~$0.001). Falls back to raw thread titles if summary fails.
7. **Length & Tone** — 2-column radio cards, top-aligned. Length: Quick/Standard/Deep. Tone: Opinionated/Balanced/Technical.
8. **Feedback & Actions** — "Anything else?" textarea. "Start over" (ghost) + "Write it" (solid amber).

### Data Flow

"Write it" collects all selections into a structured editorial brief:
- Selected angle (headline, type, pitch)
- Active scope pills
- Included/excluded products
- Included/excluded findings
- Included questions (per-angle)
- Active sentiment quotes
- Length, tone, feedback

Sent as `planData.userFeedback` (editorial brief string) to `POST /api/articles/create`. Blueprint prompt receives the full brief.

### Tone Rename

"Casual" tone renamed to "Technical" across the entire codebase:
- `components/ArticleOptions.tsx` — type + UI label
- `lib/claude.ts` — planning prompt
- `lib/blueprint.ts` — blueprint prompt
- `app/api/articles/[id]/generate/route.ts` — generate route
- `app/plan/page.tsx` — plan mode UI

Technical tone: "Write for an expert audience. Assume domain knowledge. Skip introductory explanations. Go deeper on specifics, methodology, and nuance."

### Graceful Degradation

- No Reddit comments → sentiment section hidden
- No products identified → products section hidden even for product types
- Fewer than 4 findings → show however many exist
- Angle generation fails → single fallback angle from original plan

**Rate limiting:** 20/hour per user (key: `plan:user:{userId}`). Does NOT consume article allowance.

**Files:**
- `components/SearchForm.tsx` — two buttons with amber styling
- `app/api/articles/plan-preview/route.ts` — plan + research + angle generation + Reddit summary (4 Haiku calls total)
- `app/plan/page.tsx` — full interactive editorial brief with per-angle state management
- `app/api/articles/create/route.ts` — accepts `planData` field, skips plan+research when present
- `lib/blueprint.ts` — injects editorial brief into blueprint prompt

---

## Known Bugs (verified)

0. **The daily automated article has never run in production** — **DIAGNOSED 20 Sep 2026; needs one env var.** `vercel.json` fires `/api/cron/daily-article` on schedule and Vercel does invoke it (confirmed 06:00:32 on 19 and 20 Sep), but the route returns **401** every time. Vercel only attaches `Authorization: Bearer <CRON_SECRET>` when a `CRON_SECRET` env var exists on the project; it does not, so the route rejects its own cron. Evidence: exactly **one** article in the DB has ever carried `source: 'daily_cron'`, and that was a local test run. The feature shipped 20 Jun 2026 and has produced nothing since. **Fix: add `CRON_SECRET` to Project Settings → Environment Variables (Production), then redeploy.** No code change restores this — without the env var there is no header to authenticate. The route now logs an explicit `CRON_SECRET is NOT SET` error and returns a `cron_secret_not_set` hint instead of a bare 401.

1. ~~**Big statements and pull quotes visually identical**~~ — **FIXED April 2026.** Pull quotes now use left-border italic style; big statements keep amber card + quote SVG.
2. ~~**Polymarket uses old Haiku model**~~ — **FIXED April 2026.** Updated to `claude-haiku-4-5-20251001`.
3. ~~**Editorial pass score threshold mismatch**~~ — **FIXED April 2026.** Code threshold aligned to ≤80, matching the prompt.
4. **In-memory state in serverless** — Gemini concurrency limiter, duplicate call guard, Yahoo Finance cache all in-memory. Work per-instance but don't coordinate across instances.
5. ~~**Refine degradation — articles get worse with each refinement**~~ — **FIXED April 2026.** Root causes: refine prompt had no preservation instructions (model rewrote everything), no research context passed (model hallucinated replacements), no title/type safeguards (model changed titles on scope edits). Fix: surgical refine prompts, research context injection, title mutation safeguard, article_type preservation, structural drift logging.
6. ~~**"Twitte r/X" subreddit link bug**~~ — **FIXED April 2026.** Regex `/r\/(\w+)/i` in CommunityInsights.tsx matched "r/X" inside "Twitter/X" (the `r` at end of "Twitter" + `/X`). Fixed with word boundary `\b` prefix on both instances (pull quotes + insight cards).
7. ~~**Refined articles lose Twitter sentiment data**~~ — **FIXED April 2026.** Both refine paths (co-pilot rewrite + standard text refine) in `app/api/articles/[id]/refine/route.ts` copied research_findings/entity_cards/synthesis/live_data from parent but not `twitter_findings` or `twitter_summary`. Child articles always showed null. Fixed by adding both columns to both insert blocks.
8. ~~**News articles generate with almost no images**~~ — **FIXED April 2026.**  Writer prompt only suggested "1-2 if relevant" for news_analysis/deep_dive and "hero only" for breaking_news. Enrichment fallback only injected images for product articles. Fix: writer prompt now mandates 3-5 editorial image_sections for news/analysis and 2-3 for breaking_news. Planner prompt generates `editorial_sections` image queries. `enrichArticleWithImages()` injects editorial images for news/analysis/deep_dive articles when the writer doesn't include enough (uses content_section headings as search queries).
9. ~~**Duplicate Reddit threads in articles**~~ — **FIXED April 2026.** Reddit URLs vary (www vs non-www, trailing slashes, query params), bypassing exact-string dedup. Fix: `normalizeRedditUrl()` in `lib/brave-research.ts` strips www prefix, query params, hash, trailing slashes via URL API. Applied at 3 layers: source level (compileResearch seenUrls), extraction level (secondary seenThreadUrls), orchestrator level (post-compilation dedup). Also applied in remove-quote API to prevent re-introduction on dismiss.
10. ~~**Article slug fuzzy match returning wrong articles**~~ — **FIXED April 2026.** `getArticle()` had a fuzzy fallback (`ilike('slug', '${slug.slice(0,30)}%')`) that could match unrelated articles. Also, `.single()` errored on duplicate slugs. Fix: removed fuzzy fallback entirely, switched to `.maybeSingle()` with exact match + ordering. Applied to: `app/article/[slug]/page.tsx`, `app/article/[slug]/edit/page.tsx`, `app/api/articles/[id]/route.ts`, `app/api/og/[slug]/route.tsx`.
11. ~~**Private article metadata leaked in 404 responses**~~ — **FIXED April 2026.** `generateMetadata()` returned full title/description/OG data for private articles even when unauthenticated. Fix: added visibility gate check to `generateMetadata()` in `app/article/[slug]/page.tsx`.
12. ~~**Homepage shipped ~5.8 MB of JSONB to the browser**~~ — **FIXED September 2026.** Listing components took `ArticleRow`, so the full `article`/`plan`/`fact_check`/`suggestion_chips` for 200 articles were serialised into the RSC payload embedded in the initial HTML. Fix: `lib/article-card.ts` projects rows to `ArticleCardData` on the server. Measured 5.77 MB of row JSON → 441 KB rendered HTML.
13. ~~**Four listing components carried divergent copies of `TYPE_LABELS`**~~ — **FIXED September 2026.** All four were missing the four article types added in April 2026, so `ranked_list`, `myth_buster`, `timeline_article` and `visual_list` cards showed a de-underscored fallback label. Fix: one shared `TYPE_LABELS`/`typeLabel()` in `lib/article-card.ts`, covering all 14 types plus legacy.
14. **Google Analytics is blocked by our own CSP** — **OPEN, found September 2026.** `next.config.ts` `script-src` allows only `'self'`, Stripe and Vercel hosts, so the `@next/third-parties` GA tag (`G-FQJWVZ1TNG`) is refused by the browser on every page load. GA has collected nothing since the CSP shipped. Fix is one line — add `https://www.googletagmanager.com` to `script-src` and `https://*.google-analytics.com` to `connect-src` — but it widens the CSP, so it is a deliberate call, not a silent patch.
15. **All article generation down since 17 Aug 2026 — Anthropic API credit balance empty** — **ROOT CAUSE FOUND 18 Sep 2026; needs a billing top-up.** Every generation (user and daily cron) failed within ~1 second at the Haiku planning step with `400 Your credit balance is too low to access the Anthropic API`. Last successful article: 26 Jun 2026; every attempt since 22 Jul errored. It went unnoticed for a month because the create route logged it as `(unknown)`, recorded nothing on the row, and showed users "Something went wrong". **Code fix shipped:** `lib/provider-errors.ts` classifies account-level provider failures (empty credit, quota, rejected key); create, start-writing and the daily cron store `_error: 'provider_unavailable'` + `_error_detail`; the article page tells users it's temporarily unavailable and shows admins the exact cause. **Autopilot restored the same day:** `lib/anthropic-client.ts` wraps every Anthropic client so account-level failures replay the call on Gemini Flash (see CLAUDE.md § Anthropic → Gemini fallback). Verified end to end with the balance still empty: the daily cron produced a verified 14-section article with a hero image in 3m02s for 0.9¢. Topping up Anthropic restores Haiku/Sonnet quality; nothing else is needed.

---

## Confirmed NOT Built

Verified absent from codebase as of April 2026:

- ~~**Stripe / payment processing**~~ — **BUILT April 2026.** Full Stripe Checkout + webhooks + billing portal. See Tier System section.
- **Affiliate infrastructure** — no `affiliate_url` field, no link routing, no revenue tracking
- ~~**Category pages**~~ — **BUILT April 2026.** 12 category pages at `/category/[slug]` with SEO, pagination, sort.
- **Creator analytics dashboard** — not built (basic dashboard exists but no per-article analytics)
- **Referral system** — not built
- **Email capture / weekly digest** — not built
- **Trending questions dashboard** — not built (live data sources exist but no `/trending` page)
- ~~**Vision-based image selection**~~ — **BUILT May 2026.** Haiku 4.5 vision picks the best candidate in `lib/image-selector.ts`, falling back to `candidates[0]`. (OpenAI removed from this path Aug 2026.) This line previously contradicted the pipeline table above it.
- ~~**Canonical topic system**~~ — **PARTIALLY BUILT September 2026.** `lib/seo-canonical.ts` gives one indexable URL per intent via redirects/noindex/debris rules. What is still not built is the *forward* half: detecting at generation time that a new query duplicates an existing article's intent and offering the existing article instead of writing a second one.
- ~~**Creator status / badges**~~ — Founding Creator badge built (amber badge on author block + dashboard). Topic ownership badges not yet built.
- **Views-for-premium mechanic** — not built
- **Screenshot-proof branding** — not built
- ~~**Onboarding flow**~~ — **BUILT April 2026.** First-time user hero with example prompt cards, disappears after first article.
- ~~**Account deletion**~~ — **BUILT April 2026.** API route `POST /api/profile/delete` + settings page UI with inline confirmation. Sets articles to private, cleans up related tables, deletes profile, signs out.
- ~~**Sign-in gate terms acceptance**~~ — **BUILT April 2026.** "By signing in, you agree to our Terms of Service and Privacy Policy" line added below Google sign-in button in SignInGate.
- ~~**New article types**~~ — **BUILT April 2026.** ranked_list, myth_buster, timeline_article, visual_list added (14 types total). Full pipeline support: planning, blueprint, writing, rendering components, admin UI.
- **Inline text editing** — parked until after launch (click-to-edit paragraphs with "Edited — not verified" indicator)
- **Plan Mode Reshape button** — planned in Phase 1E (lightweight plan card on article page with quick-action pills for structured refine)
- **Scope pills re-research** — planned in Phase 1K (dashed-border pills with ↻ that trigger re-research pass, vs current filter-only pills)
- **Polymarket historical trend chart** — binary chart component is a placeholder; needs time-series data source (Phase 5C)
- **Reddit opportunity monitor** — planned in Phase 4G (admin tab, subreddit velocity detection, one-click generate)
- **Twitter/X account monitoring** — planned in Phase 4H (Twilert webhooks, Telegram bot alerts)
- **Entertainment/trending content strategy** — planned in Phase 4I (Google Trends 200%+ spike trigger)
- **One free article without signup** — parked for pre-launch marketing phase
- **API error handling sweep** — 20 routes missing try/catch, identified in health check (Maintenance M1)
- **Database index verification** — articles + profiles tables need index audit (Maintenance M2)
- **Admin env var consolidation** — 4 redundant vars to consolidate (Maintenance M3)
