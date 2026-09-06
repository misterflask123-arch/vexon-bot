/**
 * Discord OAuth2 for the dashboard (server-only).
 *
 * The site's own sign-in is Better Auth (Google / X through the Grok broker),
 * which carries NO Discord identity. The dashboard needs one for two reasons:
 *
 *   1. The visitor's real server list comes from Discord itself
 *      (`GET /users/@me/guilds`, scope `guilds`) — see `fetchUserGuilds`.
 *   2. The bot only accepts a request whose `sub` is a real Discord user id, and
 *      re-checks Owner/Administrator against Discord on every call. That id is
 *      the one linked here.
 *
 * So: Better Auth user id → one row in `discord_links` → a Discord access token.
 * Everything is fail-closed: with `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
 * unset, `isDiscordConfigured()` is false, no route runs, and `getAccessToken`
 * returns null rather than pretending.
 *
 * Tokens never leave the server — no server function returns them.
 *
 * Cloudflare Workers: env is bound per-request. Never snapshot
 * DISCORD_CLIENT_ID / SECRET at module load.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

const DISCORD_API = "https://discord.com/api/v10";
/** `identify` for the account, `guilds` for the server list. */
export const DISCORD_SCOPES = "identify guilds";
/** Discord's Administrator permission bit. */
const ADMINISTRATOR = 0x8n;

type CfEnv = Record<string, unknown>;

function cfEnv(): CfEnv | undefined {
  return (globalThis as typeof globalThis & { __env__?: CfEnv }).__env__;
}

/** Read an env var, treating empty/whitespace as unset. Live on Workers. */
function env(key: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? process.env[key] : undefined;
  const fromCf = cfEnv()?.[key];
  const value =
    (typeof fromProcess === "string" ? fromProcess : undefined) ??
    (typeof fromCf === "string" ? fromCf : undefined);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getDiscordClientId(): string | undefined {
  return env("DISCORD_CLIENT_ID");
}

function getDiscordClientSecret(): string | undefined {
  return env("DISCORD_CLIENT_SECRET");
}

/** True when the Discord OAuth app credentials are present. Live on Workers. */
export function isDiscordConfigured(): boolean {
  return Boolean(getDiscordClientId() && getDiscordClientSecret());
}

/** @deprecated Use `isDiscordConfigured()` / `getDiscordClientId()`. */
export const discordConfigured = isDiscordConfigured;
export const discordClientId = getDiscordClientId;

/** Thrown when the flow cannot run — message is shown to the visitor as-is. */
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

/** The client secret, or a 503 the visitor can act on when it isn't configured. */
function assertConfigured(): string {
  const secret = getDiscordClientSecret();
  if (!getDiscordClientId() || !secret) {
    throw new DiscordLinkError(
      "ربط ديسكورد غير مفعّل على الموقع — أضف DISCORD_CLIENT_ID و DISCORD_CLIENT_SECRET.",
      503,
    );
  }
  return secret;
}

// ── Stored link ──────────────────────────────────────────────────────────────

export type DiscordLink = {
  userId: string;
  discordId: string;
  username: string | null;
  globalName: string | null;
  avatar: string | null;
  scope: string;
  /**
   * ms since the epoch. Stored 60s earlier than Discord's real expiry, so
   * "now >= expiresAt" is already the signal to refresh.
   */
  expiresAt: number;
};

type LinkRow = {
  user_id: string;
  discord_id: string;
  username: string | null;
  global_name: string | null;
  avatar: string | null;
  access_token: string;
  refresh_token: string | null;
  scope: string;
  expires_at: number;
};

/** Public, non-secret view of a link — safe to send to the browser. */
export type DiscordLinkInfo = DiscordLink & { avatarUrl: string | null };

type DirectDiscordAccountRow = {
  discord_id: string;
  display_name: string | null;
  image_url: string | null;
  scope: string | null;
  access_token_expires_at: string | Date | null;
};

function toInfo(row: LinkRow): DiscordLinkInfo {
  return {
    userId: row.user_id,
    discordId: row.discord_id,
    username: row.username,
    globalName: row.global_name,
    avatar: row.avatar,
    scope: row.scope,
    expiresAt: Number(row.expires_at),
    avatarUrl: discordAvatarUrl(row.discord_id, row.avatar),
  };
}

/** CDN avatar for a Discord user, or null when they have none. */
export function discordAvatarUrl(discordId: string, hash: string | null): string | null {
  if (!hash) return null;
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${ext}?size=64`;
}

async function readLink(userId: string): Promise<LinkRow | null> {
  const sql = await getSql();
  const rows = await sql.query<LinkRow>(
    `select user_id, discord_id, username, global_name, avatar, access_token, refresh_token, scope, expires_at
       from discord_links where user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * A direct Discord sign-in is stored by Better Auth in `account`, not in our
 * optional `discord_links` table. Keep this lookup separate because OAuth
 * tokens in `account` may be encrypted by Better Auth and must be obtained
 * through auth.api.getAccessToken(), never by reading the column directly.
 */
async function readDirectDiscordAccount(userId: string): Promise<DirectDiscordAccountRow | null> {
  const sql = await getSql();
  const rows = await sql.query<DirectDiscordAccountRow>(
    `select a."accountId" as discord_id,
            u."name" as display_name,
            u."image" as image_url,
            a."scope" as scope,
            a."accessTokenExpiresAt" as access_token_expires_at
       from "account" a
       join "user" u on u."id" = a."userId"
      where a."userId" = $1
        and a."providerId" = 'discord'
      order by a."updatedAt" desc
      limit 1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** Public identity for a user who signed in directly through Discord. */
export async function getDirectDiscordLinkInfo(userId: string): Promise<DiscordLinkInfo | null> {
  const row = await readDirectDiscordAccount(userId);
  if (!row) return null;
  const expiresAt =
    row.access_token_expires_at instanceof Date
      ? row.access_token_expires_at.getTime()
      : row.access_token_expires_at
        ? new Date(row.access_token_expires_at).getTime()
        : 0;
  return {
    userId,
    discordId: row.discord_id,
    username: row.display_name,
    globalName: row.display_name,
    avatar: null,
    scope: row.scope ?? "",
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
    avatarUrl: row.image_url,
  };
}

/** The visitor's link, or null. Never includes a token. */
export async function getLinkInfo(userId: string): Promise<DiscordLinkInfo | null> {
  const row = await readLink(userId);
  return row ? toInfo(row) : null;
}

async function writeLink(
  userId: string,
  discordId: string,
  profile: { username: string | null; globalName: string | null; avatar: string | null },
  tokens: { accessToken: string; refreshToken: string | null; expiresIn: number; scope: string },
): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into discord_links
       (user_id, discord_id, username, global_name, avatar, access_token, refresh_token, scope, expires_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     on conflict (user_id) do update set
       discord_id = excluded.discord_id,
       username = excluded.username,
       global_name = excluded.global_name,
       avatar = excluded.avatar,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       scope = excluded.scope,
       expires_at = excluded.expires_at,
       updated_at = now()`,
    [
      userId,
      discordId,
      profile.username,
      profile.globalName,
      profile.avatar,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.scope || DISCORD_SCOPES,
      // Refresh a minute early so a call landing on the boundary never 401s.
      Date.now() + Math.max(60_000, tokens.expiresIn * 1000 - 60_000),
    ],
  );
}

/** Drop the link (the Discord side keeps its own grant; we just forget it). */
export async function deleteLink(userId: string): Promise<void> {
  const sql = await getSql();
  await sql.query("delete from discord_links where user_id = $1", [userId]);
}

// ── CSRF state ───────────────────────────────────────────────────────────────
// Signed, not stored: the authorize and callback legs can land on different
// serverless instances, so a server-side session store would be unreliable. The
// HMAC key comes from an injected secret (stable across instances), with a
// per-process fallback for local dev.

const STATE_COOKIE = "vexon_discord_state";
const STATE_TTL_MS = 10 * 60_000;

const globalRef = globalThis as typeof globalThis & {
  __vexonDiscordStateSecret__?: string;
};

function stateSecret(): string {
  const stable =
    env("DISCORD_STATE_SECRET") ??
    env("BOT_ADMIN_TOKEN_SECRET") ??
    env("BETTER_AUTH_SECRET") ??
    getDiscordClientSecret();
  if (stable) return stable;
  globalRef.__vexonDiscordStateSecret__ ??= randomBytes(32).toString("hex");
  return globalRef.__vexonDiscordStateSecret__;
}

function hmac(value: string): string {
  return createHmac("sha256", stateSecret()).update(value).digest("base64url");
}

/** `${userId}.${expiresAt}.${nonce}.${popup}.${sig}` — the userId binds the flow to the session. */
export function signState(userId: string, popup: boolean): string {
  const payload = `${userId}.${Date.now() + STATE_TTL_MS}.${randomBytes(8).toString("hex")}.${popup ? 1 : 0}`;
  return `${payload}.${hmac(payload)}`;
}

/**
 * Who a state was issued to (and whether it started in a popup), or null when it
 * is forged, mangled or stale.
 */
export function verifyState(raw: string | null | undefined): { userId: string; popup: boolean } | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 5) return null;
  const [userId, expiresAt, nonce, popup, sig] = parts;
  if (!userId || !nonce || !sig) return null;
  const expected = hmac(`${userId}.${expiresAt}.${nonce}.${popup}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return null;
  return { userId, popup: popup === "1" };
}

export const stateCookieName = STATE_COOKIE;

/** Cookie attributes for the state — lax so the OAuth redirect carries it. */
export function stateCookie(value: string): string {
  return `${STATE_COOKIE}=${value}; Path=/; Max-Age=${Math.floor(STATE_TTL_MS / 1000)}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearStateCookie(): string {
  return `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/** Read a cookie off a raw `Cookie` header (no framework helper needed). */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

// ── OAuth legs ───────────────────────────────────────────────────────────────

/**
 * Where Discord sends the user back. Explicit env wins; otherwise derived from
 * the incoming request so local dev, the preview and the deployed URL all work
 * without a second knob. Whatever it resolves to must be registered on the
 * Discord application's redirect list.
 */
export function callbackUrl(requestUrl: string): string {
  const explicit = env("DISCORD_REDIRECT_URI");
  if (explicit) return explicit;
  return new URL("/api/discord/callback", requestUrl).toString();
}

export function authorizationUrl(state: string, redirectUri: string): string {
  const clientId = getDiscordClientId();
  if (!clientId) {
    throw new DiscordLinkError(
      "ربط ديسكورد غير مفعّل على الموقع — أضف DISCORD_CLIENT_ID و DISCORD_CLIENT_SECRET.",
      503,
    );
  }
  const url = new URL(`${DISCORD_API}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DISCORD_SCOPES);
  url.searchParams.set("state", state);
  // Re-pick the account instead of silently reusing the last Discord session.
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

async function discordJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

async function postToken(form: URLSearchParams): Promise<TokenResponse> {
  const secret = assertConfigured();
  const clientId = getDiscordClientId();
  if (!clientId) {
    throw new DiscordLinkError(
      "ربط ديسكورد غير مفعّل على الموقع — أضف DISCORD_CLIENT_ID و DISCORD_CLIENT_SECRET.",
      503,
    );
  }
  form.set("client_id", clientId);
  form.set("client_secret", secret);
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await discordJson(res)) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new DiscordLinkError(
      data.error_description || data.error || `ديسكورد رفض الطلب (${res.status}).`,
      res.status === 429 ? 429 : 400,
    );
  }
  return data;
}

/** Exchange the authorization code, fetch the profile, and store the link. */
export async function linkWithCode(
  userId: string,
  code: string,
  redirectUri: string,
): Promise<DiscordLinkInfo> {
  assertConfigured();
  const tokens = await postToken(
    new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  );
  const me = await fetchDiscordUser(tokens.access_token);
  await writeLink(
    userId,
    me.id,
    { username: me.username, globalName: me.global_name, avatar: me.avatar },
    {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: Number(tokens.expires_in) || 604_800,
      scope: tokens.scope ?? DISCORD_SCOPES,
    },
  );
  const row = await readLink(userId);
  if (!row) throw new DiscordLinkError("تعذر حفظ ربط الحساب.", 500);
  return toInfo(row);
}

async function fetchDiscordUser(token: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await discordJson(res)) as DiscordUser & { message?: string };
  if (!res.ok || !data.id) {
    throw new DiscordLinkError(data.message || `تعذر قراءة حساب ديسكورد (${res.status}).`, 502);
  }
  return data;
}

async function refreshLink(row: LinkRow): Promise<LinkRow | null> {
  if (!row.refresh_token) return null;
  try {
    const tokens = await postToken(
      new URLSearchParams({ grant_type: "refresh_token", refresh_token: row.refresh_token }),
    );
    await writeLink(
      row.user_id,
      row.discord_id,
      { username: row.username, globalName: row.global_name, avatar: row.avatar },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? row.refresh_token,
        expiresIn: Number(tokens.expires_in) || 604_800,
        scope: tokens.scope ?? row.scope,
      },
    );
    return await readLink(row.user_id);
  } catch {
    // Refresh tokens are single-use on Discord: a rejected one means the grant
    // is gone. Forget the link so the UI asks for a re-link instead of retrying.
    await deleteLink(row.user_id).catch(() => undefined);
    return null;
  }
}

/**
 * A working Discord access token for this site user, refreshing when close to
 * expiry. `null` = never linked, or the grant expired and needs re-linking.
 */
export async function getAccessToken(
  userId: string,
  bearerToken?: string,
): Promise<{ discordId: string; token: string; source: "link" | "login" } | null> {
  if (!isDiscordConfigured()) return null;
  let row = await readLink(userId);
  if (row) {
    if (Number(row.expires_at) <= Date.now()) {
      row = await refreshLink(row);
      if (!row) return null;
    }
    return { discordId: row.discord_id, token: row.access_token, source: "link" };
  }

  return getDirectDiscordAccessToken(userId, bearerToken);
}

/** Get the Better Auth Discord token without consulting `discord_links`. */
export async function getDirectDiscordAccessToken(
  userId: string,
  bearerToken?: string,
): Promise<{ discordId: string; token: string; source: "login" } | null> {
  // Direct Discord sign-in: ask Better Auth for the decrypted/refreshable
  // provider token. This also works in live preview when the bearer token is
  // forwarded by authMiddleware.
  const direct = await readDirectDiscordAccount(userId);
  if (!direct) return null;
  const request = getRequest();
  if (!request) return null;
  const headers = new Headers(request.headers);
  if (bearerToken) headers.set("authorization", `Bearer ${bearerToken}`);
  try {
    const result = (await auth.api.getAccessToken({
      body: { providerId: "discord" },
      headers,
    })) as {
      accessToken?: string | null;
      data?: { accessToken?: string | null };
    };
    const token = result.accessToken ?? result.data?.accessToken;
    return token ? { discordId: direct.discord_id, token, source: "login" } : null;
  } catch (error) {
    console.error("[discord] Better Auth token lookup failed:", error);
    return null;
  }
}

/** Force-refresh a custom Discord link after Discord rejects its access token. */
export async function refreshLinkedAccessToken(
  userId: string,
): Promise<{ discordId: string; token: string; source: "link" } | null> {
  const row = await readLink(userId);
  if (!row) return null;
  const fresh = await refreshLink(row);
  return fresh
    ? { discordId: fresh.discord_id, token: fresh.access_token, source: "link" }
    : null;
}

export type DiscordGuildRef = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

/** True when the visitor owns the guild or holds Administrator there. */
export function isGuildManager(guild: { owner: boolean; permissions: string }): boolean {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions) & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

/**
 * The visitor's servers straight from Discord (`scope: guilds`). Callers must
 * still intersect this with the bot's own guild list — being an admin somewhere
 * says nothing about whether Vexon is installed there.
 */
export async function fetchUserGuilds(token: string): Promise<DiscordGuildRef[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
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
  const data = (await discordJson(res)) as DiscordGuildRef[];
  if (!Array.isArray(data)) return [];
  return data.filter((g) => g && typeof g.id === "string");
}

