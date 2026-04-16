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
