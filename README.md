# 9IN3 / Kora — Trending News Agent (Backend)

A minimal TypeScript backend that:
- Fetches world-news RSS feeds every N minutes (default: 30)
- Deduplicates & clusters stories via embeddings
- Summarizes each cluster with citations ("pulse" updates)
- Exposes HTTP endpoints you can call from Lovable.dev chat

## Quick start

1) **Requirements**: Node 18+, pnpm/npm, OpenAI API key.

2) **Install**

```bash
pnpm install
# or: npm install
cp .env.example .env
# then edit .env
```

3) **Run**

```bash
pnpm dev
# or: npm run dev
```

The server listens on `http://localhost:8080` by default.

## Environment

- `OPENAI_API_KEY`: your OpenAI key
- `AUTH_BEARER`: shared secret for your frontend to call the API
- `POLL_EVERY_MINUTES`: fetch cadence (default 30)
- `TIMEZONE`: cron timezone (default `Australia/Melbourne`)
- `FEEDS`: optional comma-separated RSS URLs to override defaults

## Endpoints

- `GET /health` → `{ ok: true }`
- `GET /api/pulse?n=10` (auth) → latest summaries
- `GET /api/digest?date=YYYY-MM-DD` (auth) → daily digest only
- `GET /api/search?q=term` (auth) → raw articles
- `POST /api/summarize/:clusterId` (auth) → force-generate a summary
- `POST /api/chatwebhook` (auth) → returns `reply_markdown` that you can drop straight into your Lovable.dev chat

### Example `POST /api/chatwebhook` payload

```json
{
  "n": 5
}
```

**Response**

```json
{
  "reply_markdown": "### Topic 1\n• ..."
}
```

## Lovable.dev integration (minimal)

In your Lovable.dev chat handler (client-side), post to your backend and render the Markdown reply:

```ts
async function fetchNewsReply(n = 5) {
  const r = await fetch("https://YOUR_BACKEND_URL/api/chatwebhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + YOUR_AUTH_BEARER
    },
    body: JSON.stringify({ n })
  });
  const data = await r.json();
  return data.reply_markdown as string;
}
```

## How clustering works (simple but effective)

- We compute embeddings for each article (title + snippet).
- A new article joins the nearest existing cluster if cosine similarity ≥ `CLUSTER_SIM_THRESHOLD` (default 0.82); otherwise we create a new cluster.
- We periodically summarize most-recent clusters into "pulse" Markdown (3–6 bullets, plus "Why it matters") with live citations of the covered sources.

## Notes & Extensions

- This uses **RSS** to avoid paid aggregators. You can plug in NewsAPI/GDELT/Bing if you prefer.
- SQLite is used for simplicity; swap with Postgres by replacing `db.ts` queries.
- Add Lang detection, image extraction, and regional feeds (AU‑first) if desired.
- For "digest" mode, you may run a separate cron at 18:00 local that picks top N clusters of the day and summarizes once.

## Security

- All `/api/*` endpoints require a Bearer token (`AUTH_BEARER`). Keep your backend private.
- Rate-limit or add an API gateway if exposing publicly.

---

Built for 9IN3 + Kora — "Private Intelligence in Three Dimensions".
