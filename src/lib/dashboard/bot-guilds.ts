/**
 * Guild ids the Vexon bot is actually in.
 *
 * This is deliberately a separate, read-only lookup from the user's Discord
 * OAuth call. The caller intersects these ids with the user's
 * `GET /users/@me/guilds` response; this module never decides whether the user
 * owns a guild or has Administrator.
 *
 * `null` means that the bot membership could not be verified. An empty Set is
 * meaningful: the bot is reachable and is currently in no guilds.
 */

const DEFAULT_BOT_URL = "http://node1.waifly.com:25198";
const SNOWFLAKE = /^\d{5,25}$/;

type RuntimeEnv = Record<string, unknown>;

function cfEnv(): RuntimeEnv | undefined {
  return (globalThis as typeof globalThis & { __env__?: RuntimeEnv }).__env__;
}

function env(key: string): string | undefined {
  const processValue = typeof process !== "undefined" ? process.env[key] : undefined;
  const workerValue = cfEnv()?.[key];
  const value =
    (typeof processValue === "string" ? processValue : undefined) ??
    (typeof workerValue === "string" ? workerValue : undefined);
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function collectIds(value: unknown): Set<string> | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  for (const item of value) {
    const raw = typeof item === "string" ? item : item && typeof item === "object" && "id" in item
      ? (item as { id: unknown }).id
      : null;
    const id = typeof raw === "string" ? raw : String(raw ?? "");
    if (SNOWFLAKE.test(id)) ids.add(id);
  }
  return ids;
}

/**
 * Accept the response shapes used by the bot without treating a stats-only
 * response (`{ servers, users }`) as an authoritative empty guild list.
 */
function guildIdsFromResponse(data: unknown): Set<string> | null {
  const direct = collectIds(data);
  if (direct) return direct;
  if (!data || typeof data !== "object") return null;

  const object = data as Record<string, unknown>;
  for (const key of ["guildIds", "guilds", "ids"]) {
    if (!(key in object)) continue;
    const ids = collectIds(object[key]);
    if (ids) return ids;
  }
  return null;
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchBotGuildIds(): Promise<Set<string> | null> {
  const base = (env("BOT_GUILDS_URL") ?? env("BOT_ADMIN_URL") ?? DEFAULT_BOT_URL).replace(/\/+$/, "");
  const botKey = env("BOT_STATS_KEY");
  const headers: Record<string, string> = { accept: "application/json" };
  if (botKey) headers["x-stats-key"] = botKey;

  for (const path of ["/stats", "/guild-ids", "/guilds"]) {
    const ids = guildIdsFromResponse(await getJson(`${base}${path}`, headers));
    if (ids) return ids;
  }

  // Fallback: Discord's official bot-side guild list. This is also useful when
  // the bot's stats endpoint exposes counts but not ids.
  const botToken = env("DISCORD_BOT_TOKEN");
  if (botToken) {
    try {
      const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { authorization: `Bot ${botToken}`, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const ids = guildIdsFromResponse(await res.json());
        if (ids) return ids;
      }
    } catch {
      /* return null below */
    }
  }

  return null;
}
