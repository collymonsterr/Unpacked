# OVERVIEW.md — Unpacked Product & Strategy Brief

**Purpose:** Shared context doc for outside-of-Claude-Code conversations (Claude AI brainstorm thread, marketing thread, external collaborators). Keep the narrative here; keep technical ground truth in CLAUDE.md and build state in BUILD.md.

**Last updated:** 2026-04-07

---

## What Unpacked Is

Unpacked (unpacked.fyi) is a web platform where anyone types a question and receives a complete, researched, fact-checked editorial article in under 3 minutes. Not a chatbot answer — a full publication-quality article with product cards, comparison tables, data visualisations, real community sentiment from Reddit, and a clear verdict.

Every article picks a winner. No hedging, no "it depends." The editorial voice is opinionated, warm, and authoritative — Wirecutter meets The Verge meets Substack.

**One-liner:** Build a researched, fact-checked article on anything — in minutes.

**URL:** https://unpacked.fyi

---

## How It Works (Non-Technical)

A user types a question like "Best noise-cancelling headphones under $300" or pastes a viral tweet URL. Behind the scenes, an 8-stage pipeline runs:

1. **Plans** the article — classifies the type (buyer guide, ranked list, myth buster, timeline, etc.), decides the structure
2. **Researches** the topic — searches 10-15 web sources, pulls Reddit discussions, checks live data (stock prices, prediction markets, Google Trends)
3. **Blueprints** the article — creates a thesis, picks a winner, maps evidence to sections
4. **Writes** the full article with product cards, comparison tables, charts, and a verdict
5. **Edits** — an independent model scores the writing and rewrites weak sections
6. **Finds images** — sources editorial photography from Pexels, Unsplash, and web search
7. **Fact-checks** — three independent models verify every factual claim. Corrections applied automatically.
8. **Generates social content** — ready-to-post threads for Twitter/X, LinkedIn, and Reddit

The user sees a polished article in 2-3 minutes. They can then edit sections, replace images, add research the pipeline found but didn't use, change the verdict, and publish under their own name.

---

## The Two Audiences

**Creators** — people who generate articles, edit them, publish under their name, and share them. They're the supply side. Eventually they earn affiliate revenue from product recommendations in their articles.

**Readers** — people who discover articles via shared links on Reddit, Twitter/X, LinkedIn, or search. They're the demand side. The goal is converting a percentage of readers into creators.

---

## What's Built (Current State)

The platform is live and feature-rich. Key capabilities:

**14 article types:** buyer_guide, comparison, explainer, decision_guide, how_to, roundup, ranked_list, myth_buster, timeline_article, visual_list, news_analysis, trend_analysis, breaking_news, deep_dive. Each has its own structure, required components, and editorial rules.

**12 categories:** Tech, Finance, Health, Travel, Home, Entertainment, Science, Business, Automotive, Culture, News, AI.

**Plan Mode:** Before writing, users see an interactive editorial brief with 3 angle options, scope controls, research findings, Reddit sentiment, product selection, and tone/length choices. Full editorial control before a word is written.

**Editor Bar:** After generation, article owners see a persistent toolbar with controls for sections, images, research, sharing, export, and visibility. They can hover any section to edit or replace it. A section replacement UI shows contextual suggestions from unused research. Images can be replaced by hovering and uploading directly.

**Live data:** Articles automatically pull in Polymarket prediction market odds, Yahoo Finance stock/commodity data with sparklines, and Google Trends interest data when relevant. Smart decision logic filters out low-signal data (sub-$500k Polymarket volume, flat trends, flat markets).

**Triple fact-check:** Every article is independently verified by three models from different providers — Gemini (with Google Search grounding), Claude Haiku, and GPT-4o-mini. A "Verified" badge shows the claim count. Users can expand to see per-claim verdicts, disputed claims, and corrections.

**Tweet-to-article:** Users can paste a tweet/X URL, Reddit post URL, or article URL into the search box. The platform extracts the content and generates a researched article based on it.

**Tier system:** Free (3 articles/month), Standard ($12/month, 15 articles), Pro ($29/month, 60 articles). Stripe Checkout + webhooks wired (pending live account activation for production payments). Share credits system — earn bonus articles by sharing on social platforms.

**Founding Creators programme:** 100 spots, manual admin approval, amber badge, 10 bonus credits/month.

**Legal compliance:** Terms of Service, Privacy Policy (GDPR-compliant), Copyright/DMCA Policy, account deletion flow, sign-in terms acceptance.

**SEO foundation:** JSON-LD structured data, sitemap, OG tags, canonical URLs, 12 category pages with editorial descriptions.

---

## Positioning & Brand

**The word "AI" never appears in user-facing UI.** Unpacked is positioned as a publishing platform, not an AI tool. The internal framing is "The research is done, you are the editor." Externally, the message is: "Build a researched, fact-checked article on anything."

**Why no "AI" branding:** The word has become associated with low-quality generated content. It positions a product as a tool rather than a publication. It undermines the creator strategy — nobody proudly shares content from a platform that announces itself as AI-generated. The brand should feel like a publication, not a generator.

**Design language:** Warm cream background (#FAFAF8), amber/orange accent (#BA7517), editorial serif headings. The feel is premium but accessible — more magazine than dashboard, more Wirecutter than ChatGPT.

**Competitive frame:** Wirecutter was acquired by the New York Times for $30M in 2016 after generating ~$150M in annual e-commerce transactions. It produces expert-driven, opinionated product journalism with clear verdicts. Unpacked democratises that model — anyone can produce Wirecutter-quality content on any topic, backed by real research and independent fact-checking, at roughly $0.10 per article.

---

## Business Model

**Revenue stream 1: Subscriptions (built)**
Free tier acquires users. Standard ($12/month) and Pro ($29/month) tiers monetise power creators. The per-article cost to Unpacked is ~$0.05–0.17, so margins are strong at scale.

**Revenue stream 2: Affiliate commissions (next to build)**
Skimlinks integration (one JavaScript snippet) automatically converts product links in articles into affiliate links across 48,500+ merchants. Every buyer guide, comparison, and ranked list becomes a revenue source. Commission rates: 2-8% depending on merchant. A buyer guide recommending a $300 product earns $6-24 per purchase.

Creator affiliate share planned: start at 20%, scale to 30-50% for Verified Creators with quality gates.

**Revenue stream 3: Email newsletter (planned)**
Weekly "Best of Unpacked" digest capturing email addresses from article readers. High-value retention channel.

**The flywheel:** Viral content (myth busters, ranked lists, tweet-inspired articles) drives traffic → readers discover buyer guides and comparisons → affiliate clicks → revenue. Plus: creators who see affiliate earnings on product articles create more product content → more inventory → more revenue.

---

## Category Monetisation Strategy

**High affiliate potential:** Finance (credit cards pay $50-200 per signup — highest), Tech (every article mentions products), Home (appliances, high average order value), Health (supplements, equipment, recurring purchases), Automotive (accessories, insurance, parts).

**Medium:** Travel (booking links, gear, insurance), Entertainment (streaming, gaming products).

**Low direct affiliate but high traffic:** News, Culture, Science, AI — these drive traffic to the platform. Monetise via reader-to-creator conversion and newsletter capture, not direct affiliate.

---

## The Founder

Colin Fitzpatrick — solo founder, based in Dubai (UAE). Background in enterprise software (Oracle, Salesforce, HubSpot). LinkedIn following of ~25K. Non-technical — builds entirely using Claude Code for implementation and Claude.ai for strategy and design.

Company entity: BlockSol LLC, registered in Sharjah Media City (SHAMS) free zone, UAE. Formation No: 2116673. Active licence through November 2027.

---

## Tech Stack (Brief)

- Next.js 16 App Router on Vercel Pro
- Supabase (PostgreSQL database, Google OAuth, file storage)
- Pipeline: Claude Haiku 4.5 (planning), Gemini 2.5 Flash (writing), Claude Sonnet (editing), triple fact-check across Gemini + Haiku + GPT-4o-mini
- Research: Brave Search API, Reddit public API
- Live data: Polymarket, Yahoo Finance, Google Trends (via SerpAPI)
- Images: Pexels, Unsplash, Brave Image Search
- Payments: Stripe (built, pending live account activation)

Per-article cost: ~$0.05–0.17.

**For technical ground truth always defer to CLAUDE.md.**

---

## Key Metrics to Track

- **North star:** Number of articles shared externally and discovered by new users
- **Creator activation:** First article generated within 24 hours of signup
- **Reader-to-creator conversion:** % of readers who create their own article
- **Article quality:** Fact-check pass rate, editorial scores, share rate
- **Monetisation:** Affiliate clicks per article, revenue per 1,000 views, creator retention

---

## What Unpacked Is NOT

- Not a chatbot or conversational AI
- Not a content farm or article spinner
- Not a writing assistant (like Jasper or Copy.ai)
- Not an SEO tool (like Surfer or Clearscope)
- Not a note-taking or research tool (like Notion AI or Perplexity)

It's a publishing platform where the research infrastructure is built in. The closest analogy: "What if Wirecutter's editorial process was automated and anyone could use it?"
