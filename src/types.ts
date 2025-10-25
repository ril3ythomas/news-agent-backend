export type Article = {
  id: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string; // ISO
  description?: string;
  author?: string;
  lang?: string;
  image?: string;
};

export type Cluster = {
  id: string;
  centroidEmbedding: number[];
  createdAt: string;
};

export type Summary = {
  id: string;
  clusterId: string;
  type: "pulse" | "digest";
  timespan: { start: string; end: string };
  summary: string;
  citations: { title: string; url: string; source: string }[];
  createdAt: string;
};
