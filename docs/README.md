# docs/

Nothing in here is canonical. The seven canonical docs live in the repo root — see [CLAUDE.md](../CLAUDE.md) § Mandatory Process Rules. **If anything here disagrees with the code, the code wins.**

| Path | What it is |
|------|------------|
| `WRITING-PROMPTS-REFERENCE.md` | Read-only extraction of every prompt in the 8-stage pipeline, with the model and stage each belongs to. Regenerate from source rather than editing by hand — the live prompts are in `lib/`. |
| `drafts/` | Working briefs and session hand-offs. Historical record of what was asked, not a description of what shipped. Safe to delete once the work has landed in BUILD.md. |

## drafts/

| File | Status |
|------|--------|
| `2026-05-twitter-reddit-swappability-brief.md` | **Landed.** Asked for TwitterAPI.io/Reddit-native swappability plus a Twitter dismiss-UI investigation. Reddit native comments shipped May 2026 (`lib/reddit-comments.ts`); Twitter/X still runs through Brave `site:x.com` with no API key, as designed. |
