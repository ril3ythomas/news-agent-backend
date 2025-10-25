import { buildApp } from "./api.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import cron from "node-cron";
import { ingest } from "./ingest.js";
import { ensureEmbeddings } from "./embedding.js";
import { clusterNewArticles } from "./cluster.js";
import { bootstrapSources } from "./sources.js";
import { summarizeCluster } from "./summarize.js";
import { db } from "./db.js";

const app = buildApp();
app.listen(config.port, () => logger.info({ port: config.port }, "server-started"));

const feeds = bootstrapSources(config.feeds);

async function pipelineOnce() {
  const step = async (name: string, fn: Function) => {
    const t0 = Date.now();
    try {
      await fn();
      const dt = Math.round((Date.now()-t0)/1000);
      logger.info({ step: name, dt }, "pipeline-step");
    } catch (e) {
      logger.error({ step: name, err: e }, "pipeline-error");
    }
  };

  await step("ingest", async () => {
    const r = await ingest(feeds);
    logger.info(r, "ingest");
  });
  await step("embed", async () => { await ensureEmbeddings(64); });
  await step("cluster", async () => { await clusterNewArticles(); });
  await step("summarize-pulse", async () => {
    const rows = db.prepare("SELECT id FROM clusters ORDER BY createdAt DESC LIMIT 10").all();
    for (const r of rows) { await summarizeCluster(r.id, "pulse"); }
  });
}

// Run once at startup
pipelineOnce();

// Schedule to run throughout the day (every POLL_EVERY_MINUTES)
cron.schedule(`*/${config.pollEveryMinutes} * * * *`, pipelineOnce, {
  timezone: config.timezone
});
