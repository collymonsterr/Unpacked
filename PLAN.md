# Unpacked — Forward Build Plan
## Last updated: March 2026

### The North Star
We are not building an AI content tool. We are building a system that produces, ranks, and distributes the best answers to questions people already care about.

The single metric that matters: number of articles shared externally and discovered by new users.

---

### Key Decisions Already Made — Do Not Relitigate

**Architecture:**
- Gemini Flash is the primary writer. Sonnet is premium/fallback only. Never default to Sonnet.
- Fact-checking deliberately uses a different model from the writer — prevents self-reinforcing errors. This is a competitive moat.
- Brave Search condensed summary approach — not raw page injection. 97% cost reduction. Protect this.
- Rate limiting in Supabase not in-memory (serverless compatibility)
- Google OAuth only for now. Email auth later.

**Product:**
- Every article picks a winner. Banned phrases: "it depends," "both are excellent," "ultimately"
- Free tier: 3 articles per MONTH — monthly reset builds habit
- Pricing: $12/month Standard (15 articles), $29/month Pro (60 articles)
- Affiliate via Skimlinks or impact.com — NOT direct Amazon Associates (UGC compliance)
- Creator affiliate share: start 20%, scale to 30-50% for Verified Creators with quality gates
- Views mechanic: premium TIME — 2,000 views/month = 1 free month Standard, 5,000 = 1 free month Pro
- Reddit strategy: genuine 90/10 participation — no VA spam
- Visibility default: private for logged-in, unlisted for anonymous

**Image sourcing (agreed, not yet built):**
- Replace all Brave image searches with routed system by image type
- Hero: Pexels (lifestyle/travel/health/culture) → Unsplash fallback
- News/politics/science: Wikimedia Commons
- Products: SerpAPI Google Shopping → manufacturer site → eBay fallback
- AI Photo Editor step after blueprint: cheap model call generates context-aware query
- Vision selection: GPT-4o-mini vision evaluates 4-6 candidates, rejects bad ones
- Remove hero query from planning step entirely
- Bing deprecated — do not use. Amazon PAAPI deprecated — do not use.

**Pipeline overhaul (agreed, not yet built):**
- Two-pass writing: Blueprint pass then Prose pass
- Tiny editor pass: Flash-Lite scores and rewrites weak sections only
- Entity cards replacing flat condensed research summary
- Synthesis object replacing current summary
- Evergreen vs fresh research modes
- GPT-4o-mini A/B test for writing — only after testing proves improvement
- All parallel with Promise.all

**Growth mechanics (agreed, not yet built):**
- One-click social repurposing: X thread, LinkedIn post, Reddit summary, shareable image cards
- Screenshot-proof branding baked into all visual components
- Remix/Fork with 20% affiliate revenue share to original creator
- Canonical topic system: one canonical article per topic
- Trending questions dashboard: Google Trends + Reddit + Polymarket
- Creator Recommendation Network: recommend others' articles for affiliate share
- Embed with affiliate co-op: bloggers keep 100% of embed affiliate clicks

**Breaking news as flagship:**
- Polymarket odds + Reddit sentiment + stock impact + FRED data in one article
- Under 3 minutes, fully shareable
- 600 word max, forbidden components enforced, journalist structure
- No product cards, no buyer guide sections

---

### Immediate — Do Before Major Architecture Work

**1. Verify Gemini fallback fix**
Generate 3 test articles. Check admin Costs tab. Should be near zero after JSON sanitisation fix.

**2. Author block prominence**
File: `components/ArticleView.tsx` lines 256-291
- Avatar: 20×20px → 40px
- Name: muted text-sm → font-weight 500, text-primary, 15px
- Add bio first line below name
- Must be impossible to miss

**3. Social links on creator profile**
- Add twitter_url and linkedin_url to profiles table
- Add to settings page
- Show as icon links on public profile page

**4. Sign-in gate with popup OAuth (Opus only — complex)**
- Generation starts for everyone
- After 8-10 seconds: show live research preview (real snippets appearing)
- Then overlay: sign in to save and publish
- Must use popup OAuth not redirect — preserves generation state
- POST /api/articles/[id]/claim route to attach article to account
- If dismissed: continues as unlisted/anonymous

---

### Phase 1 — Launch Foundation

**Session 1A — One-click social repurposing (HIGHEST PRIORITY)**
Auto-generate per published article: X thread (verdict hook + 3 key data points), LinkedIn post (insight-led), Reddit-optimised summary, 1-3 shareable image cards. One click to copy or post. "Created with Unpacked • [Creator name]" on all outputs.

**Session 1B — Screenshot-proof visual branding**
Unpacked logo and creator attribution baked into verdict boxes, comparison cards, charts. Brand travels with every screenshot.

**Session 1C — Guided first-article onboarding flow**
After signup: example prompts → generation → forced review moment → one-click share with pre-written assets. Track publish-and-share completion rate as primary conversion metric.

**Session 1D — Tone selector + prompt builder**
Dropdown: Editorial (default), Conversational, Punchy, Technical, Casual, Professional. Each injects a short instruction into writing prompt. Same session: tooltip after 3+ chars typed, "Improve this prompt" Haiku chip rewrites query into 3 better versions.

**Session 1E — Stripe integration**
Free (3/month), Standard $12/month (15 articles), Pro $29/month (60 articles). Article generation checks tier and allowance. Clear upgrade prompt when limit hit. Note: iOS App Store requires StoreKit separately — Stripe alone does not satisfy App Store review.

**Session 1F — Creator analytics dashboard**
Add to My Articles: views per article (7/30/all time), shares, traffic sources, projected affiliate earnings placeholder.

**Session 1G — Referral system**
Unique referral link on signup. 3 free article credits per qualified referral. Track in Supabase. "Invite friends" prompt after first published article.

**Session 1H — Creator profile upgrade**
- Add to profiles table: tagline, avatar_url, twitter_url, linkedin_url
- Author page: stats bar, featured article hero card, topic badges, external links
- Article page author block: 40px avatar, prominent name, bio line, links to profile

**Session 1I — Voting system enhancement**
Current voting is built. Phase 1 adds: admin view of downvote reasons and comments, quality scoring per article, composite ranking signals (votes + dwell time + shares + recency).

**Session 1J — Research Companion tab**
Second tab on article page (owner only initially) showing all research gathered but not included in the article. Each finding card shows source type, content, why not included, link to source. Creator selects findings to incorporate, adds optional instructions, submits to trigger refine pass. Undo available after submission. Technical dependency: research findings must be stored as JSONB on article record — currently discarded after writing. Add `research_findings` field to articles table. Note: Phase 2 entity cards will dramatically improve this feature automatically — Phase 1 version uses current research format.

---

### Phase 2 — Pipeline Overhaul

Run sessions in order. High risk — use investigate-plan-approve-code strictly.

**Session 2A — Image router + Pexels/Unsplash**
Routing logic first (image type classification in planning output), then Pexels primary / Unsplash fallback for editorial heroes.

**Session 2B — Wikimedia Commons + SerpAPI product images**
Wikimedia for news/politics/science. SerpAPI Google Shopping for products (normalize: brand + exact model + identifiers).

**Session 2C — AI Photo Editor step**
After blueprint (not during planning): Flash-Lite call reads article type, category, thesis, winner, outputs context-aware query and image_mode. Hard rules: finance → real-world/metaphor, health → human/clinical, products → never abstract. Remove hero query from planning step.

**Session 2D — Vision selection model**
GPT-4o-mini vision evaluates 4-6 candidates. Reject: corporate stock, staged scenes, irrelevant imagery, text overlays. Returns winning index. Adds ~$0.005/article.

**Session 2E — Two-pass writing + prompt improvements**
Blueprint pass (thesis, winner, 5-8 claims, section skeleton, evidence requirements, what-not-to-say rules) then Prose pass. Add editorial contract rubric and forbidden phrases. No model switch yet.

**Session 2F — Tiny editor pass**
Flash-Lite after draft: scores hedging, clichés, filler, weak verdict, AI-tell phrases. Rewrites only flagged sections. Max 15 seconds added.

**Session 2G — GPT-4o-mini A/B test (conditional)**
Only if 2E and 2F haven't fixed quality. 50-article blind comparison. Results decide.

**Session 2H — Entity cards + extraction**
Replace flat condensed summary with structured entity cards: canonical name, aliases, type, 3-5 facts, sources, confidence, conflicts, freshness, product fields, image query. All parallel with Promise.all. This also upgrades Research Companion tab automatically.

**Session 2I — Synthesis object + research modes**
Synthesis object: comparison axes, strongest arguments, likely winner, caveats, community sentiment. Evergreen mode (buyer guides, explainers) vs fresh mode (news, trends).

---

### Phase 3 — Growth Mechanics

**Session 3A — Trending questions dashboard**
Surface at /trending: Google Trends via SerpAPI, Reddit hot posts, Polymarket volume spikes, internal most-searched. One-click generate from any trending question.

**Session 3B — Remix/Fork with attribution**
Fork any published article. Original creator gets attribution and 20% of future affiliate earnings. forked_from_id field on articles table.

**Session 3C — Canonical topic system**
Before generation: check for similar existing articles. Non-blocking warning with options to read, create different angle, or update existing. Admin designates canonical per topic.

**Session 3D — Creator status and badges**
Topic ownership badges, Verified Creator tier, Founder badge for first 100 users (is_founder boolean, 10 credits/month forever), Claim Your Topic mechanic.

**Session 3E — Views-for-premium mechanic**
Monthly view aggregation per creator. 2,000 views = 1 month Standard free, 5,000 = 1 month Pro. 3 qualified referrals = 1 month Standard. Monthly calculation job. Creator dashboard shows progress.

---

### Phase 4 — Live Data Integrations

One session each. Priority order. Test before adding next. All parallel during research phase.

**D1 — Polymarket** — prediction odds for news/politics. Free API. Stat card.
**D2 — Yahoo Finance** — stock impact for news articles. Percentage change stat cards.
**D3 — Google Trends via SerpAPI** — search interest over 12 months. Already paying for SerpAPI.
**D4 — Rainforest API** — live Amazon pricing per product. ~$0.001/lookup. "Current price: £X on Amazon."
**D5 — FRED** — Federal Reserve economic data. Free. Finance and economics articles.
**D6 — Numbeo** — cost of living. Travel and location articles.
**D7 — OpenFDA** — adverse event data. Health articles.
**D8 — PubMed** — research citations. Science articles.
**D9 — GDELT** — news coverage spread. Breaking news articles.

---

### Phase 5 — Content and Launch

**Pre-launch cohort (start now — no build required)**
30 personalised LinkedIn/X DMs to newsletter writers, Substack creators, LinkedIn thought leaders. Offer: unlimited access 10 days, one published article + honest feedback. Goal: 20 active creators who have published and shared before public launch. Private Discord for cohort.

**Article curation sprint**
Review all existing articles. Replace bad hero images. Verify opinionated verdicts. Pin best 5 as Featured, best 3 as Trending. Target: 20 articles worth showing anyone.

**Seed article generation**
30-40 high-intent articles using improved pipeline: buyer guides (headphones, laptops, cameras, standing desks), current events explainers, Dubai/expat angles (cost of living, remote work visas — authentic founder location, low competition), finance decisions.

**Mobile end-to-end testing**
Generate article on real phone. Read, share, use every feature. Fix what feels wrong.

---

### Phase 6 — Discovery and Scale

**Session 6A — 12 category pages**
Tech, Finance, Health, Travel, Home, Entertainment, Science, Business, Automotive, Culture, News, AI. SEO-optimised metadata per category.

**Session 6B — Homepage redesign**
After categories exist and 40+ quality articles seeded.

**Session 6C — Bounty Board**
Admin posts high-value topics with credit reward for first quality article published. Directs creators toward SEO-valuable content.

**Session 6D — 60 seed articles**
5 per category. Generate with improved pipeline after Phase 2. Base for category pages.

---

### Phase 7 — Monetisation Activation

**Session 7A — Affiliate infrastructure**
Toggle system: affiliate_url field alongside product_url. Admin toggle routes buy buttons. Use Skimlinks or impact.com. Quality gate before creator share: 5 published articles + quality score + traffic threshold. Start at 20%.

**Session 7B — Creator revenue dashboard**
Real affiliate earnings per article. Must be trustworthy.

**Session 7C — Email capture and weekly digest**
Footer capture via Resend. Weekly Best of Unpacked (5-7 articles, curated by founder). Start manually, automate later.

---

### Phase 8 — Mobile

**Session 8A — Capacitor investigation**
Check Next.js App Router compatibility, Supabase Google OAuth in webview, native plugins needed, App Store requirements. Estimate before building.

**Session 8B — Capacitor build**
App Store and Google Play. Note: Apple requires StoreKit for iOS subscriptions.

---

### Parked — Version 2 or Later

- Twitter/X auto-posting
- Global search (build at 500+ articles)
- Multilingual — Spanish/Portuguese first
- Inline text editing
- Tags system
- White label / Enterprise
- Metered reading / verdict paywall
- API access for publishers
- Full tone matching from uploaded writing samples or Substack analysis

---

### Session Count

| Phase | Sessions |
|-------|---------|
| Immediate | 4 |
| Phase 1 | 10 |
| Phase 2 | 9 |
| Phase 3 | 5 |
| Phase 4 | 9 |
| Phase 5 | 3 |
| Phase 6 | 4 |
| Phase 7 | 3 |
| Phase 8 | 2 |
| **Total** | **~49** |

---

### Critical Path

1. Sign-in gate → every article needs an owner before creator outreach
2. Author block + social links → profiles need to look good before outreach
3. Image pipeline → showcase articles need good images
4. Writing improvements → showcase articles need strong editorial voice
5. 20 curated showcase articles → Product Hunt needs content
6. Pre-launch creator cohort → real feedback before public launch

The product is ready enough to start creator outreach now. Start the Discord and LinkedIn DMs this week.
