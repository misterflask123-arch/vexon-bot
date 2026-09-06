import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Shield,
  LayoutDashboard,
  Gavel,
  Bot,
  Command,
  Ticket,
  Server,
  UserCheck,
  Gamepad2,
  Settings,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut, authEnabled } from "@/lib/auth/client";
import { getGuild } from "@/lib/dashboard/api";
import type { GuildMeta } from "@/lib/dashboard/types";
import { Skeleton } from "./primitives";

const NAV = [
  { to: "/dashboard/$guildId", hash: "index", label: "نظرة عامة", icon: LayoutDashboard },
  { to: "/dashboard/$guildId/moderation", hash: "moderation", label: "الإشراف", icon: Gavel },
  { to: "/dashboard/$guildId/automod", hash: "automod", label: "الحماية", icon: Bot },
  { to: "/dashboard/$guildId/commands", hash: "commands", label: "الأوامر", icon: Command },
  { to: "/dashboard/$guildId/tickets", hash: "tickets", label: "التذاكر", icon: Ticket },
  { to: "/dashboard/$guildId/server", hash: "server", label: "أنظمة السيرفر", icon: Server },
  { to: "/dashboard/$guildId/invites", hash: "invites", label: "الدعوات", icon: UserCheck },
  { to: "/dashboard/$guildId/games", hash: "games", label: "الألعاب", icon: Gamepad2 },
  { to: "/dashboard/$guildId/settings", hash: "settings", label: "الإعدادات", icon: Settings },
] as const;

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/30" />
          <p className="text-sm text-muted">جاري التحقق…</p>
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}

export function DashUser() {
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "حساب";
  return (
    <div className="flex min-w-0 items-center gap-2">
      {user.profileImageUrl ? (
        <img src={user.profileImageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {label.charAt(0)}
        </span>
      )}
      <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">{label}</span>
      {authEnabled && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void signOut().catch(() => setBusy(false));
          }}
          className="text-xs text-muted hover:text-fg disabled:opacity-50"
        >
          {busy ? "…" : "خروج"}
        </button>
      )}
    </div>
  );
}

export function GuildShell({ guildId }: { guildId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getGuild({ data: { guildId } })
      .then((g) => {
        if (live) setGuild(g);
      })
      .catch((e: Error) => {
        if (live) setErr(e.message || "تعذر التحميل");
      });
    return () => {
      live = false;
    };
  }, [guildId]);

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const href =
          item.hash === "index" ? `/dashboard/${guildId}` : `/dashboard/${guildId}/${item.hash}`;
        const active = item.hash === "index" ? pathname === href : pathname.startsWith(href);
        const Icon = item.icon;
        return (
          <Link
            key={item.hash}
            to={item.to}
            params={{ guildId }}
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-elevated hover:text-fg"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-bg">
        <aside className="hidden w-60 shrink-0 border-s border-border bg-card lg:flex lg:flex-col">
          <Link to="/dashboard" className="flex items-center gap-2.5 border-b border-border px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Vexon</p>
              <p className="truncate text-[11px] text-muted">{guild?.name ?? "لوحة التحكم"}</p>
            </div>
          </Link>
          {nav}
          <div className="mt-auto border-t border-border p-3">
            <Link
              to="/dashboard"
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium text-muted hover:bg-elevated hover:text-fg"
            >
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
              كل السيرفرات
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-bg/90 px-3 backdrop-blur-md sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-card lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="القائمة"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{guild?.name ?? "…"}</p>
                <p className="hidden text-[11px] text-muted sm:block">
                  {guild ? `${guild.memberCount.toLocaleString("en-US")} عضو` : "تحميل"}
                </p>
              </div>
            </div>
            <DashUser />
          </header>

          {open && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button type="button" className="drawer-overlay absolute inset-0" onClick={() => setOpen(false)} />
              <div className="absolute inset-y-0 end-0 flex w-72 flex-col border-s border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-3 py-3">
                  <span className="text-sm font-bold">القائمة</span>
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-xl text-muted"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {nav}
              </div>
            </div>
          )}

          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-6 sm:py-8">
            {err ? (
              <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6 text-sm text-danger">{err}</div>
            ) : guild ? (
              <Outlet />
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
