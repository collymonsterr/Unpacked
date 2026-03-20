# Article AI

**Ask anything. Get the article, not the answer.**

Article AI is a web app that transforms simple queries into fully structured, opinionated, visual articles that read like they were written by a senior product journalist. Not a chatbot response — a finished article.

Type something like *"Best beginner electric guitars under $500"* or *"Explain compound interest"* and get a complete editorial piece with product cards, data visualisations, comparison matrices, and a clear editorial voice that takes positions and declares winners.

## What It Does

- **Buyer Guides** — "Best podcasting setup for beginners"
- **Head-to-Head Comparisons** — "iPhone 17 vs Galaxy S26"
- **Decision Guides** — "Best used performance cars under $30,000"
- **Explainers** — "How compound interest actually works"
- **Trend Analysis** — "The state of the global EV market"

Every article is context-aware — product-focused queries get image-heavy layouts with product cards and galleries, while explainers get charts, timelines, and worked examples. No generic templates.

## Features

- AI-generated articles with real-time web search for accuracy
- Product image pipeline (Brave Search API) with multi-image galleries
- 7 interactive data visualisation types (bar charts, line charts, pie charts, treemaps, timelines, stat cards, comparison matrices)
- Article refinement — ask follow-up questions to reshape the output
- Suggestion chips for iterating on articles
- Magazine-quality responsive layout
- Mobile-first design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| AI | Claude API (Anthropic) with web search |
| Database | Supabase (PostgreSQL) |
| Images | Brave Search API |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Deployment | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Add your API keys to .env.local
cp .env.local.example .env.local

# Run the dev server
npm run dev
```

You'll need API keys for:
- [Anthropic](https://console.anthropic.com/) (Claude API)
- [Brave Search](https://brave.com/search/api/) (image search)
- [Supabase](https://supabase.com/) (database)

## Environment Variables

```
ANTHROPIC_API_KEY=
BRAVE_SEARCH_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## License

Private project. All rights reserved.
