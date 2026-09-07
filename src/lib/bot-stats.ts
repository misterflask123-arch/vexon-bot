import { createServerFn } from "@tanstack/react-start";

const BOT_STATS_URL = "http://node1.waifly.com:25198/stats";

export type BotStats = {
  servers: number;
  users: number;
};

export const getBotStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<BotStats | null> => {
    try {
      const botKey = process.env.BOT_STATS_KEY;
      const res = await fetch(BOT_STATS_URL, {
        headers: botKey ? { "x-stats-key": botKey } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as BotStats;
      if (typeof data.servers !== "number" || typeof data.users !== "number") {
        return null;
      }
      return { servers: data.servers, users: data.users };
    } catch {
      return null;
    }
  },
);
