import OpenAI from "openai";
import { db } from "./db.js";
import { logger } from "./logger.js";
import { config } from "./config.js";

const openai = new OpenAI({ apiKey: config.openaiKey });

export async function ensureEmbeddings(limit = 64) {
  const rows = db.prepare(`SELECT id, title, description FROM articles WHERE embedding IS NULL LIMIT ?`).all(limit);
  if (!rows.length) return 0;
  const inputs = rows.map((r: any) => (r.title + " \n" + (r.description||"")).slice(0, 4096));
  const resp = await openai.embeddings.create({ input: inputs, model: "text-embedding-3-small" });
  const stmt = db.prepare("UPDATE articles SET embedding = ? WHERE id = ?");
  rows.forEach((r: any, i: number) => {
    const v = JSON.stringify(resp.data[i].embedding);
    stmt.run(v, r.id);
  });
  logger.info({ count: rows.length }, "embeddings-updated");
  return rows.length;
}

export function cosine(a: number[], b: number[]) {
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++) { dot += a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}
