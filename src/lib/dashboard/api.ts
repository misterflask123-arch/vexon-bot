/**
 * Dashboard ↔ bot bridge (server functions).
 *
 * There is no dashboard database any more. Every read and every write here is a
 * single HTTPS call to the bot's own `/admin/*` API, so the dashboard shows the
 * bot's real SQLite data and every mutation runs through the exact same module
 * functions the slash commands use (`moderation.ts`, `customCommands.ts`,
 * `tickets.ts`, `serverSystems.ts`, …).
 *
 * Trust chain, per call:
 *   1. `authMiddleware` proves the Better Auth session and yields `context.userId`.
 *   2. That user's linked Discord account (`discord_links`) supplies a real
 *      Discord user id — there is no way to name an arbitrary one.
 *   3. We sign a **one-shot** HS256 token (≤60s, unique `jti`, bound to the
 *      guild) with the secret shared with the bot.
 *   4. The bot verifies the signature, then re-fetches the member from Discord
 *      and requires Owner/Administrator before touching anything.
 *
 * So the site is never trusted with authority it hasn't earned: steal the token
 * and you still have to be an admin of that guild on Discord, within a minute,
 * once.
 *
 * Env (site):
 *   BOT_ADMIN_URL           bot origin, e.g. http://node1.waifly.com:25198
 *   BOT_ADMIN_TOKEN_SECRET  must equal the bot's ADMIN_TOKEN_SECRET
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  AuditEntry,
  AutoReact,
  AutomodConfig,
  AutomodWord,
  CustomAction,
  CustomCommand,
  GameScore,
  Giveaway,
  GuildMeta,
  GuildSummary,
  InviteRow,
  KnowledgeItem,
  ModActionResult,
  ModCase,
  Overview,
  Poll,
  RoleMenu,
  StatsChannels,
  Suggestion,
  TicketPanel,
  TicketRow,
  WarnLadder,
  Warning,
  WelcomeConfig,
} from "./types";

/** `aud` the bot requires — keeps our tokens unusable anywhere else. */
const ADMIN_AUD = "vexon-admin";
/** Token lifetime. The bot rejects anything older than 120s, so stay well under. */
const TOKEN_TTL_S = 60;
const DEFAULT_BOT_URL = "http://node1.waifly.com:25198";

const GUILD_ID = /^\d{5,25}$/;

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

/** Shown verbatim in the UI, so it tells the visitor what to do next. */
export const NOT_LINKED_MESSAGE =
  "حساب ديسكورد غير مربوط — اربطه من أعلى صفحة لوحة التحكم لتظهر سيرفراتك الحقيقية.";

/**
 * One call to the bot. A FRESH token is minted per call because the bot enforces
 * single-use `jti`s — never cache or retry with one.
 */
async function botCall<T>(
  userId: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  opts: {
    guildId?: string;
    body?: unknown;
    query?: Record<string, string | number>;
    bearerToken?: string;
  } = {},
): Promise<T> {
  const { guildId, body, query, bearerToken } = opts;
  if (guildId !== undefined && !GUILD_ID.test(guildId)) {
    throw new Error("معرّف السيرفر غير صالح.");
  }

  // Server-only modules are imported lazily so the browser bundle never sees
  // `node:crypto` or the Discord token store.
  const [{ getAccessToken }, { SignJWT }, { randomUUID }] = await Promise.all([
    import("@/lib/discord/oauth.server"),
    import("jose"),
    import("node:crypto"),
  ]);

  const linked = await getAccessToken(userId, bearerToken);
  if (!linked) throw new Error(NOT_LINKED_MESSAGE);

  const secret = env("BOT_ADMIN_TOKEN_SECRET");
  if (!secret) {
    throw new Error("لوحة التحكم غير مفعّلة على الموقع — أضف BOT_ADMIN_TOKEN_SECRET (نفس قيمة ADMIN_TOKEN_SECRET عند البوت).");
  }

  const nowS = Math.floor(Date.now() / 1000);
  const token = await new SignJWT(guildId ? { gid: guildId } : {})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(ADMIN_AUD)
    .setSubject(linked.discordId)
    .setIssuedAt(nowS)
    .setJti(randomUUID())
    .setExpirationTime(nowS + TOKEN_TTL_S)
    .sign(new TextEncoder().encode(secret));
 console.log("🔍 BOT URL FINAL:", env("BOT_ADMIN_URL"), "| DEFAULT:", DEFAULT_BOT_URL);
    const base = (env("BOT_ADMIN_URL") ?? DEFAULT_BOT_URL).replace(/\/+$/, "");
  const url = new URL(`/admin/${guildId ? `${guildId}/` : ""}${path}`, base);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));

  let res: Response;
  try {
 console.log("🔍 FETCHING URL:", url.toString());
    res = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error("انتهت مهلة الاتصال بالبوت — أعد المحاولة.");
    }
    throw new Error("تعذر الوصول إلى البوت. تأكد أنه يعمل وأن BOT_ADMIN_URL صحيح.");
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    // The bot always answers `{ error }` in Arabic; pass it straight through.
    const message = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" && message ? message : `رفض البوت الطلب (${res.status}).`);
  }
  return data as T;
}

/** Read helper: everything but `listGuilds` is guild-scoped. */
function botGet<T>(
  userId: string,
  guildId: string,
  path: string,
  query?: Record<string, string | number>,
  bearerToken?: string,
) {
  return botCall<T>(userId, "GET", path, { guildId, query, bearerToken });
}

/** Write helper — the bot audit-logs every non-GET automatically. */
function botSend<T>(
  userId: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  guildId: string,
  path: string,
  body?: unknown,
  bearerToken?: string,
) {
  return botCall<T>(userId, method, path, { guildId, body, bearerToken });
}

type Ok = { ok: boolean };

// ── السيرفرات ────────────────────────────────────────────────────────────────

/**
 * The visitor's manageable servers — filtered by BOTH conditions at once:
 *
 *   1. Discord itself says they are the Owner or hold Administrator
 *      (`GET /users/@me/guilds`, scope `guilds`).
 *   2. The bot confirms Vexon is actually in that guild AND re-checks the
 *      permission from its own side (`POST /admin/guilds`).
 *
 * A server appears only when both agree.
 */
export const listGuilds = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<GuildSummary[]> => {
    const {
      DiscordLinkError,
      getAccessToken,
      getDirectDiscordAccessToken,
      refreshLinkedAccessToken,
      fetchUserGuilds,
      isGuildManager,
    } = await import("@/lib/discord/oauth.server");
    let linked = await getAccessToken(context.userId, context.bearerToken);
    if (!linked) throw new Error(NOT_LINKED_MESSAGE);

    let mine;
    try {
      mine = await fetchUserGuilds(linked.token);
    } catch (error) {
      // A Discord grant can be revoked before its stored expiry. Recover once
      // without forcing the user through another week of manual debugging:
      // refresh the custom link, then prefer a newer direct Discord-login token.
      if (!(error instanceof DiscordLinkError) || error.upstreamStatus !== 401) throw error;
      const refreshed = linked.source === "link" ? await refreshLinkedAccessToken(context.userId) : null;
      const direct = await getDirectDiscordAccessToken(context.userId, context.bearerToken);
      linked = direct ?? refreshed;
      if (!linked) {
        throw new Error("توكن ديسكورد منتهي أو ملغى — اضغط «إلغاء الربط» ثم أعد ربط حساب ديسكورد.");
      }
      mine = await fetchUserGuilds(linked.token);
    }
    const ids = mine.filter(isGuildManager).map((g) => g.id).slice(0, 200);
    if (!ids.length) return [];

    // No `gid` here — this is the one cross-guild call, and the bot rejects a
    // guild-scoped token on it.
    return botCall<GuildSummary[]>(context.userId, "POST", "guilds", {
      body: { ids },
      bearerToken: context.bearerToken,
    });
  });

// ── نظرة عامة وإعدادات ───────────────────────────────────────────────────────

export const getOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(async ({ context, data }): Promise<Overview> =>
    botGet(context.userId, data.guildId, "overview", undefined, context.bearerToken),
  );

export const getGuild = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(async ({ context, data }): Promise<GuildMeta> =>
    botGet(context.userId, data.guildId, "meta", undefined, context.bearerToken),
  );

export const saveGuildSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      guildId: string;
      staffRoleId: string | null;
      logChannelId: string | null;
      modLogChannelId: string | null;
      ticketLogChannelId: string | null;
      locale: string;
    }) => d,
  )
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "PATCH", guildId, "settings", body, context.bearerToken);
  });

export const saveCommandPerm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; commandKey: string; roleIds: string[] }) => d)
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "PUT", guildId, "command-perm", body, context.bearerToken);
  });

// ── سجل التدقيق ──────────────────────────────────────────────────────────────

/** What the bot sends — `detail` arrives structured and is flattened to JSON text. */
type BotAuditEntry = Omit<AuditEntry, "detail"> & { detail: Record<string, unknown> | null };

/** Who changed what in this guild, newest first — written by the bot itself. */
export const getAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; limit?: number }) => d)
  .handler(async ({ context, data }): Promise<AuditEntry[]> => {
    const res = await botGet<{ entries: BotAuditEntry[] }>(
      context.userId,
      data.guildId,
      "audit",
      { limit: data.limit ?? 50 },
      context.bearerToken,
    );
    return (res.entries ?? []).map((e) => ({ ...e, detail: e.detail == null ? null : JSON.stringify(e.detail) }));
  });

// ── الحماية ──────────────────────────────────────────────────────────────────

export const getAutomod = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(
    async ({ context, data }): Promise<{ config: AutomodConfig; words: AutomodWord[] }> =>
      botGet(context.userId, data.guildId, "automod", undefined, context.bearerToken),
  );

export const saveAutomod = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; config: AutomodConfig }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(context.userId, "PATCH", data.guildId, "automod", { config: data.config }, context.bearerToken),
  );

export const addBlockedWord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; word: string; action: string; durationMs: number | null }) => d)
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "automod/words", body, context.bearerToken);
  });

export const removeBlockedWord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(context.userId, "DELETE", data.guildId, `automod/words/${Number(data.id)}`, undefined, context.bearerToken),
  );

// ── الأوامر المخصصة ──────────────────────────────────────────────────────────

export const getCustomCommands = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(async ({ context, data }): Promise<CustomCommand[]> => {
    const res = await botGet<{ commands: CustomCommand[] }>(
      context.userId,
      data.guildId,
      "custom",
      undefined,
      context.bearerToken,
    );
    return res.commands ?? [];
  });

export const saveCustomCommand = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      guildId: string;
      id?: number;
      trigger: string;
      matchMode: string;
      staffOnly: boolean;
      allowedRoleIds: string[];
      requiredPerm: string | null;
      cooldownSeconds: number;
      enabled: boolean;
      actions: CustomAction[];
    }) => d,
  )
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "custom", body, context.bearerToken);
  });

export const deleteCustomCommand = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(context.userId, "DELETE", data.guildId, `custom/${Number(data.id)}`, undefined, context.bearerToken),
  );

// ── الإشراف ──────────────────────────────────────────────────────────────────

export const getModeration = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(
    async ({ context, data }): Promise<{ warnings: Warning[]; cases: ModCase[]; ladders: WarnLadder[] }> =>
      botGet(context.userId, data.guildId, "moderation", undefined, context.bearerToken),
  );

export const addWarningFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; targetId: string; reason: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: boolean; id: number; count: number }> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "warnings", body, context.bearerToken);
  });

export const removeWarningFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(context.userId, "DELETE", data.guildId, `warnings/${Number(data.id)}`, undefined, context.bearerToken),
  );

export const saveLadder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { guildId: string; warnCount: number; action: string; durationMs: number | null; remove?: boolean }) => d,
  )
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "PUT", guildId, "ladder", body, context.bearerToken);
  });

/**
 * The moderation actions the bot runs through `moderation.ts` — ban, kick,
 * timeout and the rest of `/mod`. `action` is validated against the bot's own
 * list; the fields each action needs are optional here and enforced there.
 */
export const runModAction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      guildId: string;
      action: string;
      targetId?: string;
      reason?: string;
      durationMs?: number | null;
      deleteMessageSeconds?: number;
      channelId?: string | null;
      amount?: number;
      seconds?: number;
      nickname?: string | null;
      roleId?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }): Promise<ModActionResult> => {
    const { guildId, action, ...body } = data;
    return botSend(context.userId, "POST", guildId, `mod/${encodeURIComponent(action)}`, body, context.bearerToken);
  });

// ── التذاكر ──────────────────────────────────────────────────────────────────

export const getTicketsPage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(
    async ({ context, data }): Promise<{ panels: TicketPanel[]; tickets: TicketRow[]; knowledge: KnowledgeItem[] }> =>
      botGet(context.userId, data.guildId, "tickets", undefined, context.bearerToken),
  );

export const saveTicketPanel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      guildId: string;
      id?: number;
      channelId: string;
      title: string;
      description: string;
      style: string;
      categories: TicketPanel["categories"];
      staffRoleIds: string[];
      maxOpenPerUser: number;
      autocloseMs: number;
      aiEnabled: boolean;
    }) => d,
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: number }> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "tickets/panels", body, context.bearerToken);
  });

export const deleteTicketPanel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(context.userId, "DELETE", data.guildId, `tickets/panels/${Number(data.id)}`, undefined, context.bearerToken),
  );

export const closeTicketFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number; reopen?: boolean }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(
      context.userId,
      "POST",
      data.guildId,
      `tickets/${Number(data.id)}`,
      { reopen: data.reopen === true },
      context.bearerToken,
    ),
  );

export const saveKnowledge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id?: number; title: string; content: string; remove?: boolean }) => d)
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: number }> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "knowledge", body, context.bearerToken);
  });

// ── أنظمة السيرفر ────────────────────────────────────────────────────────────

export const getServerSystems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(
    async ({
      context,
      data,
    }): Promise<{
      welcome: WelcomeConfig;
      menus: RoleMenu[];
      suggestions: Suggestion[];
      giveaways: Giveaway[];
      polls: Poll[];
      autoReact: AutoReact[];
      stats: StatsChannels;
      }> => botGet(context.userId, data.guildId, "server", undefined, context.bearerToken),
  );

export const saveWelcome = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string } & WelcomeConfig) => d)
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "PATCH", guildId, "welcome", body, context.bearerToken);
  });

export const saveRoleMenu = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      guildId: string;
      id?: number;
      remove?: boolean;
      channelId: string;
      mode: string;
      title: string;
      uniquePick: boolean;
      options: RoleMenu["options"];
    }) => d,
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: number }> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "role-menus", body, context.bearerToken);
  });

export const setSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number; status: string }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(
      context.userId,
      "PATCH",
      data.guildId,
      `suggestions/${Number(data.id)}`,
      { status: data.status },
      context.bearerToken,
    ),
  );

export const saveGiveaway = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; channelId: string; prize: string; winners: number; endsAt: number }) => d)
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: number }> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "giveaways", body, context.bearerToken);
  });

export const endGiveaway = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; id: number }) => d)
  .handler(async ({ context, data }): Promise<Ok> =>
    botSend(context.userId, "POST", data.guildId, `giveaways/end/${Number(data.id)}`, undefined, context.bearerToken),
  );

export const savePoll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: { guildId: string; channelId: string; question: string; options: string[]; endsAt: number | null }) => d,
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: number }> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "polls", body, context.bearerToken);
  });

export const saveAutoReact = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; channelId: string; emojis: string[]; remove?: boolean }) => d)
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "PUT", guildId, "auto-react", body, context.bearerToken);
  });

/**
 * Stats channels are owned by the bot (`setupStats` creates them, `refreshStats`
 * renames them), so there is nothing to submit — this only asks it to create or
 * refresh, and returns the channels it now has.
 */
export const saveStatsChannels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(async ({ context, data }): Promise<{ ok: boolean; stats: StatsChannels }> =>
    botSend(context.userId, "POST", data.guildId, "stats-channels", undefined, context.bearerToken),
  );

// ── الدعوات والألعاب ─────────────────────────────────────────────────────────

export const getInvites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(async ({ context, data }): Promise<InviteRow[]> => {
    const res = await botGet<{ rows: InviteRow[] }>(
      context.userId,
      data.guildId,
      "invites",
      undefined,
      context.bearerToken,
    );
    return res.rows ?? [];
  });

export const getGames = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string }) => d)
  .handler(async ({ context, data }): Promise<GameScore[]> => {
    const res = await botGet<{ rows: GameScore[] }>(
      context.userId,
      data.guildId,
      "games",
      undefined,
      context.bearerToken,
    );
    return res.rows ?? [];
  });

export const adjustPoints = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { guildId: string; memberId: string; delta: number; reset?: boolean; resetAll?: boolean }) => d)
  .handler(async ({ context, data }): Promise<Ok> => {
    const { guildId, ...body } = data;
    return botSend(context.userId, "POST", guildId, "games/points", body, context.bearerToken);
  });
