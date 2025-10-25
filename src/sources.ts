import { upsertSource } from "./db.js";

export const DEFAULT_FEEDS: { url: string; label: string }[] = [
  { url: "https://feeds.reuters.com/reuters/topNews", label: "Reuters" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", label: "NYTimes World" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", label: "Al Jazeera" },
  { url: "https://www.abc.net.au/news/feed/51120/rss.xml", label: "ABC Australia" },
  { url: "https://www.ft.com/world/rss", label: "Financial Times" },
  { url: "https://apnews.com/hub/ap-top-news?utm_source=apnews.com&utm_medium=referral&utm_campaign=ap_rss", label: "AP" },
  { url: "https://www.theguardian.com/world/rss", label: "The Guardian World" },
  { url: "https://feeds.bbci.co.uk/news/rss.xml", label: "BBC" }
];

export function bootstrapSources(custom?: string[]) {
  const feeds = custom && custom.length ? custom : DEFAULT_FEEDS.map(f => f.url);
  const map = new Map(DEFAULT_FEEDS.map(f => [f.url, f.label]));
  for (const url of feeds) {
    const label = map.get(url) || new URL(url).hostname;
    upsertSource(url, label);
  }
  return feeds.map(u => ({ url: u, label: map.get(u) || new URL(u).hostname }));
}
