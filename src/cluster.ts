import { db } from "./db.js";
import { cosine } from "./embedding.js";
import { config } from "./config.js";
import { randomUUID } from "crypto";

export function clusterNewArticles() {
  const threshold = config.clusterSimThreshold;
  const items = db.prepare(`SELECT id, embedding FROM articles WHERE embedding IS NOT NULL
                            AND id NOT IN (SELECT articleId FROM cluster_articles)`).all();

  const clusters = db.prepare(`SELECT id, centroidEmbedding FROM clusters`).all()
    .map((c: any) => ({ id: c.id, centroidEmbedding: JSON.parse(c.centroidEmbedding) as number[] }));

  for (const it of items) {
    const emb = JSON.parse(it.embedding) as number[];
    // find best match
    let bestId: string | null = null, bestSim = -1;
    for (const c of clusters) {
      const sim = cosine(emb, c.centroidEmbedding);
      if (sim > bestSim) { bestSim = sim; bestId = c.id; }
    }
    if (bestSim >= threshold && bestId) {
      db.prepare("INSERT OR IGNORE INTO cluster_articles (clusterId, articleId) VALUES (?, ?)").run(bestId, it.id);
      // update centroid (simple mean)
      const rows = db.prepare(`SELECT a.embedding FROM cluster_articles ca JOIN articles a ON a.id=ca.articleId WHERE ca.clusterId=?`).all(bestId);
      const vecs = rows.map((r:any)=>JSON.parse(r.embedding));
      const mean = vecs[0].map((_:number,i:number)=> vecs.reduce((s:number,v:number)=>s+v[i],0)/vecs.length);
      db.prepare("UPDATE clusters SET centroidEmbedding=? WHERE id=?").run(JSON.stringify(mean), bestId);
    } else {
      const id = randomUUID();
      db.prepare("INSERT INTO clusters (id, centroidEmbedding, createdAt) VALUES (?, ?, ?)")
        .run(id, JSON.stringify(emb), new Date().toISOString());
      db.prepare("INSERT INTO cluster_articles (clusterId, articleId) VALUES (?, ?)").run(id, it.id);
      clusters.push({ id, centroidEmbedding: emb });
    }
  }
}
