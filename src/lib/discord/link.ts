import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/**
 * Discord link status for the dashboard UI.
 *
 * Discord is no longer linked through a second OAuth flow or a `discord_links`
 * row. A Discord access token is captured by Better Auth during Discord sign-in
 * and stored on that Better Auth session. This module only exposes the
 * session-backed status needed by the dashboard; the token never reaches the
 * browser.
 */

export type DiscordLinkStatus = {
  /** False when DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET are missing. */
  configured: boolean;
  linked: boolean;
  discordId: string | null;
  /** Discord's display name, falling back to the username. */
  displayName: string | null;
  avatarUrl: string | null;
  source: "login" | null;
};

export const getDiscordLinkStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DiscordLinkStatus> => {
    const { isDiscordConfigured, getSessionDiscordGrant } = await import("@/lib/discord/oauth.server");
    const configured = isDiscordConfigured();
    const grant = configured ? await getSessionDiscordGrant(context.bearerToken) : null;
    return {
      configured,
      linked: Boolean(grant),
      discordId: grant?.discordId ?? null,
      displayName: grant?.displayName ?? null,
      avatarUrl: grant?.avatarUrl ?? null,
      source: grant ? "login" : null,
    };
  });
