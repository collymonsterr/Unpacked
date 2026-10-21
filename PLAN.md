# PLAN.md — Unpacked Forward Build Plan

Last updated: September 2026 (Build 8 — homepage payload projection + SEO canonicalisation shipped; docs reconciled against code)

---

## The North Star

We are not building an AI content tool. We are building a system that produces, ranks, and distributes the best answers to questions people already care about.

The single metric that matters: number of articles shared externally and discovered by new users.

---

## Key Decisions Already Made — Do Not Relitigate

**Architecture:**
- Gemini Flash is the primary writer. Sonnet is premium/fallback only. Never default to Sonnet.
- Triple fact-check (Gemini + Haiku + GPT-4o-mini) deliberately uses different models from the writer. Competitive moat.
- Brave Search condensed summary + entity cards + Haiku synthesis. 97% cost reduction vs raw page injection.
- Rate limiting in Supabase not in-memory (serverless compatibility).
- Google OAuth only for now. Email auth later.
- Blueprint pass before writing pass — already built.
- Editorial pass after writing — already built.
- Image routing by type (Pexels/Unsplash/Brave) — already built.
- Social content auto-generation — already built.

**Product:**
- Every article picks a winner. Banned phrases enforced via `lib/editorial-rules.ts`.
- Free tier: 3 articles per MONTH — monthly reset builds habit.
- Pricing: $12/month Standard (15 articles), $29/month Pro (60 articles).
- Affiliate via Skimlinks or impact.com — NOT direct Amazon Associates (UGC compliance).
- Creator affiliate share: start 20%, scale to 30-50% for Verified Creators with quality gates.
- Views mechanic: 2,000 views/month = 1 free month Standard, 5,000 = 1 free month Pro.
- Reddit strategy: genuine 90/10 participation — no VA spam.
- Visibility default: published for logged-in, unlisted for anonymous.

**Breaking news as flagship:**
- Polymarket odds + Reddit sentiment + stock impact + live data in one article.
- Under 3 minutes, fully shareable.
- 600 word max, forbidden components enforced, journalist structure.

---

## Immediate — Bug Fixes and Quick Wins — ALL DONE

~~All 6 items completed April 2026:~~ big statement/pull quote visual fix, Polymarket model update, editorial threshold alignment, author block, social links, one-click social copy.

---

## Phase 1 — Launch Foundation

Priority order. Each is one build session.

### ~~1A. Tier Infrastructure~~ DONE (April 2026)
Tier system (free/standard/pro), pricing page, tier enforcement in article creation, usage indicators, upgrade prompts, waitlist for paid tiers — all built. Share credits system built (1 credit per platform per article, max 4). Founding Creators programme built (100 spots, manual admin approval, +10 bonus credits/month, amber badge). **Stripe Checkout + webhooks wired (April 2026):** checkout session API, webhook handler (4 events), billing portal, pricing page updated with real subscribe buttons, upgrade toast on dashboard, manage billing in settings. Migration: `scripts/add-stripe-columns.sql`.

### ~~1B. Guided First-Article Onboarding~~ DONE (April 2026)
First-time users see onboarding hero with 6 example prompt cards (Tech, Finance, Health, Travel, Home, News). Clicking a card starts generation immediately. Disappears after first article. Simplified from original plan (no nudges, no forced review moment — just example cards).

### 1C. Creator Analytics Dashboard
Add to My Articles: views per article (7/30/all time), shares, traffic sources, projected affiliate earnings placeholder.

### 1D. Referral System
Unique referral link on signup. 3 free article credits per qualified referral. Track in Supabase. "Invite friends" prompt after first published article.

### 1E. Plan Mode "Reshape" Button
On the rendered article page, alongside the refine box, a "Reshape" button opens a lightweight version of the plan card. Shows what's currently in the article, what's in the research but wasn't used, and contextual quick-action pills ("Add 3 more products," "Expand comparison table," "Include Reddit sentiment," "Make it longer"). User clicks pills and hits "Rewrite" — triggers a refine pass with structured instructions. Reuses existing research findings and Editor's Notes infrastructure. No new API routes needed.

### ~~1F. New Article Types (4)~~ DONE (April 2026)
All 4 types built: ranked_list, myth_buster, timeline_article, visual_list. Full pipeline: type definitions in `article-types.ts`, planning prompt classification + rules, blueprint guidance, writing prompt tone/structure, new rendering components (`RankedItemSection.tsx`, `MythRealitySection.tsx`), admin UI type selector, entity extraction routing. Executive summary restrictions per type. Visual list: image-forward with empty analytical sections.

### 1G. Creator Profile Upgrade
Add to profiles table: tagline, avatar_url (upload, not just Google). Article page author block: 40px avatar, prominent name, bio line, links to profile.

### 1H. Voting System Enhancement *(partially done)*
Admin feedback tab upgraded: article titles from JSONB (fixes "Unknown" bug), clickable links, resolved toggle per item, unresolved-first sorting. Remaining: quality scoring per article, composite ranking signals (votes + dwell time + shares + recency).

### ~~1H-admin. Admin Dashboard Improvements~~ DONE (April 2026)
Overview: article count breakdown by visibility (Published/Unlisted/Private/Error), Content Health section (no-hero, unverified, zero-views, 7d/30d counts, avg word count). Articles: visibility filter, fact-check filter, sort by date/views/title. Costs: pipeline health cards (avg gen time, failed gens, avg cost — all 7-day window). Feedback: real article titles, resolved toggle.

### ~~1I. Research Companion Tab~~ ALREADY DONE
Built as "Editor" tab (EditorCoPilot). `research_findings` persisted as JSONB. Owner sees findings, entity cards, synthesis, blueprint. Can select findings and submit rewrite instructions.

### ~~1J. Plan Mode~~ DONE → UPGRADED to v7 (April 2026)
Full interactive editorial brief. 3 angle options with per-angle questions and scope pills (client-side swapping). Removable/addable findings, products, questions, sentiment. Community sentiment with active/reserve promotion. 2-column length/tone radio cards. "Casual" tone renamed to "Technical" across codebase. Structured editorial brief sent to blueprint. Auth required. 20/hr rate limit, doesn't consume article allowance.

### 1K. Plan Mode: Scope Pills Re-Research
Upgrade certain scope pills from filter-only to re-research. Dashed-border pills with ↻ indicator trigger a new planning + research pass with the constraint baked in (~15 seconds). Filter pills remain instant. Visual distinction between the two types already designed in v7 mockup. v7 has filter-only pills; this is the next evolution.

### ~~1L. Editor Bar~~ DONE (April 2026)
Persistent owner-only toolbar between article metadata and hero image. Six buttons: Sections, Images, Research (amber badge with unused findings count), Share, Export, Visibility (dropdown: Published/Unlisted/Private). Contextual helper text rotates based on article state. Mobile: icon-only. Replaced FirstDraftBanner, Editor's Notes nudge animation, and visibility pulse animation. Component: `components/ui/EditorBar.tsx`.

### 1M. Research Over-Gather
Increase Brave web searches from 6–10 to 12–15. Increase Reddit searches from 2–3 to 5–8. Extra cost: ~3 cents per article. The surplus research gets stored in `research_findings` JSONB and populates the Editor's Notes tab and section replacement suggestions. Ensures Editor's Notes always has meaningful content even after a good article. Also surface: contrarian viewpoints, alternative products, additional statistics, and related questions from the plan mode questions pool.

### ~~1O. Reddit Native Comments — real quotes~~ DONE (May 2026)
"What Reddit is saying" cards quoted Brave's truncated page-preview blurb instead of an actual comment — producing mid-sentence cutoffs, off-topic/wrong-product lines, sarcasm, and prospective-buyer questions. Now `lib/reddit-comments.ts` reads the real top-voted comments from each thread's public `.json` (no app/OAuth — the founder opted for zero-setup), and Haiku SELECTS the single best real comment per thread by index (rejecting sarcasm/jokes/questions/off-topic). The verbatim comment becomes the card quote with a `comment_url` permalink; sentiment is grounded in real comments. On by default (`REDDIT_NATIVE_API=off` to disable), Brave fragment as per-thread fallback. _(X/Twitter has the same Brave-snippet weakness but no free comment API — deferred as a separate decision.)_

### ~~1N. Post-Generation Education Banner~~ SUPERSEDED by Editor Bar (1L)
Editor Bar handles this — contextual helper text shows unused findings count and other nudges. No separate banner needed.

---

## Phase 2 — Image Pipeline Improvements

Image routing is built. These sessions improve selection quality.

### 2A. SerpAPI Google Images as primary source — ✅ DELIVERED (May 2026)
`lib/google-images.ts` makes Google Images (SerpAPI `engine=google_images`, reusing the existing `SERPAPI_KEY`) the first source for every article; stock libraries (Pexels/Unsplash) demoted to fallback. Chosen images rehosted to Supabase Storage (`lib/image-storage.ts`) for stable, hotlink-proof URLs. _(Wikimedia Commons not pursued — Google Images covers news/politics/science with far higher hit-rate; Google Shopping superseded by Google Images for products.)_

### 2B. Better, literal image query — ✅ DELIVERED (May 2026)
Query now leads with the **literal named subject** ("Claude Opus 4.8", "Carl Cox DJ") instead of an editorialized metaphor. Strengthened the rule in both the planner (`lib/claude.ts` `hero_image_query`) and the Haiku fallback (`generateHeroQuery`). _(Kept query generation in the planner rather than adding a separate post-blueprint photo-editor call — simpler, one fewer model hop.)_

### 2C. Vision Selection Model — ✅ DELIVERED (May 2026)
`lib/image-selector.ts` `selectBestImage()` sends candidate thumbnails to **Claude Haiku 4.5 vision** (primary; GPT-4o-mini fallback; `candidates[0]` final fallback) and picks the single best — rejecting corporate stock, staged scenes, off-subject crops, text/watermark overlays. Replaces "take the first regex-passing URL." Logged as `image_selection` in `api_usage_log`.

### 2E. Interactive Map Component
New `map_section` type in the article JSON schema. Renders an interactive map with custom markers, popups with data labels (e.g. "Strait of Hormuz — 20.9M barrels/day"), and Unpacked design system styling. Use Leaflet (free, open source) or Google Maps JavaScript API (free tier: 28,000 loads/month). Pipeline changes: planner detects geographic content and adds `map_data` field with locations/coordinates/labels. Writer includes `map_section` with array of points: `{ name, lat, lng, value, description }`. New `MapSection.tsx` component. Use cases: oil chokepoints, travel destination lists, "best cities" rankings, geopolitical articles, visual lists of places.

---

## Phase 2D — Media and Video Support

### ~~2D1. Video Embed Support~~ DONE (May 2026)
`video_embed` section type built. Renders 16:9 lazy-loaded iframe with click-to-play thumbnail. Accepts YouTube watch/youtu.be/embed/shorts URLs and Vimeo URLs. Component: `components/sections/VideoEmbed.tsx`. Wired into `SectionRenderer` and Gemini/Sonnet writer prompts. Schema validator updated.

### ~~2D2. Video Discovery in Research Phase~~ DONE (May 2026)
`video_queries` added to Haiku planner — emitted only for intrinsically video-based topics (best DJ sets, best speeches, music videos, ad campaigns). `lib/brave-video-search.ts` calls Brave `/videos/search` in parallel with web/Reddit/Twitter research. Returns YouTube/Vimeo URLs only. Findings passed to writer prompt with strict rule to copy URLs verbatim — never invent. Editor's Notes surfacing not yet built (out of scope for v1; videos auto-embedded by writer).

### 2D3. Editor's Notes Video Surfacing (deferred)
Surface unused video findings in the Editor tab so creators can manually embed additional videos post-generation. Persist `video_findings` to a new column on articles. Low priority — auto-embed during generation handles the main use case.

---

## Phase 3 — Writing Quality

Blueprint and editorial pass are built. These sessions push quality further.

### 3A. GPT-4o-mini A/B Test (conditional)
50-article blind comparison: current Gemini Flash vs GPT-4o-mini. Only proceed if results prove improvement. Don't change models on assumption.

### 3B. Engagement-Optimised Headlines
For every article (not just Plan Mode), the planning step generates 2–3 headline options using proven engagement patterns: numbered lists, curiosity gaps, contrarian framing, superlatives. User picks one in Plan Mode; direct generation uses the best-scoring option automatically. Applies to all article types. Separate from Plan Mode — could be shown in a quick headline picker after generation completes.

### 3C. Screenshot-Proof Visual Branding
Unpacked logo and creator attribution baked into verdict boxes, comparison cards, charts. Brand travels with every screenshot.

---

## Phase 4 — Growth Mechanics

### ~~4A. Category Pages~~ DONE (April 2026)
12 category pages at `/category/[slug]` with SEO metadata, sort (recent/popular/verified), pagination (12/page), Explore dropdown in navbar, "View all →" links from homepage, article page category label links to category page. All in sitemap.

### 4B. Trending Questions Dashboard
Surface at `/trending`: Google Trends (already have SerpAPI), Reddit hot posts, Polymarket volume spikes, internal most-searched. One-click generate from any trending question.

### 4C. Remix/Fork with Attribution
Fork any published article. Original creator gets attribution and 20% of future affiliate earnings. `forked_from_id` field on articles.

### 4D. Canonical Topic System — *backward half DONE (September 2026)*
**Done:** `lib/seo-canonical.ts` consolidates the duplicates that already exist — 21 permanent redirects, a noindex set, and debris patterns, wired into the article page, sitemap, homepage and category listings. One indexable URL per intent, no rows deleted.
**Remaining (the forward half):** before generation, check whether a new query duplicates an existing article's intent. Non-blocking warning with options to read, create a different angle, or update the existing one. Admin designates canonical per topic. Note that `lib/query-cache.ts` already does a similar-article lookup in the create route — start there rather than building a second mechanism.

### ~~4E. Creator Status and Badges~~ PARTIALLY DONE (April 2026)
~~Founder badge for first 100 users (is_founding_creator boolean, 10 credits/month, admin approval flow, `/founding-creators` page).~~ Remaining: Topic ownership badges, Verified Creator tier.

### 4F. Views-for-Premium Mechanic
Monthly view aggregation per creator. 2,000 views = 1 month Standard free, 5,000 = 1 month Pro. Monthly calculation job. Dashboard shows progress.

### 4G. Reddit Opportunity Monitor
Admin tab watching 40–60 curated subreddits across Unpacked's 12 categories. Detects rising threads by velocity not just total score. Haiku classifies thread type and generates 2–3 suggested article prompts. Alert shows subreddit, thread title, upvote velocity, suggested prompt, one-click generate. Refreshes every 15–30 minutes. Reddit API free tier sufficient.

### 4H. Twitter/X Account Monitoring
Watch list of accounts in admin. Polls via third-party service (Twilert ~$10–20/month) firing webhook to Unpacked. Haiku extracts topic and generates suggested article prompts. Telegram bot alert with tweet text, prompt suggestions, pre-fill buttons. Manual reply only, no automated posting.

### 4I. Entertainment/Trending Content Strategy
Google Trends 200%+ spike as automatic trigger for suggested articles. Builds on existing Google Trends integration. Complements Reddit opportunity monitor — different signal source, same one-click generate UX.

### ~~4J. Daily Automated Article~~ DONE (May 2026)
Vercel Cron (`vercel.json`, 7am Dublin) → `app/api/cron/daily-article` picks the day's most topical, non-politics subject (`lib/daily-topic.ts`: rotating beats → Brave discovery → Haiku selection, avoiding recent repeats) and runs the full production pipeline, publishing one fresh article per day attributed to the admin. Published by default; `DAILY_ARTICLE_VISIBILITY=unlisted` makes it a review queue. 20h double-run guard; `?force=1` for manual admin test runs. This is the unattended-publishing flywheel — different from the human-in-the-loop opportunity monitors (4G/4H/4I), which surface prompts for one-click manual generation.

### ~~4J. Tweet-to-Article URL Detection~~ DONE (April 2026)
Detect tweet/X URLs pasted into the search box. Extract tweet content via oEmbed API (free, no auth) with Brave Search fallback. Inject tweet text, author, and engagement stats as structured context before planning. Also handles Reddit URLs and general article URLs. Store source tweet data in `generation_options.source_tweet` for attribution display. SearchForm shows "Tweet detected" indicator. Article page shows "Inspired by @handle" attribution when generated from a tweet. Built as `lib/url-prefetch.ts` — URL detection + content fetching for tweets (oEmbed + Brave fallback), Reddit posts (existing `.json` pattern), and general URLs (Brave snippet).

---

## Phase 5 — Live Data Expansion

### ~~5A. Smart Decision Logic~~ DONE (April 2026)
Planning step now uses strict per-source criteria for when to request live data. Post-fetch quality filters discard low-volume Polymarket (<$500k), flat Google Trends (<50% change), and flat Yahoo Finance (<±0.5% move). Blueprint receives only filtered data. Max 2 sources per article (3 only when genuinely distinct). `live_data_rationale` field enforced.

### ~~5B. Live Data Visualisation~~ DONE (April 2026)
Four new components replacing flat rendering: Polymarket multi-outcome (sorted coloured bars), Polymarket binary (large probability + Yes/No split), Google Trends (Recharts AreaChart + stats), Yahoo Finance grid (2×2 ticker cards with sparklines). Polymarket binary chart placeholder ready for historical odds API. All use consistent card styling with source pills and fade-in transitions.

Polymarket, Yahoo Finance, and Google Trends are already built. These add more sources:

| Priority | Source | Use Case | Cost |
|----------|--------|----------|------|
| D4 | Rainforest API | Live Amazon pricing per product | ~$0.001/lookup |
| D5 | FRED | Federal Reserve economic data | Free |
| D6 | Numbeo | Cost of living for travel/location articles | TBD |
| D7 | OpenFDA | Adverse event data for health articles | Free |
| D8 | PubMed | Research citations for science articles | Free |
| D9 | GDELT | News coverage spread for breaking news | Free |

One session each. Test before adding next. All parallel during research phase.

### 5C. Polymarket Historical Trend Chart
The binary trend chart component is built as a placeholder in `LiveDataCard.tsx`. Needs a data source for historical odds time-series — the Polymarket API doesn't currently provide this. Options: investigate third-party aggregators, or implement daily snapshot caching to build the data over time. Low effort once a data source is identified.

### 5D. twitterapi.io for Real-Time X Results (DEFERRED — cost gate)
Current Twitter/X integration (built April 2026) uses Brave Search with `site:x.com` — free, zero new dependencies, but limited by Brave's crawl lag. Best-case freshness is `pd` (past 24h) as a soft filter, and fresh content (minutes to hours old) is often missing because Brave hasn't indexed it yet. Not good enough for true breaking news where reaction speed is the point.

**The upgrade path**: [twitterapi.io](https://twitterapi.io) is a pay-per-use wrapper around the X API that returns real-time search results without the $100/month X API Basic tier commitment. Pricing is usage-based — cents per search. Would give us minute-level freshness on reaction tweets.

**Why deferred**: cost. Not worth paying until breaking-news articles become a meaningful share of the generation mix or until a specific creator/use-case demands it. Current Brave-based integration is "good enough" for 80% of articles.

**When to revisit**:
- Breaking news becomes a core content vertical (not just occasional)
- A founding creator specifically needs real-time reaction content
- Monthly generation volume makes Brave's lag the bottleneck for a measurable % of articles

**Implementation sketch when unblocked**:
- Add `TWITTER_API_IO_KEY` env var
- New file `lib/data-sources/twitter-api-io.ts` with `fetchRecentTweets(query, sinceHours)` helper
- Modify `executeTwitterQueries()` in `lib/research-orchestrator.ts` to branch: when planner emits `freshness: "pd"` AND article_type is `breaking_news`, use twitterapi.io instead of Brave; otherwise keep Brave (free).
- Planner prompt gains a new freshness value `ph` (past hour) that only triggers the paid path.
- Add spend cap in `lib/api-usage.ts` to prevent runaway costs on a viral breaking-news storm.
- Keep all existing filtering (URL pattern match, snippet length, dedupe, max 8) — only the source changes.

Zero UI changes needed — `twitter_findings` schema is already compatible. The Haiku sentiment summary, ✕ removal, plan-mode surfacing all work unchanged.

---

## Phase 6 — Content and Launch

### Pre-launch cohort (no build required)
30 personalised DMs to newsletter writers, Substack creators, LinkedIn thought leaders. Offer: unlimited access 10 days, one published article + honest feedback. Goal: 20 active creators. Private Discord for cohort.

### Article curation sprint
Review all existing articles. Replace bad hero images. Verify opinionated verdicts. Pin best 5 as Featured, best 3 as Trending. Target: 20 articles worth showing anyone.

### Seed article generation
30–40 high-intent articles: buyer guides, current events, Dubai/expat angles (authentic founder location, low competition), finance decisions.

### Mobile end-to-end testing
Generate article on real phone. Read, share, use every feature. Fix what feels wrong.

---

## Phase 7 — Monetisation Activation

### 7A-pre. Skimlinks Integration (DEFERRED — months post-launch)
Add Skimlinks JavaScript snippet to `app/layout.tsx` once the site has meaningful traffic. Not a priority during early growth phase.

### 7A. Affiliate Infrastructure
`affiliate_url` field alongside `product_url`. Admin toggle routes buy buttons. Skimlinks or impact.com. Quality gate: 5 published articles + quality score + traffic threshold. Start at 20%.

### 7A.1. "Products Mentioned" Section
Surface purchasable entities at the bottom of ANY article type, not just buyer guides. Any article that mentions specific products, brands, or services should show them as clickable product cards in a "Products mentioned in this article" section before the CTA. Planner already extracts entity cards — filter for purchasable entities and surface them. Skimlinks converts the links automatically.

### 7A.2. Creator Product Additions
Let creators add their own product recommendations to any article type via the Editor Bar. "Add a product" button that accepts a product URL. Skimlinks converts it. Creators are incentivised to add products because they'll eventually earn affiliate revenue.

### 7A.3. Related Products from Research
After article generation, a secondary pass identifies contextually relevant products not directly discussed. An article about "best cities for digital nomads" could surface: portable monitors, travel insurance, international SIM cards, coworking memberships. Contextual, not spammy.

### 7B. Creator Revenue Dashboard
Real affiliate earnings per article. Must be trustworthy.

### 7C. Email Capture and Weekly Digest
Footer capture via Resend. Weekly "Best of Unpacked" (5–7 articles, curated by founder). Start manually, automate later.

---

## Phase 8 — Mobile App

### 8A. Capacitor Investigation
Check Next.js App Router compatibility, Supabase Google OAuth in webview, native plugins needed, App Store requirements.

### 8B. Capacitor Build
App Store and Google Play. Apple requires StoreKit for iOS subscriptions.

---

## Monetisation Strategy Notes

### Category Monetisation Tiers

- **High affiliate potential**: Tech (highest commissions, every article mentions products), Home (appliances, high AOV), Health (supplements, equipment, recurring), Finance (credit cards pay $50-200 per signup), Automotive (accessories, insurance)
- **Medium affiliate potential**: Travel (booking links, gear, insurance), Entertainment (streaming, gaming products)
- **Low direct affiliate but high traffic**: News, Culture, Science, AI — these drive traffic to the platform; monetise via reader-to-creator conversion and newsletter capture, not direct affiliate

### Affiliate Creator Outreach Strategy

Target niche site owners, Substack writers, and YouTube reviewers who publish product content. Found in r/juststart, r/Affiliatemarketing, r/blogging, and affiliate marketing Twitter. Pitch: "Your expertise, our infrastructure. Research in minutes, earn on every click." Don't say "AI writes for you" — say "we accelerate your research and handle formatting."

### Viral Content → Buyer Guide Funnel

Viral articles (myth busters, ranked lists, tweet-inspired) drive traffic. At the bottom, the CTA converts readers to creators. Those creators make buyer guides and comparisons that earn affiliate. The viral articles are the top of the funnel, not the monetisation point.

---

## Parked — Version 2 or Later

- Twitter/X auto-posting
- Global search (build at 500+ articles)
- Multilingual — Spanish/Portuguese first
- Inline text editing — click a paragraph in the rendered article, it becomes contentEditable, blue border appears, edit, save. Edited sections get a small "Edited — not verified" indicator. Structured component editing (product cards, tables) as a follow-up. Option B upgrade: re-run fact-check on edited sections to restore "Verified" status. Parked until after launch.
- Tags system
- White label / Enterprise
- Metered reading / verdict paywall
- API access for publishers
- Full tone matching from uploaded writing samples
- ~~New article types (ranked_list, myth_buster, visual_list, timeline)~~ → Phase 1F DONE
- Creator challenge / bounty — $500 prize pool for top creators in first 30 days. $250 for most external views, $150 for most signups driven, $100 wildcard editorial pick by founder. Anti-gaming: unique IP views only, referral signups must generate 1+ article, founder reserves disqualification rights. Parked until creator cohort is active.
- ~~Reddit opportunity monitor~~ → moved to Phase 4G
- ~~Twitter/X account monitoring~~ → moved to Phase 4H
- ~~Entertainment/trending content strategy~~ → moved to Phase 4I
- Pre-launch "one free article without signup" flow — allow one article generation without requiring Google OAuth. After the first article, require sign-in for subsequent articles. Parked — revisit for pre-launch marketing phase.

---

## Maintenance / Technical Debt

Items identified in health check. Not blocking launch but should be addressed.

### M1. API Error Handling Batch Fix
20 routes identified missing try/catch. Priority: article delete route (destructive action), article fetch route (user-facing), search route (user-facing). Remaining are mostly admin routes. One session to sweep all 20.

### M2. Database Index Verification
Verify indexes exist on: `articles.category`, `articles.visibility`, `articles.status`, `articles.user_id`, `articles.is_featured`, `articles.is_trending`, `articles.view_count`, `profiles.tier`, `profiles.is_founding_creator`, `rate_limits.key`. Run `\d articles` and `\d profiles` in Supabase SQL editor. Add missing indexes.

### M3. Admin Env Var Consolidation
Four env vars doing the same job: `NEXT_PUBLIC_ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_USER_ID`, `ADMIN_EMAIL`, `ADMIN_USER_ID`. Consolidate to one source of truth. Server-side routes should use server-only vars; client-side hook uses public var. Eliminate redundancy.

### M4. CommunityInsights Nested `<a>` Tag Bug
Reddit thread links in `CommunityInsights.tsx` wrap subreddit links, producing `<a>` inside `<a>` — invalid HTML that causes React hydration errors. Fix by restructuring the link hierarchy so subreddit link is a sibling, not a descendant. Pre-existing bug, visible in console on all article pages with Reddit content.

### M5. Loading Message Pacing
Loading messages exhaust at ~70 seconds but articles average ~188 seconds, leaving ~1.7 minutes of dead silence. Flat 5s interval, no adaptive pacing. Fix: implement graduated intervals (fast early, slow mid, long tail). File: `components/ArticleGenerating.tsx`. Highest-priority UX bug rescued from old TODO.md.

### M9. Database bloat from rewriting 97 KB rows ~10x per article — *suspected cause of the outages, Oct 2026*
Measured 21 Oct: image storage is **43 MB** (143 files) and all 360 articles are **34 MB** of logical JSON — under 100 MB total. The site is far too small to fill a disk legitimately, so the "disk space" diagnosis needs a different explanation.

The likely one: Postgres never edits in place, so every `UPDATE` writes a complete new row version. The average article row is **97 KB** (of which `research_findings` alone is **33 KB**), and the pipeline updates each article roughly ten times as it moves through planning → research → blueprint → writing → editorial → fact-check → social. That is **~1 MB of dead tuples per article**, ~350 MB of churn. If autovacuum falls behind on a small instance, the table bloats to many times its real size: disk fills with garbage and queries slow down because Postgres reads through dead copies.

**Unconfirmed** — bloat statistics need `pg_stat_user_tables`, which is not reachable through PostgREST. Confirm in the Supabase dashboard before acting.

If confirmed, two fixes:
1. **Stop storing `research_findings`** (33 KB/row, the single biggest column). It is raw Brave output, used during generation and never read afterwards — verify, then drop or truncate it on completion.
2. **Update the row fewer times.** Accumulate pipeline state and write once at the end rather than after every stage.

Related and still outstanding: `scripts/add-performance-indexes.sql` has never been run.

### M8. Google Analytics blocked by our own CSP — *found September 2026*
`next.config.ts` `script-src` allows only `'self'`, Stripe and Vercel hosts, so the `@next/third-parties` GA tag (`G-FQJWVZ1TNG`) is refused by the browser on every page load — confirmed in the console. GA has collected nothing since the CSP shipped. One-line fix (add `https://www.googletagmanager.com` to `script-src`, `https://*.google-analytics.com` to `connect-src`), but it widens the CSP, so it needs a deliberate yes rather than a silent patch. Alternative: drop GA entirely and rely on PostHog, which is already reverse-proxied through `/ingest` and therefore unaffected.

### M6. Set Provider Spending Caps
Set hard spending caps in Anthropic, OpenAI, and Google billing dashboards as last-line cost defence. Not yet confirmed done. No code change — operational task.

### M7. Remove Unused Vercel Env Vars
Three env vars confirmed unused and should be removed from Vercel: `GOOGLE_CUSTOM_SEARCH_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`, `FAL_API_KEY`. Operational task.

---

## Critical Path (updated April 2026)

1. ~~Bug fixes (immediate section) → quality baseline~~ DONE
2. ~~Author block + social links → profiles look good for outreach~~ DONE
3. ~~Onboarding flow → conversion~~ DONE
4. ~~Category pages → SEO foundation~~ DONE
5. ~~Plan Mode → user control over article direction~~ DONE
6. ~~Legal pages → compliance baseline~~ DONE
7. ~~Account deletion flow → GDPR compliance~~ DONE
8. ~~Stripe~~ DONE → monetisation foundation
9. ~~Tweet-to-article URL detection~~ DONE → content sourcing
10. **Seed article regeneration** → 20 curated showcase articles
12. **Mobile end-to-end testing** → verify all new features on phone
13. **Pre-launch creator cohort** → real feedback
14. **"Products Mentioned" section** → affiliate surface area on all article types
15. **Creator analytics dashboard** → retention

The product is feature-rich. The gaps are: affiliate activation (Skimlinks → immediate), content curation, distribution, and creator tooling (analytics, research over-gather).

---

## Session Count

| Phase | Sessions |
|-------|---------|
| Immediate | 6 (quick) |
| Phase 1 | 10 |
| Phase 2 | 4 |
| Phase 2D (Media) | 2 |
| Phase 3 | 3 |
| Phase 4 | 9 (4J done) |
| Phase 5 | 7 |
| Phase 6 | 4 |
| Phase 7 | 6 |
| Phase 8 | 2 |
| Maintenance | 4 |
| **Total** | **~57** |
