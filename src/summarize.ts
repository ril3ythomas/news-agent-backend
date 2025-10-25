  import OpenAI from "openai";
  import { db } from "./db.js";
  import { config } from "./config.js";

  const openai = new OpenAI({ apiKey: config.openaiKey });

  export async function summarizeCluster(clusterId: string, type: "pulse" | "digest") {
    const arts = db.prepare(`
      SELECT a.id, a.title, a.url, a.source, a.description, a.publishedAt
      FROM cluster_articles ca JOIN articles a ON a.id=ca.articleId WHERE ca.clusterId=?
      ORDER BY a.publishedAt DESC`).all(clusterId);

    if (!arts.length) return null;

    const windowStart = arts.reduce((min: string, a:any)=> a.publishedAt<min?a.publishedAt:min, arts[0].publishedAt);
    const windowEnd = arts.reduce((max: string, a:any)=> a.publishedAt>max?a.publishedAt:max, arts[0].publishedAt);

    const prompt = `You are a crisp news summarizer.
Summarize the following set of articles on the SAME topic into 3-6 bullet points (max 80 chars each), neutral tone, include key numbers, dates, places.
End with a one-line "Why it matters". Keep it factual. Australian English.
Return in Markdown.
Articles:
${arts.map((a:any, i:number)=>`[${i+1}] ${a.title} — ${a.source} — ${a.publishedAt}\n${a.description||""}\n${a.url}`).join("\n\n")}
`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const summary = resp.choices[0].message.content?.trim() || "";
    const citations = arts.slice(0, 6).map((a:any) => ({ title: a.title, url: a.url, source: a.source }));
    db.prepare(`INSERT INTO summaries (id, clusterId, type, start, end, summary, citations, createdAt)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(crypto.randomUUID(), clusterId, type, windowStart, windowEnd, summary, JSON.stringify(citations), new Date().toISOString());

    return { summary, citations, start: windowStart, end: windowEnd };
  }

  export function latestSummaries(limit=10) {
    const rows = db.prepare(`SELECT id, clusterId, type, start, end, summary, citations, createdAt
                             FROM summaries ORDER BY createdAt DESC LIMIT ?`).all(limit);
    return rows.map((r:any)=>({
      id: r.id,
      clusterId: r.clusterId,
      type: r.type,
      timespan: { start: r.start, end: r.end },
      summary: r.summary,
      citations: JSON.parse(r.citations),
      createdAt: r.createdAt
    }));
  }
