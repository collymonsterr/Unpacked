# Unpacked

**Ask anything. Get the best answer on the internet.**

Unpacked ([unpacked.fyi](https://unpacked.fyi)) turns a plain question into a complete, visual, opinionated article in two to three minutes. Not a chatbot reply — a finished editorial piece with a clear verdict, real quotes from Reddit and X, live market data, and charts.

Every article picks a winner. After it's delivered, three independent AI models fact-check every claim.

## What It Produces

Fourteen article types, chosen automatically by the planner — buyer guides, head-to-head comparisons, explainers, decision guides, how-tos, roundups, ranked lists, myth busters, timelines, visual lists, news analysis, trend analysis, breaking news and deep dives.

Structure follows the question. Product queries get image-heavy layouts with product cards and galleries; explainers get charts, timelines and worked examples. Each type declares which components are required, allowed and forbidden, and those constraints are enforced at writing time.

## How It Works — 8 Stages

| # | Stage | Model | Entry point |
|---|-------|-------|-------------|
| 1 | Planning — type, structure, research manifest | Claude Haiku 4.5 | `lib/claude.ts` |
| 2 | Research — Brave + Reddit + X + live data, in parallel | Brave API, Reddit JSON, Haiku | `lib/research-orchestrator.ts` |
| 3 | Blueprint — thesis, winner, section skeleton | Gemini 2.5 Flash | `lib/blueprint.ts` |
| 4 | Writing — full article JSON, validated and retried | Gemini Flash (Sonnet 5 premium/fallback) | `lib/gemini-writer.ts` |
| 5 | Editorial pass — 15 checks, rewrites weak sections | Claude Sonnet 5 | `lib/editorial-pass.ts` |
| 6 | Images — Google-first, vision-picked, rehosted | Haiku 4.5 vision | `lib/images.ts` |
| 7 | Fact-check — triple, async after delivery | Gemini + Haiku + GPT-4o-mini | `lib/fact-check.ts` |
| 8 | Social content — X, LinkedIn, Reddit, image cards | Gemini Flash | `lib/social-content.ts` |

Orchestrated by `lib/write-pipeline.ts`, which runs the phases in parallel where it can and records timings. Active model IDs live in one place: `lib/models.ts`.

## Live Data

Polymarket prediction odds, Yahoo Finance quotes with sparklines, and Google Trends interest curves — fetched during research, not recalled from training data. See `lib/data-sources/`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.9 |
| AI | Anthropic (Haiku 4.5, Sonnet 5), Google Gemini 2.5 Flash, OpenAI (fact-check arbitration only) |
| Research | Brave Search API, Reddit public JSON, SerpAPI |
| Database | Supabase (PostgreSQL) + Supabase Auth (Google OAuth) |
| Storage | Supabase Storage (`article-images`) |
| Payments | Stripe |
| Charts | Recharts |
| Styling | Tailwind CSS 4 |
| Hosting | Vercel Pro (auto-deploy from `main`, cron for the daily article) |

## Getting Started

```bash
npm install
```

Copy your keys into `.env.local`, then:

```bash
npm run dev
```

Verify a change builds before committing:

```bash
npm run build
```

## Environment Variables

Required for the full pipeline:

```
ANTHROPIC_API_KEY              # Planning, editorial, premium writing
GOOGLE_GEMINI_API_KEY          # Blueprint, writing, fact-check, social
BRAVE_SEARCH_API_KEY           # Web + image research
OPENAI_API_KEY                 # Fact-check arbitration
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # Server-side only
```

Optional — each degrades gracefully if absent:

```
PEXELS_API_KEY                 # Stock image fallback
UNSPLASH_ACCESS_KEY            # Stock image fallback
SERPAPI_KEY                    # Google Trends
STRIPE_WEBHOOK_SECRET          # Billing
CRON_SECRET                    # Daily auto-article auth
```

The full list, including admin and tuning variables, is in [CLAUDE.md](CLAUDE.md).

## Documentation

Seven canonical files live in the repo root. Anything else is a working draft.

| File | What it holds |
|------|---------------|
| [CLAUDE.md](CLAUDE.md) | Technical reference — stack, pipeline, schema, workflow rules |
| [BUILD.md](BUILD.md) | What is built right now |
| [PLAN.md](PLAN.md) | Forward build plan |
| [DECISIONS.md](DECISIONS.md) | Closed decisions and their reasoning |
| [OVERVIEW.md](OVERVIEW.md) | Product positioning |
| [STRATEGY.md](STRATEGY.md) | Growth strategy |
| README.md | This file |

## License

Private project. All rights reserved.
