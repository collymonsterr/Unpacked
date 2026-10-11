# ROADMAP.md — What's Next for Unpacked

Current state is in [BUILD.md](BUILD.md). The near-term maintenance backlog is in [PLAN.md](PLAN.md). This file holds the next **big** change — the one that alters how articles are shaped — and the feature that follows it.

Last updated: 11 October 2026.

---

## 1. Replace fixed article types with per-topic block planning

### Where we are

`lib/article-types.ts` defines **14** fixed types (`buyer_guide`, `comparison`, `explainer`, `decision_guide`, `how_to`, `roundup`, `ranked_list`, `myth_buster`, `timeline_article`, `visual_list`, `news_analysis`, `trend_analysis`, `breaking_news`, `deep_dive`). Each declares `requiredComponents`, `allowedComponents`, `forbiddenComponents`, a `lengthRange`, a `tone`, and verdict rules.

> **Note:** the brief for this work said "12 article types". There are 14 — the count grew in April 2026 when `ranked_list`, `myth_buster`, `timeline_article` and `visual_list` were added. Work from the file, not the number.

Stage 1 (`planArticle()` in `lib/claude.ts`) makes one hard classification decision, and that single choice then constrains everything downstream: the blueprint skeleton, the writing prompt's component rules, and the editorial checks.

### The problem

The type is a *bucket*, and real questions don't fall into buckets cleanly. "Is the new foldable iPhone worth it?" is part comparison, part buyer guide, part news analysis — picking one forbids components the article genuinely wants. `forbiddenComponents` is a blunt instrument: `comparison` forbids `timeline`, so a comparison that would be clearer with a release timeline can't have one. And every new article shape needs a whole new type definition plus prompt, blueprint and renderer changes.

### The change

Replace *type selection* with *block selection*. The planner stops choosing a bucket and starts composing a block list for this specific topic, drawn from the ~25 section types already in the `ArticleSection` union in `types/article.ts` (`product_card`, `comparison_table`, `timeline`, `bar_chart`, `myth_reality`, `ranked_item`, `big_statement`, `community_insights`, …).

The renderer already handles every one of these — this is a planning change, not a rendering one. That is what makes it tractable.

**Sketch:**
- Planner returns an ordered `blocks: { type, purpose, evidence_needed }[]` instead of `article_type`.
- The hard per-type `forbidden` lists become soft *coherence rules*: a few genuine invariants (don't put `product_card`s in an article with nothing to buy; every article still needs a verdict) rather than a matrix of bans.
- `lengthRange` and `tone` get derived from the block list and the question, not looked up from a bucket.
- The blueprint stage plans *per block* rather than per section skeleton.

**Risks to design around, not discover later:**
- **Editorial quality is enforced through type rules today.** "Every article picks a winner" is partly held up by `verdictRequired`. Soft rules must not become no rules.
- **The DB column `article_type` is load-bearing.** It drives `TYPE_LABELS` on every listing card (`lib/article-card.ts`), category logic and admin filters. Existing rows keep their type, so either keep writing a derived `article_type` for display or migrate every consumer. Deriving one is much cheaper.
- **This is the highest-risk change in the codebase.** Ship it behind a flag, generate the same ~20 queries through both paths, and compare before switching the default.

---

## 2. "Unpack this thread" — Reddit or X thread → visual article

Depends on (1). Threads are exactly the case the fixed types handle worst: a good thread is argument, counter-argument and evidence, which is not a buyer guide or an explainer.

### The change

Paste a Reddit or X thread URL and get a visual article of the discussion: what was claimed, who disagreed, what the evidence actually says, and a verdict.

**What already exists — reuse it, don't rebuild:**
- `lib/url-prefetch.ts` already detects URLs and fetches tweet/Reddit/article content for context injection.
- `lib/reddit-comments.ts` already pulls real top comments from Reddit's public `.json` endpoint — no key needed.
- `community_insights` is already a rendered section type.

**What's new:**
- Fetch a *whole* thread, not a top-comment sample: the tree, scores, and who is replying to whom.
- A planner mode that maps a discussion onto blocks — claim/counter-claim pairs (`myth_reality` is close), a `timeline` for how the thread developed, `big_statement` for the sharpest quotes.
- Fact-check the *claims in the thread* rather than claims we wrote. This is the interesting part and the real differentiator: the article's value is adjudicating an argument that already happened.

**Open questions to settle first:**
- X has no free thread API. `lib/research-orchestrator.ts` documents a TwitterAPI.io swap and `TWITTER_API_KEY` is reserved for it, but **nothing reads it yet** — X currently goes through Brave `site:x.com` searches, which cannot reconstruct a thread. Either wire that integration or ship Reddit-only first. **Reddit-only is the honest v1.**
- Quoting people verbatim at article scale raises attribution and consent questions the current Reddit quoting (one comment per thread, linked) does not.

---

## Sequencing

1. **Unblock the daily article first** — add `CRON_SECRET` in Vercel (CLAUDE.md § Known Problems). It is the headline feature and it has never run. Nothing below matters as much.
2. Block planning behind a flag, A/B against the current pipeline.
3. Switch the default once quality holds.
4. "Unpack this thread", Reddit first.
