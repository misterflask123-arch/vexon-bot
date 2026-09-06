import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import {
  callbackUrl,
  clearStateCookie,
  DiscordLinkError,
  linkWithCode,
  readCookie,
  stateCookieName,
  verifyState,
} from "@/lib/discord/oauth.server";

/**
 * Leg 2 of the Discord link: exchange the code, store the grant against the
 * signed-in Better Auth user, and send the visitor back to the dashboard.
 *
 * The state is checked three ways — signature, match against the cookie it was
 * issued in (double-submit), and match against the live session — so a code
 * obtained by someone else cannot be attached to this account.
 */
export const Route = createFileRoute("/api/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const rawState = url.searchParams.get("state");
        const issued = verifyState(readCookie(request.headers.get("cookie"), stateCookieName));
        const popup = Boolean(issued?.popup);

        // Discord's own refusal (the visitor hit "Cancel" on the consent screen).
        const denied = url.searchParams.get("error");
        if (denied) return finish(request, popup, "denied", denied);

        const code = url.searchParams.get("code");
        if (!code || !issued || !rawState) {
          return finish(request, popup, "failed", "رابط الربط منتهي أو ناقص.");
        }
        // Double-submit: the signed state must be the one this browser was given.
        if (rawState !== readCookie(request.headers.get("cookie"), stateCookieName)) {
          return finish(request, popup, "failed", "تعذر تأكيد جلسة الربط.");
        }

        const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
        if (session?.user?.id !== issued.userId) {
          return finish(request, popup, "signin", null);
        }

        try {
          await linkWithCode(issued.userId, code, callbackUrl(request.url));
          return finish(request, popup, "linked", null);
        } catch (err) {
          const message =
            err instanceof DiscordLinkError ? err.message : "تعذر إتمام ربط حساب ديسكورد.";
          if (!(err instanceof DiscordLinkError)) console.error("[discord] link failed:", err);
          return finish(request, popup, "failed", message);
        }
      },
    },
  },
});

type Status = "linked" | "denied" | "failed" | "signin";

function finish(request: Request, popup: boolean, status: Status, reason: string | null): Response {
  // A popup has no top-level context to redirect into, so it reports back to its
  // opener and closes itself; the dashboard page listening for that message
  // reloads the server list.
  if (popup) return popupDone(status, reason);
  const back = new URL("/dashboard", request.url);
  back.searchParams.set("discord", status);
  if (reason && status === "failed") back.searchParams.set("reason", reason.slice(0, 160));
  return new Response(null, {
    status: 302,
    headers: { location: back.toString(), "set-cookie": clearStateCookie(), "cache-control": "no-store" },
  });
}

/**
 * Self-contained completion page for the popup leg. Nothing here interpolates
 * the request — `reason` is rendered as text via `textContent`, so a message
 * coming back from Discord cannot inject markup.
 */
function popupDone(status: Status, reason: string | null): Response {
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>ربط ديسكورد</title>
<style>
  body{margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0d12;color:#e6e8ee;
       font:14px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px}
  p{margin:8px 0 0;color:#9aa0ad;max-width:22rem}
</style></head>
<body>
  <div><strong id="t">جارٍ الإغلاق…</strong><p id="r"></p></div>
  <script>
    var status = ${JSON.stringify(status)};
    var reason = ${JSON.stringify(reason ?? "")};
    var titles = { linked: "تم ربط حساب ديسكورد", denied: "ألغيت الربط", failed: "تعذر الربط", signin: "انتهت الجلسة" };
    document.getElementById("t").textContent = titles[status] || "تم";
    if (reason) document.getElementById("r").textContent = reason;
    try {
      window.opener && window.opener.postMessage(
        { source: "vexon-discord-link", status: status, reason: reason || null },
        window.location.origin
      );
    } catch (e) { /* opener gone — the dashboard re-reads the status on focus */ }
    setTimeout(function () { window.close(); }, status === "linked" ? 900 : 4000);
  </script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "set-cookie": clearStateCookie(),
      "cache-control": "no-store",
    },
  });
}
