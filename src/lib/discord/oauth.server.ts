/**
 * Discord API helpers for the dashboard (server-only).
 *
 * The server list has one source of identity: the current Better Auth session.
 * When the user signs in with Discord, `src/lib/auth/server.ts` copies the
 * OAuth access token onto that session row. Listing then does exactly this:
 *
 *   GET https://discord.com/api/v10/users/@me/guilds
 *   Authorization: Bearer <session.discordAccessToken>
 *
 * `owner` and the Administrator bit (`permissions & 0x8`) come directly from
 * Discord. The result is intersected with the bot's own guild ids in
 * `dashboard/bot-guilds.ts`. The signed bot Admin API is only used after the
 * visitor opens a specific guild.
 */
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

const DISCORD_API = "https://discord.com/api/v10";
const ADMINISTRATOR = 0x8n;

type CfEnv = Record<string, unknown>;

function cfEnv(): CfEnv | undefined {
  return (globalThis as typeof globalThis & { __env__?: CfEnv }).__env__;
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

export function getDiscordClientId(): string | undefined {
  return env("DISCORD_CLIENT_ID");
}

function getDiscordClientSecret(): string | undefined {
  return env("DISCORD_CLIENT_SECRET");
}

/** True when the direct Discord Better Auth provider can be used. */
export function isDiscordConfigured(): boolean {
  return Boolean(getDiscordClientId() && getDiscordClientSecret());
}

/** @deprecated Use `isDiscordConfigured()` / `getDiscordClientId()`. */
export const discordConfigured = isDiscordConfigured;
export const discordClientId = getDiscordClientId;

export class DiscordLinkError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "DiscordLinkError";
  }
}

export type SessionDiscordGrant = {
  discordId: string;
  token: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type SessionGrantRow = {
  discordId: string | null;
  discordAccessToken: string | null;
};

/**
 * Read the Discord grant from THIS request's Better Auth session.
 *
 * The token is never returned from a server function. It is read from the
 * session table, not from Better Auth's `account` table and not from a
 * second Discord-link table.
 */
export async function getSessionDiscordGrant(
  bearerToken?: string,
): Promise<SessionDiscordGrant | null> {
  let headers: Headers;
  try {
    headers = new Headers(getRequestHeaders());
  } catch {
    return null;
  }
  if (bearerToken) headers.set("authorization", `Bearer ${bearerToken}`);

  const session = await auth.api.getSession({ headers }).catch(() => null);
  if (!session?.session) return null;
  const sessionToken = (session.session as { token?: string }).token;
  if (!sessionToken) return null;

  try {
    const sql = await getSql();
    const rows = await sql.query<SessionGrantRow>(
      `select "discordId", "discordAccessToken"
         from "session"
        where "token" = $1
          and "expiresAt" > now()
        limit 1`,
      [sessionToken],
    );
    const row = rows[0];
    if (!row?.discordId || !row.discordAccessToken) return null;
    return {
      discordId: row.discordId,
      token: row.discordAccessToken,
      displayName: session.user.name ?? null,
      avatarUrl: session.user.image ?? null,
    };
  } catch {
    return null;
  }
}

export type DiscordGuildRef = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  approximate_member_count?: number;
};

export function discordGuildIconUrl(guildId: string, icon: string | null): string | null {
  if (!icon) return null;
  const ext = icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=128`;
}

export function discordGuildIconColor(guildId: string): string {
  let n = 0;
  for (let i = 0; i < guildId.length; i += 1) {
    n = (n * 31 + guildId.charCodeAt(i)) >>> 0;
  }
  const palette = ["#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245", "#3BA55D"];
  return palette[n % palette.length] ?? "#5865F2";
}

/** True when Discord says the visitor owns the guild or has Administrator. */
export function isGuildManager(guild: { owner: boolean; permissions: string }): boolean {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions) & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

async function discordJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

/**
 * Fetch the user's guilds from Discord itself. Do not replace this with a bot
 * member lookup: Discord already includes `owner` and `permissions` here.
 */
export async function fetchUserGuilds(token: string): Promise<DiscordGuildRef[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds?with_counts=true`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 429) {
    const data = (await discordJson(res)) as { retry_after?: number };
    const wait = Math.ceil(Number(data.retry_after) || 5);
    throw new DiscordLinkError(`ديسكورد يحدّ الطلبات حالياً — أعد المحاولة بعد ${wait} ثانية.`, 429);
  }
  if (!res.ok) {
    throw new DiscordLinkError(`تعذر جلب سيرفراتك من ديسكورد (${res.status}).`, 502, res.status);
  }

  const data = await discordJson(res);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (guild): guild is DiscordGuildRef =>
      Boolean(guild && typeof guild === "object" && typeof (guild as { id?: unknown }).id === "string"),
  );
}