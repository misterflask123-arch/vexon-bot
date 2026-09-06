import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/**
 * Discord link status for the dashboard UI.
 *
 * The link itself is created by the two server routes under
 * `src/routes/api/discord/` (real Discord OAuth2). This module only exposes what
 * the UI needs to render: whether the flow is configured at all, and who is
 * linked. Tokens stay server-side.
 */

export type DiscordLinkStatus = {
  /** False when DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET are missing. */
  configured: boolean;
  linked: boolean;
  discordId: string | null;
  /** Discord's display name, falling back to the username. */
  displayName: string | null;
  avatarUrl: string | null;
  /** Whether the identity comes from the optional link flow or direct login. */
  source: "linked" | "login" | null;
};

export const getDiscordLinkStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DiscordLinkStatus> => {
    const { isDiscordConfigured, getLinkInfo, getDirectDiscordLinkInfo } =
      await import("@/lib/discord/oauth.server");
    const configured = isDiscordConfigured();
    const linkedAccount = configured ? await getLinkInfo(context.userId) : null;
    const loginAccount =
      configured && !linkedAccount ? await getDirectDiscordLinkInfo(context.userId) : null;
    const link = linkedAccount ?? loginAccount;
    return {
      configured,
      linked: Boolean(link),
      discordId: link?.discordId ?? null,
      displayName: link ? (link.globalName || link.username || link.discordId) : null,
      avatarUrl: link?.avatarUrl ?? null,
      source: linkedAccount ? "linked" : loginAccount ? "login" : null,
    };
  });

/** Forget the stored Discord grant. The dashboard stops working until re-linked. */
export const unlinkDiscord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { deleteLink } = await import("@/lib/discord/oauth.server");
    await deleteLink(context.userId);
    return { ok: true };
  });

/**
 * Start the Discord OAuth flow from the browser.
 *
 * Inside an iframe (the Grok live preview) a top-level navigation to
 * discord.com cannot render — Discord refuses to be framed — so the flow runs in
 * a popup there and posts the result back to the opener. Everywhere else it is a
 * normal same-tab redirect.
 */
export function startDiscordLink(): void {
  if (typeof window === "undefined") return;
  const framed = window.self !== window.top;
  if (!framed) {
    window.location.href = "/api/discord/authorize";
    return;
  }
  window.open(`/api/discord/authorize?popup=1`, `vexon-discord-${Date.now()}`, "popup,width=520,height=680");
}

/** Message the popup leg posts back to its opener when the flow finishes. */
export type DiscordLinkMessage = {
  source: "vexon-discord-link";
  status: "linked" | "denied" | "failed" | "signin";
  reason: string | null;
};

export function isDiscordLinkMessage(data: unknown): data is DiscordLinkMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === "vexon-discord-link"
  );
}
