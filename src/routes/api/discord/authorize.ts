import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import {
  authorizationUrl,
  callbackUrl,
  isDiscordConfigured,
  signState,
  stateCookie,
} from "@/lib/discord/oauth.server";

/**
 * Leg 1 of the Discord link: bounce the signed-in visitor to Discord's consent
 * screen. `?popup=1` (sent when the app is inside an iframe, where a top-level
 * navigation to discord.com cannot render) is carried in the signed state so the
 * callback knows to answer the opener instead of redirecting.
 *
 * Every failure path lands back on /dashboard, which reads the link status and
 * explains what is missing — no dead-end error pages.
 */
export const Route = createFileRoute("/api/discord/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const back = new URL("/dashboard", request.url);
        if (!isDiscordConfigured()) {
          back.searchParams.set("discord", "unavailable");
          return Response.redirect(back.toString(), 302);
        }
        const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
        if (!session?.user?.id) {
          back.searchParams.set("discord", "signin");
          return Response.redirect(back.toString(), 302);
        }
        const url = new URL(request.url);
        const state = signState(session.user.id, url.searchParams.get("popup") === "1");
        return new Response(null, {
          status: 302,
          headers: {
            location: authorizationUrl(state, callbackUrl(request.url)),
            "set-cookie": stateCookie(state),
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
