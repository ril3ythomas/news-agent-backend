import Parser from "rss-parser";
import { db } from "./db.js";
import { logger } from "./logger.js";
import { randomUUID } from "crypto";

const parser = new Parser();

export async function fetchFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map(it => ({
      id: randomUUID(),
      url: it.link || "",
      title: it.title || "",
      source: feed.title || new URL(url).hostname,
      publishedAt: it.isoDate || it.pubDate || new Date().toISOString(),
      description: it.contentSnippet || it.content || "",
      author: it.creator || it.author || undefined
    }));
  } catch (e) {
    logger.warn({ err: e }, "feed-error");
    return [];
  }
}

export async function ingest(feeds: {url: string, label: string}[]) {
  let inserted = 0, seen = 0;
  for (const f of feeds) {
    const items = await fetchFeed(f.url);
    for (const it of items) {
      try {
        db.prepare(`INSERT OR IGNORE INTO articles
          (id, url, title, source, publishedAt, description, author, lang, image, embedding)
          VALUES (@id, @url, @title, @source, @publishedAt, @description, @author, NULL, NULL, NULL)
        `).run(it);
        const changes = db.prepare("SELECT changes() as n").get().n as number;
        if (changes > 0) inserted++;
        else seen++;
      } catch (e) {
        // ignore duplicates
      }
    }
  }
  return { inserted, seen };
}
