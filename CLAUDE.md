# ArticleAI — Claude Code Build Prompt

## PROJECT OVERVIEW

Build **ArticleAI** — a web app where users type a query like "Best beginner electric guitars under $500" and receive a fully structured, opinionated, visual article that looks and reads like it was written by a senior product journalist. Not an AI chat response. A finished article.

This is a **product-focused editorial engine**. The core use cases for MVP are:
- **Buyer Guides** — "Best podcasting setup for beginners"
- **Head-to-Head Comparisons** — "iPhone 17 vs Galaxy S26"
- **Decision Guides** — "Best used performance cars under $30,000"

Every article takes a clear position, declares winners, and tells you what to avoid. The editorial voice is confident, opinionated, and decisive — never generic or hedging.

---

## TECH STACK

- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic) with web search tool enabled
- **Image Search**: Google Custom Search API (for product images)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel-ready

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Next.js 16**: `params` in route handlers is a Promise — always `await params` before accessing properties.
2. **The Claude API calls are the core of this product.** Do not simplify or shorten the system prompts.
3. **Image search will sometimes fail.** Handle missing images gracefully with a placeholder.
4. **The article JSON structure must be strictly followed.** Implement retry logic for malformed JSON.
5. **Polling for article status:** Poll `/api/articles/[id]` every 2-3 seconds while status is "generating".
6. **The suggestion chips should be regenerated with each refinement.**
7. **Mobile-first responsive design.**
8. **Font loading:** Use Google Fonts with `font-display: swap`.
9. **For homepage article cards:** Use the first product image. If none, use a gradient with the title.
