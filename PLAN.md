# PLAN.md — Unpacked Forward Build Plan

Last updated: April 2026 (after full codebase audit)

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
Tier system (free/standard/pro), pricing page, tier enforcement in article creation, usage indicators, upgrade prompts, waitlist for paid tiers — all built. Share credits system built (1 credit per platform per article, max 4). Founding Creators programme built (100 spots, manual admin approval, +10 bonus credits/month, amber badge). **Remaining: Stripe checkout + webhooks to activate paid tiers.** When Stripe credentials are added, wire checkout to upgrade_waitlist → profiles.tier update.

### ~~1B. Guided First-Article Onboarding~~ DONE (April 2026)
First-time users see onboarding hero with 6 example prompt cards (Tech, Finance, Health, Travel, Home, News). Clicking a card starts generation immediately. Disappears after first article. Simplified from original plan (no nudges, no forced review moment — just example cards).

### 1C. Creator Analytics Dashboard
Add to My Articles: views per article (7/30/all time), shares, traffic sources, projected affiliate earnings placeholder.

### 1D. Referral System
Unique referral link on signup. 3 free article credits per qualified referral. Track in Supabase. "Invite friends" prompt after first published article.

### 1E. Plan Mode "Reshape" Button
On the rendered article page, alongside the refine box, a "Reshape" button opens a lightweight version of the plan card. Shows what's currently in the article, what's in the research but wasn't used, and contextual quick-action pills ("Add 3 more products," "Expand comparison table," "Include Reddit sentiment," "Make it longer"). User clicks pills and hits "Rewrite" — triggers a refine pass with structured instructions. Reuses existing research findings and Editor's Notes infrastructure. No new API routes needed.

### 1F. New Article Types (4)
Add 4 new types to `lib/article-types.ts` (currently 10, becomes 14):

- **ranked_list** — numbered ranking from worst to best, backed by evidence, picks a clear winner. Highly shareable because people disagree with rankings.
- **myth_buster** — takes common beliefs and debunks them with evidence. Each myth stated boldly then dismantled. Shares well because people want to prove they knew better.
- **timeline** — chronological entries with dates and narrative. Needs a new visual timeline component with vertical line and date markers. Good for company histories, technology evolution, political situations.
- **visual_list / photo_essay** — image-first, story-second, repeated N times. Pipeline searches for images per list item. Only works for topics where stock/free images are available (architecture, food, landscapes, products, workspaces, bridges, markets, coastlines). Not suitable for specific historical events, copyrighted artworks, movie/TV content, or editorial photography requiring specific images. Rule of thumb: if any good photo of the subject works, stock APIs can handle it.

Each needs: requiredComponents, allowedComponents, forbiddenComponents, lengthRange, tone, verdictRequired, verdictStyle. Planning prompt and blueprint prompt need type-aware instructions.

**Photo essay / visual list content guidelines:** Topics that work well: architecture, food, national parks, landscapes, products, workspaces, bridges, street markets, coastlines. Topics that don't work: specific historical events (need editorial photography), copyrighted artworks, movie/TV screenshots, specific people or news moments. Rule of thumb: if any good photo of the subject works, stock APIs can handle it. If it needs to be *that specific image*, it won't be available.

### 1G. Creator Profile Upgrade
Add to profiles table: tagline, avatar_url (upload, not just Google). Article page author block: 40px avatar, prominent name, bio line, links to profile.

### 1H. Voting System Enhancement
Admin view of downvote reasons and comments. Quality scoring per article. Composite ranking signals (votes + dwell time + shares + recency).

### ~~1I. Research Companion Tab~~ ALREADY DONE
Built as "Editor" tab (EditorCoPilot). `research_findings` persisted as JSONB. Owner sees findings, entity cards, synthesis, blueprint. Can select findings and submit rewrite instructions.

### ~~1J. Plan Mode~~ DONE → UPGRADED to v7 (April 2026)
Full interactive editorial brief. 3 angle options with per-angle questions and scope pills (client-side swapping). Removable/addable findings, products, questions, sentiment. Community sentiment with active/reserve promotion. 2-column length/tone radio cards. "Casual" tone renamed to "Technical" across codebase. Structured editorial brief sent to blueprint. Auth required. 20/hr rate limit, doesn't consume article allowance.

### 1K. Plan Mode: Scope Pills Re-Research
Upgrade certain scope pills from filter-only to re-research. Dashed-border pills with ↻ indicator trigger a new planning + research pass with the constraint baked in (~15 seconds). Filter pills remain instant. Visual distinction between the two types already designed in v7 mockup. v7 has filter-only pills; this is the next evolution.

### 1L. Editor Bar
Persistent toolbar between article header and first section, visible to article owner only. Replaces First Draft Banner, Editor's Notes nudge, and visibility pulse — one unified control surface. Contains:
- **Sections** — hover shows education tooltip ("Hover any section to edit or replace"), click scrolls to refine box
- **Images** — upload/manage hero and section images
- **Research** — badge count of unused findings, opens Editor's Notes tab
- **Share** — opens SharePanel
- **Export** — PDF/CMS export
- **Visibility** — current status pill (Published/Unlisted/Private), click to change

One line of contextual helper text below that changes based on user actions (e.g. "You have 12 unused research findings → Editor's Notes"). On mobile: labels hide, icons only. Replaces the post-generation education banner if built first.

### 1M. Research Over-Gather
Increase Brave web searches from 6–10 to 12–15. Increase Reddit searches from 2–3 to 5–8. Extra cost: ~3 cents per article. The surplus research gets stored in `research_findings` JSONB and populates the Editor's Notes tab and section replacement suggestions. Ensures Editor's Notes always has meaningful content even after a good article. Also surface: contrarian viewpoints, alternative products, additional statistics, and related questions from the plan mode questions pool.

### 1N. Post-Generation Education Banner
Slim banner between article header and first section: "12 unused findings, 3 videos, and 4 alternative products available in Editor's Notes →". One line, muted, dismissible, shows once per article. Superseded by the Editor Bar (1L) — build whichever comes first. If Editor Bar is built, this is unnecessary.

---

## Phase 2 — Image Pipeline Improvements

Image routing is built. These sessions improve selection quality.

### 2A. Wikimedia Commons + SerpAPI Product Images
Wikimedia for news/politics/science. SerpAPI Google Shopping for products (brand + exact model + identifiers).

### 2B. AI Photo Editor Step
After blueprint: cheap model call generates context-aware image query and image_mode. Hard rules: finance → real-world/metaphor, health → human/clinical, products → never abstract. Remove hero query from planning step.

### 2C. Vision Selection Model
GPT-4o-mini vision evaluates 4–6 candidates. Reject: corporate stock, staged scenes, irrelevant imagery, text overlays. ~$0.005/article added.

---

## Phase 2D — Media and Video Support

### 2D1. Video Embed Support
New `video_embed` block type in the article JSON schema. Renders as a responsive 16:9 iframe. Supports YouTube and Vimeo URLs. Two entry points: paste a URL in the refine box with placement instructions, or select from videos surfaced in Editor's Notes. Needs `video_embed` added to `ArticleSection` union type, a `VideoEmbed` component in `components/sections/`, and a case in `SectionRenderer.tsx`.

### 2D2. Video Discovery in Research Phase
Add `video_queries` field to the Haiku planner (1–2 queries targeting video content). Use Brave's `/videos/search` endpoint during parallel research. Filter: minimum 10,000 views, published within 12 months, YouTube/Vimeo only. Surface found videos in Editor's Notes as "Related videos" section with thumbnail, title, view count, channel name. User clicks "Include" to embed. Don't auto-embed — user-initiated only.

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

### 4D. Canonical Topic System
Before generation: check for similar existing articles. Non-blocking warning with options to read, create different angle, or update existing. Admin designates canonical per topic.

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

### 7A. Affiliate Infrastructure
`affiliate_url` field alongside `product_url`. Admin toggle routes buy buttons. Skimlinks or impact.com. Quality gate: 5 published articles + quality score + traffic threshold. Start at 20%.

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
- ~~New article types (ranked_list, myth_buster, visual_list, timeline)~~ → moved to Phase 1F
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

---

## Critical Path (updated April 2026)

1. ~~Bug fixes (immediate section) → quality baseline~~ DONE
2. ~~Author block + social links → profiles look good for outreach~~ DONE
3. ~~Onboarding flow → conversion~~ DONE
4. ~~Category pages → SEO foundation~~ DONE
5. ~~Plan Mode → user control over article direction~~ DONE
6. ~~Legal pages → compliance baseline~~ DONE
7. ~~Account deletion flow → GDPR compliance~~ DONE
8. **Stripe** → monetisation foundation
9. **Seed article regeneration** → 20 curated showcase articles
10. **Mobile end-to-end testing** → verify all new features on phone
11. **Pre-launch creator cohort** → real feedback
12. **Affiliate infrastructure** → revenue

The product is feature-rich. The gaps are: monetisation (Stripe + affiliates), content curation, distribution, and creator tooling (Editor Bar, analytics, research over-gather).

---

## Session Count

| Phase | Sessions |
|-------|---------|
| Immediate | 6 (quick) |
| Phase 1 | 13 |
| Phase 2 | 3 |
| Phase 2D (Media) | 2 |
| Phase 3 | 3 |
| Phase 4 | 9 |
| Phase 5 | 7 |
| Phase 6 | 4 |
| Phase 7 | 3 |
| Phase 8 | 2 |
| Maintenance | 4 |
| **Total** | **~56** |
