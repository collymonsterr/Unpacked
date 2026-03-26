# CHANGELOG.md — findings.fyi (currently Unpacked)

A running log of what has been built, changed, and fixed. Updated at the end of every session.

---

## 25 March 2026 — Name change, FirstDraftBanner, image fixes, loading overhaul

### Name Change
- Renamed from ArticleAI to Unpacked across entire codebase — all meta tags, OG data, JSON-LD, manifest, export branding, about page, creators page, footer, logo text updated
- Domain references changed to unpacked.fyi

### FirstDraftBanner (new feature)
- Post-generation editing prompt that slides up from bottom 2.5s after article reveals
- Shows corrections count from fact-check, source count, 4 action chips
- Action chips pre-fill the refine textarea and scroll to it with amber glow highlight
- "Looks good — share it" and "Start editing →" buttons
- Dismisses to small floating "✍️ Edit this article" pill bottom-right
- Owner-only — never shown to readers visiting shared articles

### Image System Improvements
- Entity search queries: removed "official product photo" suffix, replaced with context-aware queries by product type (physical products, software, services, places, concepts)
- Added product_category field to planning entities for better image relevance
- Hero image grid picker: 2×2 overlay, Search Again button, click to select and save
- Image enrichment minimums: retry search for product cards with <4 images, inject editorial images for product articles missing them

### Loading Experience Overhaul
- Phase 1 (homepage): static header "Building your article — go grab a coffee ☕", stacking messages every 5s, polls for status change before navigating
- Phase 2 (article page): article-type-aware messages (buyer_guide, comparison, explainer, news, etc.) at 15s intervals, long-tail messages after sequence completes
- Article-type-aware subtitle under title during generation
- Timeout pushed to 4 minutes with softer "Still working on this one..." messaging
- Hero image preservation — polling updates never overwrite existing hero image with null

### Product Cards
- Richer descriptions: 3-paragraph format (standout features, real-world performance, honest caveats)
- Category-aware spec fields per product type (headphones, cameras, laptops, etc.)
- Real links from research sources passed to writing model

### Refine Pipeline
- Switched from Claude Sonnet ($0.30-0.50) to Gemini Flash ($0.02) with Sonnet fallback

### Slug Migration
- Rewrote lib/slug.ts with aggressive stop word removal, protected compound phrases, 60-char max
- Migrated all 92 existing articles to clean AI-title-based slugs
- New articles generate slug from plan.title, not raw query

### Other
- TrustStrip component added between masthead and featured section
- Creator CTA line below suggestion chips
- Article-type-aware loading subtitles for Phase 2
- Removed "View all →" links from homepage sections
- Recent Articles sort changed to newest-first (removed pinned/sort_order influence)

---

## 24 March 2026 — Major refactor and feature build sprint

### Architecture (biggest change)
- Switched default article generation from Claude Sonnet + web search tool ($1.10/article) to Gemini 2.5 Flash + Brave pre-research ($0.02/article) — 97% cost reduction
- Created `lib/brave-research.ts` — runs 4–10 Brave searches before writing, extracts structured research summary
- Created `lib/gemini-writer.ts` — Gemini 2.5 Flash generates full article JSON from pre-researched content
- Sonnet + Brave (no web search tool) kept as fallback for deep dive articles and Gemini failures
- Added JSON schema validation with 2 retries, auto-fallback to Sonnet on failure
- Added concurrency limiter (default 3 concurrent generations)
- Trimmed writing system prompt from ~6,000 to ~2,500 tokens
- Removed Claude web search tool from all writing and refinement calls

### Cost Controls
- Added `api_usage_log` table — logs every Anthropic/Gemini API call with token counts
- Added duplicate call guard — prevents same article ID triggering same API call type within 5 minutes
- Added query caching — checks for similar existing articles before generating, shows "We recently wrote this" with option to generate fresh
- Deleted 2 unused Anthropic API keys (ArtcileAI2, Unpacked3)

### Homepage Redesign
- Four-section homepage: Featured (1 hero + 4 cards), Trending Today (3 dark cards), Most Popular (4 ranked cards), Recent Articles
- Featured hero card: card_summary field, trophy icon (amber SVG), Verified badge, author row with view count
- Featured/trending/popular controlled via admin toggles
- Removed "View all →" links from section headers
- Personalised heading for logged-in users
- Feature marketing cards hidden for returning logged-in users
- Added `is_featured`, `featured_position`, `is_trending`, `trending_set_at`, `view_count` columns to articles table

### Article Bottom Section Redesign
- New order: feedback → chat-style refine input → suggested refinements + related topics (two-column) → share + export → related articles
- Refine input is a large multi-line textarea with inline Refine + New Article buttons
- Export button added (triggers window.print() as interim PDF solution)

### Article Classification Engine
- Planning prompt enforces 7 article types: Comparison, Explainer, Buyer Guide, Decision Guide, Tutorial, News, Trend Analysis
- Required/Allowed/Forbidden component rules per type
- `forbidden_components` field in plan output enforced in writing prompt as HARD CONSTRAINT
- Visuals conditional on article type, not default
- All test queries classified correctly

### Card Summary for Featured Articles
- `card_summary` column added to articles table
- Auto-generated by Haiku when admin marks article as featured
- Editable in admin panel with backfill button for existing articles
- Fallback to first complete sentence of verdict

### Verified Badge
- Green shield + "Verified" on hero card image corner
- "Verified" next to verdict label (reverted from "Fact-checked")
- Trophy SVG icon on verdict box (amber, 28px)

### Recent Articles History
- localStorage-based tracking of last 10 visited articles
- Clock icon + "Recent" dropdown in nav
- /recent page built, matches My Articles style
- Works without login, includes Clear history link

### Generation Recovery
- `pendingArticleId` saved to localStorage on generation start
- Page Visibility API — immediate poll when tab returns to focus
- 3-minute timeout with "Taking longer than expected" message and recovery options
- Refresh resilience — refreshing loading page resumes rather than restarts

### Skeleton Loader
- `ArticleSkeleton.tsx` built — works for direct-link article load (Scenario B)
- Real section titles as readable text, shimmer paragraph placeholders
- Friendly error state with Try again and Go home options
- NOTE: Plan-aware progressive reveal during generation (Scenario A) not yet built

### Calculator Cleanup
- All 9 problematic custom calculators removed or replaced
- Zero custom calculator components remaining

### Nav Menu
- Avatar dropdown updated: My Articles, Saved Articles, Recent Articles, Settings, Sign out

---

## Known Issues as of 24 March 2026

- **Loading message pacing** — messages exhaust at ~70 seconds, articles average ~188 seconds. ~1.7 minutes of dead silence. Flat 5s interval, no adaptive pacing. Highest priority UX bug.
- **URL slugs** — still generated from raw user query, not AI-generated topic-based slugs. Fix designed, not yet implemented.
- **Skeleton loading Scenario A** — progressive reveal during generation not built
- **Profile photo upload** — settings page exists, upload not wired to Supabase Storage
- **Spending caps** — not yet set in Anthropic/OpenAI/Google billing dashboards

## March 25, 2026

### Branding
- Renamed from ArticleAI to Unpacked (unpacked.fyi)
- Updated all user-facing text, meta tags, OG images, JSON-LD, manifest, logos, PDF footer
- Logo changed from "Article" + "AI" to "The" + "Brief"

### Homepage
- Added TrustStrip component between masthead and featured articles (3 trust signals)
- Added "Want to publish under your name? Learn how →" CTA below suggestion chips
- Updated suggestion chips with longer, more specific example prompts

### Loading Experience
- Article-type-aware subtitle during Phase 2 loading (different copy per article type)

### Product Cards
- Category-aware spec fields per product type (headphones, cameras, laptops, etc.)
- Entity search queries now include product_category for better image relevance
- Richer 3-paragraph product descriptions in writing prompt

### Image Search
- Updated planning prompt entity search_query rules (no "official product photo", max 5 words)
- Protected compound proper nouns in slug generation (New York, Middle East, etc.)

### Slug Generation
- Rewrote slug generation for clean, short URLs from AI titles
- Migrated all 92 existing article slugs to new format
- Stop word list refined (preserved "how", "much", "many", etc.)

### Calculators
- Promoted 16 custom calculators to named types (zero custom remaining)
- Updated writing prompt with full named calculator type list
- Fixed engagement ring budget calculator

### Article Quality
- Classification engine with 7 article types and Required/Allowed/Forbidden rules
- forbidden_components field prevents wrong section types
- Content sections auto-split long paragraphs at sentence boundaries
