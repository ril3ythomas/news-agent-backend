import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8080),
  authBearer: process.env.AUTH_BEARER || "change-me",
  openaiKey: process.env.OPENAI_API_KEY || "",
  timezone: process.env.TIMEZONE || "Australia/Melbourne",
  feeds: (process.env.FEEDS || "").split(",").map(s => s.trim()).filter(Boolean),
  pollEveryMinutes: Number(process.env.POLL_EVERY_MINUTES || 30),
  clusterSimThreshold: Number(process.env.CLUSTER_SIM_THRESHOLD || 0.82),
  dbPath: process.env.DB_PATH || "./news-agent.db"
};
