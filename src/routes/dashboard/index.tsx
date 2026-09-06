import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, Link2, Server, Shield, Unlink } from "lucide-react";
import { AuthGate, DashUser } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/dashboard/primitives";
import { listGuilds } from "@/lib/dashboard/api";
import type { GuildSummary } from "@/lib/dashboard/types";
import {
  getDiscordLinkStatus,
  isDiscordLinkMessage,
  startDiscordLink,
  unlinkDiscord,
  type DiscordLinkStatus,
} from "@/lib/discord/link";

/** `?discord=…` is set by the OAuth callback so the visitor gets real feedback. */
type DashboardSearch = { discord?: string; reason?: string };

export const Route = createFileRoute("/dashboard/")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    discord: typeof search.discord === "string" ? search.discord : undefined,
    reason: typeof search.reason === "string" ? search.reason : undefined,
  }),
  head: () => ({ meta: [{ title: "لوحة التحكم | Vexon" }] }),
  component: DashboardHome,
});

const BANNERS: Record<string, { tone: "success" | "danger" | "warn"; text: string }> = {
  linked: { tone: "success", text: "تم ربط حساب ديسكورد — هذه سيرفراتك الحقيقية الآن." },
  denied: { tone: "warn", text: "ألغيت نافذة الموافقة على ديسكورد، فلم يُربط الحساب." },
  failed: { tone: "danger", text: "تعذر ربط حساب ديسكورد." },
  signin: { tone: "warn", text: "انتهت جلستك على الموقع — سجّل الدخول ثم أعد الربط." },
  unavailable: {
    tone: "danger",
    text: "ربط ديسكورد غير مفعّل على هذا الموقع (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET).",
  },
};

function DashboardHome() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DiscordLinkStatus | null>(null);
  const [guilds, setGuilds] = useState<GuildSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const banner = search.discord ? BANNERS[search.discord] : undefined;

  const loadStatus = useCallback(() => getDiscordLinkStatus().catch(() => null), []);

  // Only ask for the server list once Discord is linked — otherwise the call
  // fails with "not linked" and paints a second, redundant error under the panel
  // that already explains it.
  const loadGuilds = useCallback((linked: boolean) => {
    if (!linked) {
      setGuilds(null);
      return;
    }
    setErr(null);
    listGuilds()
      .then(setGuilds)
      .catch((e: Error) => setErr(e.message || "تعذر تحميل السيرفرات"));
  }, []);

  const refresh = useCallback(async () => {
    const s = await loadStatus();
    setStatus(s);
    loadGuilds(Boolean(s?.linked));
  }, [loadStatus, loadGuilds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The popup leg of the OAuth flow reports back here (see api/discord/callback).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isDiscordLinkMessage(event.data)) return;
      void refresh();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-md sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">Vexon</span>
          </Link>
          <DashUser />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold tracking-wide text-primary">لوحة التحكم</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">سيرفراتك</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            يظهر هنا كل سيرفر لديك فيه صلاحية الإدارة والبوت Vexon مضاف إليه. أوامر السلاش تبقى شغّالة كما هي —
            اللوحة مسار ثانٍ لنفس الإعدادات.
          </p>

          {banner && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                banner.tone === "success"
                  ? "border-success/30 bg-success-soft text-success"
                  : banner.tone === "warn"
                    ? "border-warning/30 bg-warning-soft text-warning"
                    : "border-danger/30 bg-danger-soft text-danger"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p>{banner.text}</p>
                {search.reason && <p className="mt-1 text-xs opacity-80">{search.reason}</p>}
              </div>
              <button
                type="button"
                className="shrink-0 text-xs opacity-70 hover:underline"
                onClick={() => void navigate({ to: "/dashboard", search: {}, replace: true })}
              >
                إخفاء
              </button>
            </div>
          )}

          <DiscordLinkPanel
            status={status}
            busy={busy}
            onLink={() => {
              setBusy(true);
              startDiscordLink();
              // A same-tab redirect never comes back here, so release the spinner;
              // the popup leg posts a message and `refresh` takes over.
              window.setTimeout(() => setBusy(false), 2000);
            }}
            onUnlink={async () => {
              setBusy(true);
              try {
                await unlinkDiscord();
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
          />

          {err && (
            <div className="mt-6 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{err}</div>
          )}

          {status?.linked && !guilds && !err && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          )}

          {guilds && guilds.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <Server className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-3 font-medium">لا سيرفرات متاحة بعد</p>
              <p className="mt-1 text-sm text-muted">
                يجب أن يتحقق الشرطان معاً: أن تكون مالك السيرفر أو تملك صلاحية Administrator، وأن يكون Vexon مضافاً إليه.
              </p>
            </div>
          )}

          {guilds && guilds.length > 0 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {guilds.map((g) => (
                <Link
                  key={g.id}
                  to="/dashboard/$guildId"
                  params={{ guildId: g.id }}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-card-hover"
                >
                  {g.iconUrl ? (
                    <img src={g.iconUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white"
                      style={{ background: g.iconColor }}
                    >
                      {g.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{g.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{g.memberCount.toLocaleString("en-US")} عضو</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted transition group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGate>
  );
}

/**
 * The Discord link is the root of the whole trust chain: without it the site has
 * no Discord identity to sign the bot token with, so nothing below can work. It
 * gets its own panel rather than an error toast for that reason.
 */
function DiscordLinkPanel({
  status,
  busy,
  onLink,
  onUnlink,
}: {
  status: DiscordLinkStatus | null;
  busy: boolean;
  onLink: () => void;
  onUnlink: () => Promise<void>;
}) {
  if (!status) return <Skeleton className="mt-6 h-24 w-full" />;

  if (!status.configured) {
    return (
      <div className="mt-6 rounded-2xl border border-danger/30 bg-danger-soft p-5">
        <p className="text-sm font-semibold text-danger">ربط ديسكورد غير مفعّل على الموقع</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          أضف <Code>DISCORD_CLIENT_ID</Code> و <Code>DISCORD_CLIENT_SECRET</Code> إلى متغيرات البيئة، وسجّل رابط العودة{" "}
          <Code>/api/discord/callback</Code> في تطبيق ديسكورد. بدونهما لا يمكن التحقق من صلاحياتك الحقيقية.
        </p>
      </div>
    );
  }

  if (!status.linked) {
    return (
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">اربط حسابك على ديسكورد</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            اللوحة تقرأ سيرفراتك وصلاحياتك من ديسكورد مباشرة، وتوقّع لكل طلب توكن قصير العمر يتحقق منه البوت قبل أي
            تعديل. لا يظهر أي سيرفر قبل الربط.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onLink}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Link2 className="h-4 w-4" />
          {busy ? "جارٍ الربط…" : "ربط حساب ديسكورد"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {status.avatarUrl ? (
          <img src={status.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
            {(status.displayName ?? "?").charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{status.displayName}</p>
          <p className="truncate text-xs text-muted" dir="ltr">
            {status.discordId}
          </p>
        </div>
      </div>
      {status.source === "linked" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onUnlink()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted transition hover:text-danger disabled:opacity-50"
        >
          <Unlink className="h-3.5 w-3.5" />
          إلغاء الربط
        </button>
      ) : (
        <span className="shrink-0 text-xs text-muted">تسجيل الدخول عبر Discord</span>
      )}
    </div>
  );
}

/** Env var / path in Latin script, kept LTR inside the RTL paragraph. */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-elevated px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}
