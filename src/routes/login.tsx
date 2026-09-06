import { createFileRoute, Link } from "@tanstack/react-router";
import { ALL_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Shield, LayoutDashboard } from "lucide-react";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "تسجيل الدخول | Vexon" }] }),
  component: Login,
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (!isPending && user) return <Navigate to="/dashboard" />;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 hero-pattern" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold">Vexon</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            سجّل الدخول لإدارة سيرفراتك. يظهر هنا كل سيرفر أنت مالكه أو لديك فيه صلاحية Administrator والبوت Vexon مضاف إليه.
          </p>

          <div className="mt-6 space-y-2.5">
            {authEnabled ? (
              ALL_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/dashboard" })}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-primary/40 hover:bg-card-hover"
                >
                  المتابعة عبر {p.label}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted">تسجيل الدخول غير مفعّل حالياً.</p>
            )}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-subtle">
            أوامر السلاش تبقى شغّالة كما هي. اللوحة تقرأ وتكتب على نفس بيانات البوت — مسار ثانٍ لنفس الإعدادات.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/" className="hover:text-fg">
            العودة للرئيسية
          </Link>
        </p>
      </div>
    </main>
  );
}
