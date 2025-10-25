import type { Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import { latestSummaries, summarizeCluster } from "./summarize.js";
import { db } from "./db.js";

function auth(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (process.env.AUTH_BEARER && token !== process.env.AUTH_BEARER) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Latest pulse summaries
  app.get("/api/pulse", auth, (req, res) => {
    const n = Number(req.query.n || 10);
    res.json({ items: latestSummaries(n) });
  });

  // Daily digest for a given ISO date (UTC)
  app.get("/api/digest", auth, (req, res) => {
    const date = String(req.query.date || new Date().toISOString().slice(0,10));
    const rows = db.prepare(`
      SELECT id, clusterId, type, start, end, summary, citations, createdAt
      FROM summaries
      WHERE type='digest' AND date(start)=? ORDER BY createdAt DESC`).all(date);
    res.json({ date, items: rows.map((r:any)=>({
      id: r.id, clusterId: r.clusterId, type: r.type,
      timespan: { start: r.start, end: r.end },
      summary: r.summary, citations: JSON.parse(r.citations),
      createdAt: r.createdAt
    }))});
  });

  // Force-generate a summary for a cluster
  app.post("/api/summarize/:clusterId", auth, async (req, res) => {
    const type = (req.body?.type === "digest") ? "digest" : "pulse";
    const out = await summarizeCluster(req.params.clusterId, type);
    res.json({ ok: true, data: out });
  });

  // Simple search by keyword
  app.get("/api/search", auth, (req, res) => {
    const q = String(req.query.q || "");
    const rows = db.prepare(`
      SELECT id, title, url, source, publishedAt FROM articles
      WHERE title LIKE ? OR description LIKE ?
      ORDER BY publishedAt DESC LIMIT 50
    `).all(`%${q}%`, `%${q}%`);
    res.json({ q, items: rows });
  });

  // Webhook-style endpoint for Lovable.dev chat
  app.post("/api/chatwebhook", auth, (req, res) => {
    // You can customize how the chat prompt maps to responses.
    // For now, return the latest summaries as a formatted Markdown string.
    const n = Number(req.body?.n || 5);
    const items = latestSummaries(n);
    const md = items.map((it, i) => `### Topic ${i+1}\n${it.summary}\n\nSources: ` +
      it.citations.map((c:any)=>`[${c.source}](${c.url})`).join(" · ")).join("\n\n---\n\n");
    res.json({ reply_markdown: md });
  });

  return app;
}
