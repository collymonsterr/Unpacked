# The Brief — Project Status

**Last updated:** 22 March 2026

---

## What Was Fixed Today (Engineering Audit)

### Server-Side Auth (All Mutation Routes)
- Created `lib/auth-check.ts` with `requireAdmin()`, `requireArticleOwner()`, `requireAuth()`
- Admin check matches on `ADMIN_USER_ID` (UUID) or `ADMIN_EMAIL` (email), either works
- All 11 mutation routes now have proper server-side auth
- Legacy articles with no `user_id` are still editable by any authenticated user

### Input Validation
- Created `lib/validate.ts` with `isValidUUID()`, `isNonNegativeInt()`, `parseBody()`
- All mutation routes validate article ID format and request body shape before processing
- Consistent 400 responses for malformed input

### Rate Limiting (Supabase-Backed)
- Replaced in-memory rate limiter with persistent Supabase `rate_limits` table
- Create: 10 requests/hour per user/IP
- Refine: 20 requests/hour per user/IP
- Fact-check: no limit (system-triggered)
- Old rows auto-pruned on ~10% of requests

### Schema Migration (JSONB → Real Columns)
- `hidden_from_homepage` BOOLEAN column — replaces `article.hidden_from_homepage` in JSONB
- `sort_order` INTEGER column — replaces `article.sort_order` in JSONB
- `parent_article_id` and `root_article_id` UUID columns — article lineage for refine/fork chains
- Homepage query now filters/sorts at DB level, no client-side JS sorting

### UI Permissions (Admin vs Owner vs Public)
- Admin state determined by matching authenticated user against `NEXT_PUBLIC_ADMIN_EMAIL`
- Removed localStorage-based admin mode, triple-click toggle, and `?admin=true` URL param
- Gear menu items gated: admin-only (delete, pin, hide, change category, regenerate article) vs owner+admin (regenerate images)

---

## Current Permission Model

| Action | Level | Server Check | UI Gated |
|--------|-------|-------------|----------|
| View article | Public | None | No |
| Record view | Public | None | No |
| Leave feedback | Public | Optional user tracking | No |
| Fact-check | System | None (internal) | No |
| Refine | Authenticated | `requireAuth()` | Yes |
| Replace thumbnail | Owner or Admin | `requireArticleOwner()` | Yes |
| Replace image | Owner or Admin | `requireArticleOwner()` | Yes |
| Set primary image | Owner or Admin | `requireArticleOwner()` | Yes |
| Regenerate images | Owner or Admin | `requireArticleOwner()` | Yes |
| Delete | Admin only | `requireAdmin()` | Yes |
| Pin | Admin only | `requireAdmin()` | Yes |
| Hide from homepage | Admin only | `requireAdmin()` | Yes |
| Change category | Admin only | `requireAdmin()` | Yes |
| Regenerate article | Admin only | `requireAdmin()` | Yes |
| Reorder homepage | Admin only | `requireAdmin()` | Yes |

---

## Current Rate Limiting

| Action | Limit | Key | Storage |
|--------|-------|-----|---------|
| Create article | 10/hour | `create:{userId or ip}` | Supabase `rate_limits` table |
| Refine article | 20/hour | `refine:{userId or ip}` | Supabase `rate_limits` table |
| Fact-check | Unlimited | N/A | N/A |

---

## Current Homepage Sorting/Hiding

- `hidden_from_homepage = true` → article excluded from homepage query at DB level
- Sort order: pinned first → then by `sort_order` ASC (null = new = first) → then by `created_at` DESC
- Article chains: grouped by `COALESCE(root_article_id, id)`, only latest version shown
- Drag-and-drop reorder available for admin only (saves `sort_order` column)
- Category filter pills: All, Buying Guides, Comparisons, Decision Guides, Explainers
- "Show more" loads additional articles beyond initial 24

---

## Environment Variables

### Required on Vercel
```
ANTHROPIC_API_KEY          — Claude API key
BRAVE_SEARCH_API_KEY       — Brave image search
NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
SUPABASE_SERVICE_ROLE_KEY  — Supabase service role
GOOGLE_GEMINI_API_KEY      — Gemini fact-checking
OPENAI_API_KEY             — GPT Image hero generation
ADMIN_USER_ID              — Admin UUID (3cf40198-b8f4-4bc8-a636-5d9c324ab585)
ADMIN_EMAIL                — Admin email (colinfitz@gmail.com)
NEXT_PUBLIC_ADMIN_EMAIL    — Same email, for client-side UI gating
```

### Added Today
- `ADMIN_USER_ID` — server-side admin check
- `ADMIN_EMAIL` — server-side admin check (email fallback)
- `NEXT_PUBLIC_ADMIN_EMAIL` — client-side admin UI visibility

---

## What Still Needs Manual Testing

1. **Sign out → try gear menu actions** → should not see admin controls
2. **Sign in as admin → delete/pin/hide/change category** → should all work
3. **Create a new article → fact-check bar appears** → should show "checking" then "verified"
4. **Hit rate limit** → generate 11 articles in an hour → should get 429 response on the 11th
5. **Reorder homepage via drag-and-drop** → verify sort persists across page reload
6. **Hide an article** → verify it disappears from homepage but still accessible via direct URL
7. **Refine an article** → should create a new child article (fork), not modify the original

---

## Supabase Tables Added/Modified

```sql
-- Rate limiting (created today)
rate_limits (id, key, created_at)

-- Article lineage (created today)
articles.parent_article_id UUID
articles.root_article_id UUID

-- Schema migration (created today)
articles.hidden_from_homepage BOOLEAN DEFAULT false
articles.sort_order INTEGER

-- Previously existing
articles (id, slug, query, status, plan, article, suggestion_chips, pinned, user_id, user_name, user_avatar, fact_check, verified_at, view_count, generation_options, created_at, updated_at)
article_feedback (id, article_id, user_id, rating, reason, created_at)
article_views (id, article_id, viewed_at)
```

---

## Known Risks & Loose Ends

1. **Old JSONB fields still exist** — `article.sort_order` and `article.hidden_from_homepage` are still in some article JSONB blobs. Code no longer reads them, but they're not cleaned up. Low risk.
2. **Custom calculators** — Many articles have `calculator_type: "custom"` with arbitrary input/output IDs. The component handles common patterns but some edge cases may show $0 outputs.
3. **Image hotlinks** — All product and hero images are hotlinked from external sites. They break over time. Permanent fix: download to Supabase Storage (not yet built).
4. **Rate limiter cleanup** — Old rows accumulate in `rate_limits` table. Opportunistic cleanup runs on ~10% of requests, but no scheduled job. Consider adding a Supabase cron function if table grows large.
5. **Refine fork model** — `parent_article_id` / `root_article_id` columns exist but the refine route may still update in-place for the owner rather than creating a fork. Verify behavior.
6. **Loading messages during generation** — Fixed the React effect cleanup bug (timers killed by polling). Uses `setInterval` with ref guard now. Should work but has been fragile historically — test on next article generation.

---

## Next Recommended Engineering Task

**Phase 2 of the refactor roadmap: Split `ArticleView.tsx`**

At ~726 lines, `ArticleView.tsx` is the largest component and contains the gear menu, hero image, fact-check display, refinement controls, and all admin actions in one file. Split into:
- `ArticleHeader.tsx` — title, type badge, author, date, share/bookmark
- `HeroImage.tsx` — already a sub-component, extract to its own file
- `AdminMenu.tsx` — gear icon + dropdown menu
- `ArticleView.tsx` — orchestrator that composes the above

This is medium-risk (lots of state to thread through) but high-value for maintainability. Add snapshot tests before splitting.
