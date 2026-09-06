# DECISIONS.md — Key Decisions and Reasoning

This file records important decisions and why they were made. Before suggesting alternatives to anything listed here, read this file. Do not re-litigate closed decisions without a strong reason.

---

## Architecture

**Decision: Gemini Flash + Brave pre-research as default pipeline, not Claude Sonnet with web search**
The original pipeline used Claude Sonnet with the built-in web search tool. This injected 100,000–334,000 raw webpage tokens as input at Sonnet's rate ($3/million), costing ~$1.10 per article. Total bill was ~$77 for 81 articles over 2 days. Switched to Brave Search for pre-research (extracts a structured ~3,000 token summary) then Gemini Flash for writing. Cost dropped to $0.02–0.03 per article — a 97% reduction. The web search tool was the entire cost problem.

**Decision: Sonnet kept as premium/deep dive fallback only**
Sonnet is more capable but far more expensive. It is used for: articles where user explicitly selects "deep dive," and as automatic fallback if Gemini fails JSON validation after 2 retries. Sonnet does NOT use the web search tool in either case — research comes from Brave pre-research only.

**Decision: Fact-checking uses a different model from the writer**
Deliberately uses Gemini with Google Search grounding, not the same model that wrote the article. This prevents the fact-checker from repeating the same errors or hallucinations as the writer. Do not change this to use the same model.

**Decision: Planning uses Haiku, not Sonnet or Gemini**
The planning step (classify article type, decide structure) is a lightweight task that doesn't need the most capable model. Haiku is the cheapest option and sufficient for this job.

**Decision: Rate limiting stored in Supabase, not in-memory**
Vercel is serverless — in-memory rate limiting resets between function invocations and doesn't work correctly. Supabase-backed rate limiting persists correctly across all serverless instances.

---

## Product

**Decision: Articles pick a winner — no hedging**
Every article must give a clear verdict. Banned phrases include: "there are many great options," "it depends on your personal preference," "both are excellent choices." The system prompt instructs the model to write like a senior product journalist with 15 years of experience. This is the core editorial identity of the platform. Do not soften this.

**Decision: Classification-first article structure**
Every query is classified into one of 7 article types before writing begins. Each type has Required, Allowed, and Forbidden component rules enforced via `forbidden_components` in the plan JSON. This stops every article defaulting to a generic blog post structure. Do not bypass the classification step.

**Decision: Visuals are conditional, not default**
Charts, calculators, and data visualisations are only included if they genuinely improve understanding for that specific article type. They were previously included by default, which produced cluttered, inappropriate articles (e.g. a pie chart on an explainer article about history).

**Decision: Google OAuth only for v1**
Email/password login was decided against for v1 to reduce complexity. Apple Sign In noted for later if a native iOS app is built. Do not add new auth methods without explicit instruction.

**Decision: Article generation never blocked by auth**
Users can generate and read articles without logging in. Sign-in is for saving articles to a collection. A non-dismissable sign-in modal appears during generation (after ~20 seconds) for logged-out users, but only after the first free article.

**Decision: Export is PDF only, not markdown**
Markdown export was dropped as unnecessary for the target audience. Current implementation is browser print-to-PDF (window.print()) as an interim — proper branded PDF export is post-launch.

**Decision: No email/password registration — Google OAuth only**
Reduces friction, reduces attack surface, reduces support burden.

**Decision: No is_hero column — hero controlled by featured_position and localStorage**
There is no separate `is_hero` boolean. The hero article is whichever featured article the localStorage rotation logic selects. Do not add an is_hero column without explicit instruction.

---

## Design

**Decision: Light, warm editorial aesthetic — not dark, not techy**
Off-white background (#FAFAF8), amber/orange accents (#BA7517). Target feel is Wirecutter meets The Verge. Dark mode has not been built and is not planned.

**Decision: "Verified" label, not "Fact-checked"**
This was changed to "Fact-checked" at one point and then reverted. "Verified" is the correct label everywhere. Do not change it back.

**Decision: No auto-rotating hero carousel**
A carousel was discussed and rejected. It distracts from the search box, which is the primary CTA.

**Decision: No "View all →" links on homepage section headers**
These were removed. Do not add them back.

**Decision: No dropdown-within-dropdown in nav**
Simple links to dedicated pages only. The nav avatar dropdown contains: My Articles, Saved Articles, Recent Articles, Settings, Sign out.

---

## Naming and Branding

**Decision: Drop "AI" from the name entirely**
"AI" has become associated with low-quality generated content. It positions the product as a tool rather than a publication. It undermines the creator strategy — nobody proudly shares content from a platform that announces itself as AI-generated. The new name should feel like a publication brand.

**Decision: .fyi is the preferred TLD**
It means "for your information" which aligns with the product's purpose.

**Decision: Do not hardcode "Unpacked" anywhere new**
The name change is imminent. Every new string should use a placeholder or variable. When the name is confirmed, a full find-and-replace will be needed.

---

## Growth and Launch

**Decision: Defer affiliate links until traffic exists**
Building affiliate infrastructure before having traffic is premature. Implement when article volume justifies it.

**Decision: Defer subscription tiers until traffic exists**
Same reasoning. Build the audience first.

**Decision: Reddit VA strategy requires careful execution**
Sloppy Reddit outreach can permanently damage the brand. Any Reddit strategy must use genuine community participation, not obvious spam.

---

## Cost

**Decision: Treat Vercel ($20/month) and Supabase ($100/month) as fixed costs**
The $0.02–0.03 per article variable cost estimate excludes these. They are infrastructure costs that exist regardless of article volume. Do not include them in per-article cost calculations.

**Decision: Set hard spending caps in all AI billing dashboards**
Anthropic, OpenAI, and Google billing dashboards should all have monthly spending caps set as a last line of defence beyond the in-app rate limiting. NOTE: as of last check this had not yet been done — this is outstanding.

**Decision: Log every API call to api_usage_log**
Every Anthropic and Gemini API call is logged with token counts. Any change that increases API calls or token usage must be flagged before implementation.

---

## URL & Slug Handling

**Decision: No fuzzy slug matching — exact match only (April 2026)**
`getArticle()` previously had a fuzzy fallback (`ilike('slug', '${slug.slice(0,30)}%')`) intended to handle renamed slugs. This caused wrong articles to load and metadata leaks for private articles. Removed entirely. All slug lookups are now exact match with `.maybeSingle()` to handle potential duplicate slugs gracefully. Applied across page, edit page, API route, and OG route.

**Decision: Use Grok branding in trust strip despite using GPT-4o-mini (April 2026)**
The fact-check pipeline uses GPT-4o-mini for the third-stage arbitration, but the consumer-facing trust strip and about page say "Grok". Intentional — Grok is a stronger, more recognisable brand name for the target audience. The specific model used is an implementation detail.

---

## Navigation & Information Architecture

**Decision: Navbar order is About, Pricing, Creators, Explore (April 2026)**
Explore dropdown moved to last position. About first because the journey is: homepage → about → impressed. Pricing and Creators before Explore because they're higher-intent pages.

**Decision: Homepage hero says "three minutes" not "two minutes" (April 2026)**
Generation typically takes 2–3 minutes. Saying "two minutes" sets an expectation that's frequently missed. "Three minutes" is honest and still fast enough to be impressive.

---

## Page Consolidation — /vision folded into /how-it-works (April 2026)

**Decision: Consolidate /about + /vision + /how-it-works from three pages to two (/about stays, /vision deleted, /how-it-works rebuilt as the single investor/partner page)**
Three pages was one too many — /vision and /how-it-works were both trying to be the "serious" explanation page and overlapped in scope (mission, pipeline, why-now, business model). Folding them into one consolidated /how-it-works gives investors and partners a single canonical destination and removes the choice paralysis for the founder about which link to share. /about stays as the consumer-facing story.

**Decision: Public pipeline framing shows 5 stages, not the real 8**
The real pipeline is Plan → Research → Blueprint → Write → Editorial → Images → Fact-check → Social. Public framing collapses this to Plan → Research → Blueprint → Write → Fact-check with Editorial/Images/Social tucked into a "behind the scenes" panel. The 5-stage version reads more cleanly to non-technical readers and matches the user-facing three steps (ask → watch research → get article). The architecture isn't the moat anyway — the prompts, forbidden-phrase lists, rewrite thresholds, and fact-check arbitration logic are.

**Decision: Real model names (Claude Haiku, Gemini Flash, Claude Sonnet, GPT-4o-mini) are disclosed on /how-it-works**
The page has `robots: { index: false, follow: false }` and is explicitly a link-only investor/partner destination, so disclosure risk is minimal. Investors want specifics; generic "frontier models" language reads as evasive. Model names get re-tendered whenever pricing or capability shifts — they're not a durable moat. The durable asset is the orchestration: which model runs which stage, fallback thresholds, and editorial rule sets.

**Decision: BlockSol LLC / SHAMS free zone entity detail dropped from /how-it-works founder section**
Entity detail belongs in the investor deck (/invest), not on a page designed to read like a founder letter. It adds corporate texture that contradicts the "founder talking to a smart investor over coffee" tone. Anyone doing diligence will get the entity on a call.

**Decision: Three of five distribution engines kept (Tweet-to-Article, Creator Acquisition, Viral → Buyer Guide Funnel)**
Five distribution engines across a single section read as a wishlist; three read as a plan. The three kept are the ones with concrete mechanics already described elsewhere in the product (URL prefetch for Tweet-to-Article, founding creators programme for Creator Acquisition, the 12-category tiered grid for Viral → Buyer Guide). The other two weren't carrying weight.

**Decision: /vision returns a 301 redirect to /how-it-works via next.config.ts (not a deleted 404)**
Any existing inbound links (email signatures, DMs, decks already shared) should land on the replacement, not break. A 301 is also the SEO-correct signal if /vision was ever indexed despite the prior robots.txt block. The redirect lives in next.config.ts `redirects()` — source-controlled, reviewable in diffs, and colocated with the rest of the routing config.

---

## Image Sourcing — Google-Images-first + vision selection + rehosting (May 2026)

**Decision: Google Images is the primary image source for every article; stock libraries (Pexels/Unsplash) are fallback only**
The old order queried *stock* libraries first. Stock libraries have no photo of a specific or newly-named subject ("Opus 4.8", a named DJ, a current event), so they returned generic "person at a laptop" filler — the #1 cause of bad heroes. A human sourcing an image doesn't open a stock site; they Google the literal subject. We now do the same: `lib/google-images.ts` (SerpAPI `engine=google_images`) leads every route. Stock is the graceful fallback when Google/SerpAPI returns nothing. **Lucky break:** `SERPAPI_KEY` was already configured for Google Trends, so this needed no new account, key, or billing.

**Decision: Accept the open-web (editorial-use) copyright posture for Google Images results**
Google Images surfaces open-web photos that may be copyrighted, vs. stock libraries' explicit licences. We accept this under an editorial-use posture — the same posture as the existing Brave image source — because relevance matters more than licence purity for an editorial publication, and the founder confirmed the trade-off. Per-domain licensing logic is explicitly out of scope for v1.

**Decision: Rehost every chosen image to Supabase Storage (`lib/image-storage.ts`)**
Hotlinking open-web URLs breaks (404s, hotlink protection, CDN expiry) and leaks referrer data. We download the chosen image and serve it from our `article-images` bucket (`heroes/`/`sections/`/`products/`), mirroring the pattern `lib/imagen.ts` already uses for AI heroes. Stable URLs, no breakage. **Scope:** hero, primary product image, and editorial-section images are rehosted; product *gallery* extras stay hotlinked (rehosting every gallery image per article is too heavy for marginal benefit).

**Decision: Vision model *looks* at candidates and picks — Claude Haiku 4.5 primary, not GPT-4o-mini**
Nothing previously looked at the images — `fetchHeroImage()` returned `candidates[0]`, the first URL passing a regex. A regex can't tell a sharp on-subject press photo from a watermarked, off-topic crop. `lib/image-selector.ts` now sends candidate *thumbnails* to a vision model that picks the single best. We use **Haiku 4.5** as primary (we're already on the Anthropic stack and it's vision-capable and cheap) with GPT-4o-mini as fallback and `candidates[0]` as final fallback — the plan originally specified GPT-4o-mini primary, but keeping selection on the existing Anthropic SDK is simpler and one fewer provider dependency. Thumbnails (not full originals) are sent: small, fast, Google-CDN-reliable, cheaper.

**Decision: Keep the literal-subject query in the planner; do NOT seed Google from the raw article title**
The plan's wording was "seed the Google query from the literal subject (title/entity name)." Implementing that literally regressed *metaphorical* titles — "The Death of Side Hustles" would Google grim/irrelevant images instead of gig-work photos. Instead we kept the single planner-generated `hero_image_query` (which is already instructed to de-metaphorize) and **strengthened** its rule so a specifically *named* subject (product, version, person, event) leads the query verbatim. Same fix applied to the Haiku fallback `generateHeroQuery`. This gets literal names right ("Opus 4.8" stays "Opus 4.8") without breaking metaphor handling.

---

## Reddit Quotes — read real comments, select like an editor (May 2026)

**Decision: Quote real top-voted comments fetched from Reddit, not Brave's page-preview blurb**
"What Reddit is saying" cards displayed `matchingFinding.content.slice(0,200)` — the first 200 chars of Brave's web-search *preview* of the Reddit page. That's a page blurb, not the best comment, which is why cards showed mid-word cutoffs ("highway s"), off-topic/wrong-product lines (a KTM "1290evo" comment under a Ducati article), sarcasm, and prospective-buyer *questions* instead of owner verdicts. The model never even read the thread. New `lib/reddit-comments.ts` reads the actual top-voted comments from each thread's public `.json`, so we quote what people really wrote and upvoted — mirroring how a human finds good quotes by reading the comments.

**Decision: Public Reddit `.json`, no OAuth app (founder's call), Brave as fallback**
The reliable path is a Reddit OAuth app, but the founder tried creating one before, it didn't work, and they explicitly chose the zero-setup route. So we use the public `.json` endpoint (no key) with a polite User-Agent, a 6s timeout, one retry on `old.reddit.com`, and a 10-min in-memory cache. **Accepted trade-off:** Reddit can block data-center IPs, so the hit-rate isn't 100% — but every failure path degrades to the previous Brave fragment, so it's never worse than before. This is consistent with the existing Reddit `.json` usage in `lib/url-prefetch.ts`. If fallbacks become frequent, the OAuth app is a later upgrade.

**Decision: On by default (`REDDIT_NATIVE_API=off` to disable), not opt-in**
The code's original TODO suggested an opt-IN `if (process.env.REDDIT_NATIVE_API)` gate. We flipped it to **on-by-default** so the improvement ships to production without the founder adding any env var (their stated preference: don't make me set things up). Set `REDDIT_NATIVE_API=off|0|false` to fall back to Brave-only.

**Decision: Haiku SELECTS a comment by index — it never writes quote text**
To eliminate any risk of model-fabricated quotes attributed to "Reddit user," `summariseRedditFindings()` returns a per-thread `best_comments[]` index into the real fetched comments (0 = nothing worth quoting). The displayed quote is the verbatim comment at that index, cleaned/sentence-trimmed in code. The model only *chooses* and *rejects* (sarcasm, jokes, questions, off-topic, wrong product) — exactly like the image vision-selector picks an index. Every quote is therefore real and links to its exact `comment_url` permalink.

**Decision: Reddit only for now — X/Twitter deferred**
The X "what people are saying" cards have the identical Brave-snippet weakness, but X has no free comment/replies API (their paid API is a separate cost decision), whereas Reddit comments are free. So we fixed Reddit cleanly now and parked X as its own decision.

**Decision: Fetch each thread's `.json` once and share it (no double-fetch)**
We discovered `brave-research.ts` already fetched every Reddit thread's `.json` (for the `num_comments` quality filter) and threw away the comments in `data[1]`. Rather than add a second fetch for comments (which would double Reddit load and raise rate-limit/403 risk — the opposite of reliable), both callers now go through one cached `fetchThreadData()` keyed by permalink. The existing polite sequential metadata pass warms the cache; the orchestrator's quote selection reads from it. Net: real comments for **~0 extra Reddit requests** vs. today's baseline. This was the key reliability decision — the live 403s we saw from data-center IPs make minimising request count matter.

---

## Daily Automated Article — one fresh article per day (May 2026)

**Decision: Vercel Cron + internal route, NOT a remote Claude/agent bot**
The founder wanted "an automatic agent/bot/feed" that publishes one fresh article daily. The instinctive read is an external agent, but that agent would have no access to production API keys or the Supabase DB, so it couldn't actually run Unpacked's pipeline. The right tool is a **Vercel Cron job** hitting an internal route (`/api/cron/daily-article`) that reuses the *exact* production pipeline (`planArticle` → `executeResearch` → `runWritePipeline`). Runs in-app with real keys, produces a real fact-checked article, deploys with the codebase, zero external dependencies. (We're on Vercel Pro, so arbitrary cron schedules are supported.)

**Decision: Reuse the create pipeline by duplicating a slim version, not refactoring `create`**
The cron needs plan→research→write, which `app/api/articles/create/route.ts` already does — but `create` is wrapped in rate-limiting, tier checks, auth/visibility branching, anonymous preview, and plan-mode handling that the cron doesn't want. Rather than refactor that critical path into a shared helper (risky, and CLAUDE.md says don't refactor code you weren't asked to touch), the cron route carries a slim, admin-only, always-authenticated copy of just the plan→research→write steps. ~40 lines duplicated; `create` untouched.

**Decision: Live topic discovery via existing Brave search + rotating beats, not the LLM's stale memory**
"Most topical" requires *current* signal, and Haiku's training data is stale. So `pickDailyTopic()` rotates a 14-beat editorial calendar day-to-day (deliberately weighted away from partisan politics, per the founder's "not just politics, other interesting stuff"), runs Brave discovery (`freshness: pw`) on the day's beat, and has Haiku **select** one concrete query from real headlines — avoiding the last 14 days of auto-topics. Returns null (cron skips the day) rather than publish something stale when there's no signal.

**Decision: Published by default, with an `unlisted` review-queue escape hatch**
The founder asked for articles "going on fresh" daily, so the default is `published` (live + on the homepage), attributed to the admin user. But auto-publishing unreviewed AI content under their name/brand is a real risk, so `DAILY_ARTICLE_VISIBILITY=unlisted` flips it to a review queue (live URL, off the homepage) with a one-env-var change — no redeploy of logic. Surfaced this trade-off explicitly so it's a conscious choice.

**Decision: double-run guard + `?force=1` manual override**
Cron retries, manual tests, and overlapping invocations could double-post. The route skips if a `source: 'daily_cron'` article was created recently, except when an admin passes `?force=1` (so the founder can trigger ad-hoc test runs). Auth accepts the `CRON_SECRET` bearer (Vercel-injected) OR an admin session, so manual browser testing works without the secret.

**Decision: ~10 articles/week via two schedules + slot-offset beats, NOT 2 pipelines per run (May 2026)**
Founder asked for "an article or two a day, 5–12/week, with a good spread across the week — not just what happened that day." Running two full pipelines in one invocation risks the 300s function limit, so instead there are **two cron schedules** hitting the same route — daily morning (slot 0) + Mon/Wed/Fri afternoon (slot 1) = ~10/week, one safe pipeline per run. The **spread is structural**: the beat rotates by day, and `slot` offsets it to the opposite side of the 14-beat ring, so same-day articles are far-apart categories and a week fans out across the calendar — you can't get five of the same category. "Not just same-day": discovery uses past-week freshness (broadening to past-month), and several beats (Science, Space, Health, Culture) are inherently topical-not-breaking. Guards changed to match: the old 20h guard would have blocked the afternoon run, so it's now a **5h** recent-run guard (catches retries, allows the morning+afternoon pair) plus a hard **weekly cap of 12** so it can never overshoot the range. Risk: if Vercel dedups the two same-path cron entries it falls back to 7/week — still inside 5–12, confirmable from the logs.

**Decision: keep the daily cron cheap (~$5/mo), reserve Opus 5 / Fable for a low-volume premium lane (May 2026)**
Founder wanted the cron held to ~$5/month and asked whether to use Opus 5 for the writing. Opus on 40+ auto-articles/month is tens of dollars — incompatible with the budget — so the model split is **two lanes**: the daily cron stays on cheap models (Gemini writer + Gemini editorial), and Opus 5 / Fable are for a separate low-volume premium/`deep` path where quality is felt and cost is bounded by how few you make. (If testing a premium writer, try **Fable first** — likely better voice-per-dollar than Opus for editorial prose — but that's not wired yet; deferred to a deliberate premium-lane decision.)

**Decision: cheap mode = quick length + Gemini editorial; dollar ceiling via a month-to-date budget guard**
Cheap mode is `length: 'quick'` (fewer tokens/sections/images) + `cheap: true`, which makes `runEditorialPass()` skip the Sonnet 5 editor and run the same checks on Gemini Flash — the single biggest per-article saving (~8¢ → ~½¢) while keeping the voice QC. The **budget guard** sums this month's `daily_cron` `articles.total_cost` (which captures per-article LLM spend via `logApiCall`'s `increment_article_cost`) **plus a flat $0.08/article search estimate** — because Brave and SerpAPI are NOT logged per-article in the `executeResearch`/`searchGoogleImages` path (only the admin regenerate route logs Brave). Rather than thread `articleId` through the entire research/image path (invasive) for exact accounting, the flat estimate + the exact **weekly volume cap** together bound the real spend. The guard skips the run at `DAILY_ARTICLE_MONTHLY_BUDGET` (default $5). Honest limitation: it's an estimate, not to-the-cent — the admin Costs tab remains the source of truth, and SerpAPI/Brave per-article logging can be added later to make the guard exact.

---

## Model Efficiency Pass — Tier 1 (May 2026)

Audit of "now that we've got better models, find efficiencies." Tier 1 = low-risk drop-ins; Tier 2/3 (conditional editorial pass, batched image-vision, collapsing blueprint/editorial scaffolding) deferred pending the editorial-rewrite-rate data this pass starts logging.

**Decision: One source of truth for model IDs — `lib/models.ts`**
Active model IDs were hardcoded across ~12 files. They now import `MODELS` from `lib/models.ts`, so the next "upgrade everything" is a one-line change, not a 12-file hunt. This is the highest-leverage fix for a solo founder and made the rest of this pass trivial. The historical IDs in `MODEL_PRICING` (api-usage.ts, cost-breakdown, admin/costs) were deliberately left out — that's a price *ledger* keyed by exact past IDs, not a live selector.

**Decision: Bump Sonnet 4 → Sonnet 5, and the stale fact-check Haiku 4.0 → 4.5**
Everything Anthropic-premium (editorial pass, deep/premium writer, refine, interactive components) moves to `claude-sonnet-5` — a straight quality lift on the steps that guard the editorial voice. Fact-check Stage 2 was on `claude-haiku-4-20250414` (4.0) while everything else was 4.5 — pure inconsistency, now unified. Pricing: Sonnet-5 added to the cost tables as a **placeholder equal to Sonnet 4** ($3/$15) with a TODO — needs the real number verified so the admin Costs tab stays accurate. Reverting the bump is a one-liner in `models.ts`.

**Decision: Remove OpenAI from the image-selection path**
Vision selection was Haiku 4.5 → GPT-4o-mini → `candidates[0]`. Haiku 4.5 vision is strong and reliable, so the OpenAI middle tier was removed: the chain is now Haiku 4.5 → `candidates[0]`. One fewer provider and failure point in the image path. OpenAI is kept **only** where it earns its place — the independent third voice in fact-check arbitration (a trust pillar).

**Decision (scope): declined the hook's Vercel-AI-SDK / Workflow migration**
Editor hooks repeatedly recommended replacing the direct Anthropic/Gemini/OpenAI SDK calls with the Vercel AI SDK and moving retries to Workflow DevKit. That's a large re-architecture, unrelated to the requested efficiency pass, and would touch every generation call — declined as out of scope. Revisit only as a deliberate, separately-scoped decision.

---

## Homepage Payload and SEO Canonicalisation (September 2026)

**Decision: listing cards get a projected shape (`ArticleCardData`), not the DB row**
Every listing component took an `ArticleRow`, so the full `article`, `plan`, `fact_check` and `suggestion_chips` JSONB for 200 articles was serialised into the RSC payload embedded in the homepage's initial HTML — a measured 5.77 MB to render about eighteen scalars per card. Rather than trim the `select()` and leave client components free to reach for whole rows again, the projection is a **type boundary**: `toArticleCard()` resolves the card fields server-side and `ArticleCardData` is the only shape a card can consume. The rule that keeps it fixed is "never pass an `ArticleRow` into a listing component" — a `select()` diet alone would have regressed the first time someone needed one more field. Reading time still needs the section text, so `article` is fetched but never crosses to the client. Result: 441 KB of rendered HTML.

**Decision: consolidate duplicate URLs with a redirect map, not by deleting rows**
Roughly two dozen slugs competed with a near-identical twin — pipeline test artefacts, `-N` collision forks from `generateUniqueSlug()`, and a few cases of the same question asked twice. Deleting the losers would be irreversible and would throw away whatever links and traffic they had. Instead `lib/seo-canonical.ts` holds one declarative map: redirects (permanent, equity moves to the keeper), a noindex set (live and linkable, just not competing), and debris patterns (test artefacts, filtered everywhere). **No article row is deleted and every entry is reversible by editing one file.**

Keeper selection is rule-based so future entries stay consistent: R1 an explicit editorial decision wins; R2 a `-N`-suffixed slug always loses to its unsuffixed twin, because the suffix only exists because of a slug collision; R3 otherwise the higher `view_count` wins. R2 deliberately overrides R3 — a couple of suffixed twins have more views than their keeper, but the clean URL is worth more than the accumulated difference.

**Decision: fix the debris at slug generation, not only in the filters**
The six `gemini-test-…` / `sonnet-test-…` articles exist because a test title flowed straight into `cleanSlug()`. Filtering them out of listings and the sitemap treats the symptom, so `cleanSlug()` now strips model/pipeline test markers at the source. The regex is deliberately narrow — it requires a `<model|pipeline>-test` marker, so a real article like `chatgpt-build-production-app-test` is untouched. Verified against the live DB: exactly the 6 known artefacts matched, zero false positives.

**Decision: exclude duplicates from category listings in SQL, not after fetching**
Category pages paginate server-side with `.range()`. Filtering the returned page would leave short pages, so redirect sources are excluded in the query (and in the count) via `LISTING_EXCLUDED_SLUGS`. The post-fetch `isHiddenFromListings()` filter stays as a cheap safety net for debris that is not also a redirect source.

**Decision: verify the redirect map against production data before wiring it**
A wrong 301 silently kills a live URL, so the map was checked against the live DB first: every target exists, is `complete`/`verified` and `published`; no redirect chains; no missing keepers. This is worth repeating before adding entries.

**Note: `permanentRedirect()` emits 308, not 301.** Google treats 308 as equivalent to 301 for canonicalisation, so this is fine — but don't "fix" it to 301 expecting a behaviour change.
