TWO CLARIFICATIONS BEFORE YOU BUILD — from Claude.ai strategy thread (build4)

Before proceeding with the Reddit redesign and remove/replace build, two things need addressing. Review these, factor them in, and continue.

**1. TwitterAPI.io future-proofing**

Design `executeTwitterQueries()` so the data source is swappable. Add a check at the top: if `process.env.TWITTER_API_KEY` exists, use TwitterAPI.io. If not, fall back to the current Brave `site:x.com` path. One `if/else`, same `TwitterFinding[]` output shape.

Add a comment block at the top of the function documenting the future TwitterAPI.io integration:
- Endpoint: `GET https://api.twitterapi.io/twitter/tweet/advanced_search`
- Auth: `X-API-Key` header
- Query format: same keywords but without `site:x.com` prefix
- Response includes: full tweet text, author handle, display name, follower count, likes, retweets, reply count, exact timestamp, tweet URL
- When active: populate `TwitterFinding` with real engagement data instead of Brave-inferred approximations
- Sort by engagement (likes + retweets) to surface important voices
- Increase fetch to 50-60 tweets per article since the API is fast and flat rate

Same pattern for Reddit: add a comment documenting the future switch from Brave `site:reddit.com` to Reddit's native `/search.json` endpoint (free, no auth, supports sort by `new`/`top`/`relevance` with time filters `t=hour`/`t=day`/`t=week`). Clean swap when a feature flag or env var is added.

Do NOT build either integration now — just structure the code so they're clean swaps later.

**2. Twitter ✕ dismiss — investigate before rebuilding**

Your plan says the Twitter section has "no dismiss UI." But the previous build report from the Twitter redesign session says ✕ dismiss buttons were built into `TwitterSentimentSection.tsx` and wired to the `/api/articles/[id]/remove-quote` endpoint with `type: 'twitter'`.

Before building new dismiss UI for Twitter, check what's actually there:
- Does `TwitterSentimentSection.tsx` render ✕ buttons for the owner?
- Is the remove-quote endpoint handling `type: 'twitter'` correctly?
- If dismiss is built but not showing, find out why (permission check? CSS? conditional rendering bug?)
- If it's genuinely not there, build it. If it is there but broken, fix it. Don't rebuild from scratch without knowing.

Report what you find on point 2, then continue with the full build.

Do not stop to ask questions.
