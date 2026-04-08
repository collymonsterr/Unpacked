# STRATEGY.md — Unpacked Marketing, Growth & Launch Strategy

**Purpose:** Reference doc for Claude Code so that tactical decisions align with already-agreed forward strategy. Captures narrative, launch plan, distribution rules, and monetisation reasoning that doesn't fit in PLAN.md or BUILD.md.

**Not a build list** — PLAN.md owns the forward build plan. Where this doc mentions features, it's for strategic context only.

**Last updated:** 2026-04-07

---

## North Star

We are not building an AI content tool. We are building a system that produces, ranks, and distributes the best answers to questions people already care about.

The single metric that matters: **number of articles shared externally and discovered by new users.**

---

## The Wirecutter Parallel

Wirecutter was acquired by the New York Times for $30 million in 2016 after generating ~$150 million in annual e-commerce transactions. Same model — deep research, clear verdict, affiliate commission. Unpacked does it without the newsroom, at roughly $0.10 per article, across every topic and category, with a creator community that distributes the content themselves.

---

## Current Snapshot (2026-04-07)

Numbers shift quickly — treat as point-in-time.

- ~199 articles in the database, most private or unlisted
- ~8 registered users (friends only — no public marketing yet)
- ~558 total views
- Live at unpacked.fyi
- Google Search Console connected, 6 pages indexed (new domain, normal)
- Google Analytics connected
- Stripe Checkout + webhooks wired under BlockSol; pending live account activation

**Top performing articles by views:**
- Polymarket Explained — highest views
- LLM API Costs Compared
- Professor Jiang of Predictive History (picked up organically on Google)

---

## Monetisation Strategy

### Skimlinks — First Monetisation Step

Single JavaScript snippet in `app/layout.tsx`. Automatically converts product links to affiliate links across 48,500+ merchants. No per-merchant applications. Handles FTC disclosure. International (important for Dubai base).

**Decision:** No affiliate links for the first 3-4 weeks after launch. Build trust and reputation first. Skimlinks goes live quietly after initial distribution is established and community trust is built. **Never mention affiliate links when posting to Reddit.**

### Revenue Streams in Priority Order

1. **Subscriptions** — Free (3 articles/month), Standard $12/month (15 articles), Pro $29/month (60 articles). Stripe built, pending live activation.
2. **Affiliate commissions via Skimlinks** — activated 3-4 weeks post-launch
3. **"Products mentioned" section** on non-product articles — surfaces purchasable entities from entity cards on myth busters, explainers, etc.
4. **Sponsored articles** — month 6+, needs traffic proof first
5. **API access for publishers** — month 12+
6. **Creator revenue share** — 20% initially, scaling to 30-50% for Verified Creators

### Category Affiliate Priority

Finance highest ($50-200/signup for credit cards and investment platforms), Tech second, Home third, Health fourth, Travel fifth.

### Viral Content → Buyer Guide Funnel

Viral articles (myth busters, ranked lists, tweet-inspired) drive traffic. At the bottom, the CTA converts readers to creators. Those creators make buyer guides and comparisons that earn affiliate. The viral articles are the top of the funnel, not the monetisation point.

---

## Launch Strategy

### Pre-launch (current phase)

- **Content audit of ~199 articles** — Tier 1 (publish at launch, ~40-50 best articles), Tier 2 (drip publish over 2-3 weeks, ~80 articles), Tier 3 (delete or keep private — test articles, duplicates, thin content)
- Stripe live-account activation
- Generate 10-15 strong buyer guides in Finance and Tech targeting high buyer-intent search queries
- Fix 3 redirect URLs in Google Search Console
- Identify and DM 20 niche site owners offering founding creator accounts personally

### Soft launch (day 1-14)

- Publish Tier 1 articles
- Colin posts LinkedIn narrative sequence: problem post → process post → reveal post → invitation post over two weeks
- Reddit seeding starts — genuine participation in r/juststart and 3-4 niche subreddits
- Tech announcement articles start — first major tech announcement gets the full treatment

### Creator acquisition (weeks 3-6)

- Email outreach campaign — 20-30 per day to affiliate bloggers and newsletter writers
- VA handles mechanical list building and sending; Colin handles all replies
- **Target:** 50 active creators generating and sharing content
- **Pitch:** "Your expertise, our infrastructure. The research in 3 minutes, you edit and publish."
- Never lead with AI. Lead with time saved and quality of output.

### Scale (month 2+)

- Skimlinks activated quietly
- Affiliate revenue data informs content priorities
- Reddit opportunity monitor running
- Creator revenue share activated
- Weekly email digest to captured list

---

## Tech Announcement Content Strategy

Highest-leverage content strategy given Colin's existing LinkedIn audience and AI/tech expertise.

### The Format

- **What was announced** (2 paragraphs max, written for someone who heard but hasn't read the official post)
- **What it actually means** (editorial layer — strategy, implications)
- **How it compares** (immediate competitor comparison with live pricing)
- **What real people are saying** (Reddit and Twitter/X sentiment pulled at generation time)
- **The verdict** (clear opinion — worth upgrading, switching, paying attention to?)
- **Live data where relevant** (Polymarket, stock movement, Google Trends spike)

### The Living Article Mechanic

Article updates every few hours as the story develops. "Last updated 2 hours ago" signals freshness. Each significant update is a legitimate reason to post again on LinkedIn and Twitter — keeps the article in circulation 24-48 hours instead of 2-3 hours. Multiple posts about the same article are legitimate because the content has genuinely changed.

### Promotion Sequence for Each Announcement

1. **LinkedIn Post 1** (within 30 minutes, no link): hot take in 3-4 sentences. Gets organic reach because no external link.
2. **LinkedIn Post 2** (45-60 minutes later, once article live): "I just published a full breakdown" with link. Rides engagement wave from Post 1.
3. **Twitter thread simultaneously:** tweet 1 is verdict, tweets 2-5 are key findings, final tweet is link.
4. **Reddit:** find announcement thread in relevant subreddit, reply to a specific comment asking "is it worth upgrading?" with a genuine useful summary, mention full breakdown at end. Never top-level promotional post.
5. **Hacker News:** for genuinely significant announcements only, factual title not clickbait.
6. **Communities:** Slack, Discord, WhatsApp groups Colin is already in — genuine "just published this" message.
7. **Substack outreach:** email AI/tech newsletter writers with the relevant breakdown, no ask, just sharing.

**Total cost per announcement: 90 minutes of Colin's time. Zero financial cost.**

---

## Tweet-to-Article as Growth Mechanic

Viral tweets are the highest-intent content signals on the internet. Someone sees a tweet with 5M views about oil chokepoints → pastes the URL into Unpacked → gets a full researched article → shares it in the tweet's replies. Natural distribution loop.

URL pre-fetch layer is built (tweets, Reddit, articles). See PLAN.md 4J.

---

## Distribution Rules

### Reddit — Strict Rules

- **90/10 genuine participation ratio** — never post only when you have something to share
- **Clean URLs only** — no affiliate links ever on Reddit
- **Comments not top-level posts** where possible
- **One person** (Colin or trusted VA) manages all Reddit — never hire multiple people to post independently
- **No coordinated posting** across multiple accounts — Reddit detects this and shadowbans

### VA Role — What It Is and Isn't

The VA monitors Reddit for relevant threads and flags them to Colin. Colin posts the actual comment. The VA handles mechanical scheduling and cross-posting on LinkedIn and Twitter. The VA does not post anything independently on Reddit.

### The Approach That Doesn't Work

Hiring multiple cheap workers from r/slavelabour to each take a platform and post independently. Reddit specifically will flag coordinated inauthentic behaviour. One complaint post about spam does more damage than all the promotion does good.

### Creator Outreach Targets

Substack writers, Medium bloggers, niche site owners (r/juststart community), YouTube reviewers who want companion written content. Pitch: "Your expertise, our infrastructure. Research in minutes, earn on every click." Don't say "AI writes for you" — say "we accelerate your research and handle formatting."

---

## New Article Types — Future Direction

The 14 built types are defined in CLAUDE.md. These are the agreed-upon next additions (not yet built — belongs in PLAN.md when scheduled):

- **Contrarian take** — "Why everyone is wrong about remote work" — highest shareability, requires evidence-backed contrarian position with guardrails in the editorial prompt
- **Prediction list** — "8 things that'll be completely different by 2030" — needs explicit framing that claims are forecasts not verified facts, Polymarket odds and FRED data backing predictions
- **What actually happens when** — "What happens when you stop eating sugar for 30 days" — timeline/process narrative, close to existing explainer but with a distinct arc
- **Tech announcement** — dedicated type for breaking AI and tech news, updates every few hours as the story develops, verdict-focused, comparison table structure built in. **Highest-priority new type** given the Tech Announcement strategy above.

**Before/after format** — parked until the image pipeline is stronger. Too image-dependent to build reliably now.

---

## Designed UX — Triple Fact-Check Display

Models are Gemini + Claude Haiku + GPT-4o-mini (per PLAN.md "Key Decisions" — deliberately different from the writer for competitive moat reasons). Any UI showing model logos must reflect the actual models in use.

Three components agreed for build:

1. **Homepage trust strip:** green shield icon, "Triple fact-checked", subtitle "Every article verified by 3 independent systems", three model pill badges.
2. **Article card badge:** semi-transparent dark green badge bottom-left of hero image, shield icon, "Triple checked".
3. **Article page expandable badge:** persistent green pill near title reading "Triple fact-checked" with summary pills showing confirmed/corrected/disputed counts. Clicking expands an inline panel showing: total claims, three-stat summary, per-model progress bars, disputed claims called out specifically. "View full fact-check" link opens the complete report in the Editor tab. Inline markers within the article body — green star on confirmed claims, amber dot on disputed, nothing on unverifiable.

---

## Key Decisions — Do Not Relitigate

*(This section mirrors PLAN.md "Key Decisions Already Made" — keep in sync.)*

- Gemini Flash is the primary writer. Sonnet is premium/fallback only. Never default to Sonnet.
- **Triple fact-check uses Gemini + Claude Haiku + GPT-4o-mini** — deliberately different from the writer. Competitive moat.
- Affiliate via Skimlinks, not Amazon Associates — UGC compliance.
- No affiliate links for the first 3-4 weeks post-launch.
- No display ads ever — kills the editorial feel.
- No paywalling articles — shareability is the growth engine.
- No coordinated Reddit posting — too risky.
- Google OAuth only for now.
- Triple fact-check UI must show the actual models in use (not third-party brands).
- "AI" does not appear in user-facing copy anywhere.
- Every article picks a winner. No hedging. No "it depends."

---

## See Also

- **CLAUDE.md** — technical architecture, ground truth for the codebase
- **BUILD.md** — current feature state (what's actually shipped)
- **PLAN.md** — forward build plan, phase-by-phase session list
- **DECISIONS.md** — decision log
- **OVERVIEW.md** — product brief for outside-of-Claude-Code conversations
