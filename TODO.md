# TODO.md — thebrief.fyi (currently The Brief)

Last updated: 24 March 2026

---

## 🔴 Immediate — Fix Before Anything Else

- [ ] **Loading message pacing** — HIGHEST PRIORITY UX BUG. Messages exhaust at ~70 seconds but articles average ~188 seconds. Flat 5s interval, ~17 messages, no adaptive pacing implemented. Results in 1.7+ minutes of dead silence. Fix: implement graduated intervals (fast early, slow mid, long tail). File: `components/ArticleGenerating.tsx`
- [ ] **Finalise new name and buy domain** — blocks all branding and marketing work. Frontrunner: thebrief.fyi
- [ ] **Set spending caps** in Anthropic, OpenAI, and Google billing dashboards — recommended as last-line cost defence, not yet confirmed done
- [ ] **Remove unused env vars from Vercel** — GOOGLE_CUSTOM_SEARCH_API_KEY, GOOGLE_CUSTOM_SEARCH_ENGINE_ID, FAL_API_KEY all confirmed unused

---

## 🟡 Before Launch

- [ ] **URL slug fix** — slugs currently generated from raw user query before AI produces a title. Should be AI-generated, topic-based, under 60 characters, with 301 redirects for existing articles. Prompt already written, not yet sent.
- [ ] **Progressive skeleton loading (Scenario A)** — `ArticleSkeleton.tsx` exists and works for direct-link load (Scenario B). The plan-aware progressive reveal during generation (sections appearing one by one as content arrives) is not built.
- [ ] **Profile photo upload** — settings page exists but upload not wired to Supabase Storage
- [ ] **Hero subtitle text** — pick and implement one of the discussed options. Current frontrunner: "Real research. Clear opinions. Beautiful articles — ready in minutes."
- [ ] **"Generate Article" → "Create Article"** button text change in SearchForm.tsx
- [ ] **About page rewrite** — reposition from AI tool to publishing platform, written for organic Reddit visitors
- [ ] **Creators page rewrite** — reframe to emphasise creator expertise and editorial judgment, not "the AI does everything"
- [ ] **Changelog page (/updates)** — public-facing page that renders CHANGELOG.md. Useful for credibility at launch. Claude Code should update CHANGELOG.md at the end of every session.
- [ ] **Verify view count increment** — `view_count` column exists, confirm increment logic is wired correctly for Most Popular section to work

---

## 🔵 Post-Launch

- [ ] Affiliate link integration — deferred until traffic exists. Every product card gets Amazon affiliate link with click tracking via /go/[article-id]/[product-id]
- [ ] Subscription tiers and usage limits — 3–5 free articles/month, then $9.99–15/month
- [ ] Creator revenue sharing dashboard — views, clicks, estimated earnings per article
- [ ] Trending Today automation — daily scheduler, generates 4 articles, tags automatically
- [ ] Trending Today archive page — paginated by date
- [ ] Tags system — Phase 1: data model + admin tagging. Phase 2: frontend display and browsing
- [ ] Proper PDF export — revisit jsPDF or server-side alternative. Current export is browser print-to-PDF placeholder
- [ ] Weekly email digest — identified as highest-leverage retention tool
- [ ] Roundup / News digest article type — new type for "what happened in X this week" queries
- [ ] Section regeneration — hover section, popup asks what to change, rewrites that section only
- [ ] Shareable calculator link — pre-filled calculator state as URL parameter
- [ ] Global search — when article volume justifies it
- [ ] Collections — let users group articles ("My home studio setup")
- [ ] Topic / SEO landing pages — auto-generated category pages
- [ ] Apple Sign In — worth adding if native iOS app is built

---

## ✅ Done

- [x] Architecture switch — Gemini Flash + Brave ($0.02/article), Sonnet kept as premium fallback
- [x] Cost controls — api_usage_log, duplicate call guard, query caching, concurrency limiter
- [x] Article classification engine — 7 types, Required/Allowed/Forbidden rules, forbidden_components enforced
- [x] Homepage four-section redesign — Featured, Trending Today, Most Popular, Recent Articles
- [x] Featured hero card — card_summary, trophy icon, Verified badge, author row
- [x] Card summary auto-generation via Haiku when article is featured
- [x] Article bottom section redesign — feedback, refine input, chips, share/export, related articles
- [x] Recent Articles history — localStorage, nav dropdown, /recent page
- [x] Generation recovery — pendingArticleId localStorage, Page Visibility API, 3-minute timeout
- [x] Skeleton loader — ArticleSkeleton.tsx, Scenario B (direct link) working
- [x] Logged-in vs logged-out homepage — personalised heading, feature cards hidden for returning users
- [x] Nav menu — avatar dropdown with My Articles, Saved Articles, Recent Articles, Settings, Sign out
- [x] Admin toggles — Featured, Trending, Hero pin, Hide, Delete, Reorder
- [x] "Verified" badge and label — green shield, confirmed reverted from "Fact-checked"
- [x] Rate limiting — 10 creates/hour, 20 refines/hour, Supabase-backed
- [x] Google OAuth — Supabase Auth, one-click sign-in
- [x] Writing system prompt trimmed — 6,000 tokens → 2,500 tokens
- [x] JSON schema validation — 2 retries, auto-fallback to Sonnet on failure
- [x] Calculator cleanup — all 9 problematic calculators removed or replaced, zero custom remaining

### Added March 25 2026
- [ ] **Post-generation first draft banner** with action chips that pre-fill the refine box (Stage 2)
- [ ] **Post-submit prompt refinement interstitial** for short or vague queries (Stage 2)
- [ ] **Inline text editing** for article headings and paragraph text — post-launch
