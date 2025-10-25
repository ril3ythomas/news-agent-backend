import Database from "better-sqlite3";
import { logger } from "./logger.js";
import { randomUUID } from "crypto";

export const db = new Database(process.env.DB_PATH || "./news-agent.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    url TEXT UNIQUE,
    title TEXT,
    source TEXT,
    publishedAt TEXT,
    description TEXT,
    author TEXT,
    lang TEXT,
    image TEXT,
    embedding TEXT -- JSON array
  );
  CREATE TABLE IF NOT EXISTS clusters (
    id TEXT PRIMARY KEY,
    centroidEmbedding TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS cluster_articles (
    clusterId TEXT,
    articleId TEXT,
    PRIMARY KEY (clusterId, articleId)
  );
  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    clusterId TEXT,
    type TEXT,
    start TEXT,
    end TEXT,
    summary TEXT,
    citations TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    url TEXT UNIQUE,
    label TEXT
  );
`);

export function upsertSource(url: string, label: string) {
  db.prepare("INSERT OR IGNORE INTO sources (id, url, label) VALUES (?, ?, ?)")
    .run(randomUUID(), url, label);
}
