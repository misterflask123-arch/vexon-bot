import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield,
  Plus,
  BookOpen,
  Gavel,
  Bot,
  Ticket,
  Command,
  Server,
  UserCheck,
  Gamepad2,
  CheckCircle2,
  ArrowLeft,
  Users,
} from "lucide-react";
import { INVITE_URL } from "@/lib/utils";
import { getBotStats, type BotStats } from "@/lib/bot-stats";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

const features = [
  {
    icon: Gavel,
    title: "الإشراف",
    desc: "حظر، طرد، كتم، تحذيرات، سلّم عقوبات، قفل قنوات، وحذف جماعي — كل شيء مع فحص صلاحيات Discord الحقيقي.",
  },
  {
    icon: Bot,
    title: "الحماية التلقائية",
    desc: "كلمات محظورة، مكافحة سبام، روابط، غارات، وتخريب (Nuke) مع حجر تلقائي للموظفين المخترقين.",
  },
  {
    icon: Ticket,
    title: "التذاكر والذكاء الاصطناعي",
    desc: "لوحات تذاكر متعددة الأنواع، مساعد آلي يجيب من قاعدة معرفتك، واستلام ونقل وإغلاق كامل.",
  },
  {
    icon: Command,
    title: "الأوامر المخصصة",
    desc: "أنشئ اختصارات بكلمة واحدة تنفّذ أي إجراء إداري، مع دعم العربية الجاهزة وإجراءات متعددة.",
  },
  {
    icon: Server,
    title: "أنظمة السيرفر",
    desc: "ترحيب، رتب تلقائية وأزرار، سحوبات، استطلاعات، إحصائيات، إمبدات، ورياكشن تلقائي.",
  },
  {
    icon: UserCheck,
    title: "حماية الدعوات",
    desc: "عدّ دعوات حقيقي مع كشف الحسابات الوهمية (عمر أقل من 4 أشهر بدون صورة).",
  },
  {
    icon: Gamepad2,
    title: "الألعاب الترفيهية",
    desc: "ألعاب نصية سريعة، روليت جماعي، نقاط ومتصدرين، ومزح خفيفة مباشرة في الشات.",
  },
];

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

function Home() {
  const { user, isPending } = useCurrentUserState();
  const [stats, setStats] = useState<BotStats | null>(null);

  useEffect(() => {
    if (!isPending && user) {
      window.location.href = "/dashboard";
    }
  }, [isPending, user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getBotStats();
        if (!cancelled && data) setStats(data);
      } catch {
        // ignore
      }
    }

    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <section className="hero-pattern relative overflow-hidden">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-4 py-1.5 text-sm text-primary">
              <Shield className="h-4 w-4" />
              <span>فحص صلاحيات وهرمية حقيقي على كل إجراء</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="gradient-text">Vexon</span>
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-muted sm:text-xl">
              Advanced Discord Management — Moderation • AutoMod • AI Tickets • Custom Commands • Invite Security • Mini-Games
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg/80">
              بوت إدارة شامل مصمم لأصحاب السيرفرات وطاقم الإشراف — أوامر سلاش كاملة، ولوحة تحكم ويب تدير نفس الإعدادات دون تعطيل أي أمر.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="glow-accent inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-fg transition hover:bg-primary-hover"
              >
                <Plus className="h-5 w-5" />
                أضف البوت إلى سيرفرك
              </a>

          <Link
                to="/dashboard"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-fg transition hover:bg-card-hover"
              >
                <BookOpen className="h-5 w-5" />
                لوحة التحكم
              </Link>
            </div>

            {stats && (
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-5 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="text-start">
                    <p className="text-2xl font-bold tabular-nums">{formatNumber(stats.servers)}</p>
                    <p className="text-xs text-muted">سيرفر</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-5 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-start">
                    <p className="text-2xl font-bold tabular-nums">{formatNumber(stats.users)}</p>
                    <p className="text-xs text-muted">مستخدم</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            كل ما يحتاجه سيرفرك
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-muted">
            من الإشراف اليومي إلى الحماية المتقدمة والتذاكر الذكية — Vexon يغطي دورة الإدارة كاملة.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:bg-card-hover"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </div>

              <h3 className="text-lg font-semibold">{f.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/features"
            className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
          >
            استكشف كل الميزات بالتفصيل
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-primary/20 bg-primary-soft/50 p-8 sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  مو بس بوت إشراف عادي
                </h2>

                <p className="mt-3 max-w-xl leading-relaxed text-muted">
                  Vexon يفرض فحص صلاحيات Discord الحقيقية وهرمية الرتب على كل إجراء. حتى لو كان المستخدم موظفاً، لن يستطيع تنفيذ أمر بدون الصلاحية المناسبة — حماية حقيقية من سوء الاستخدام والاختراق.
                </p>

                <ul className="mt-5 space-y-2">
                  {[
                    "فحص صلاحيات Discord على مستوى الإجراء",
                    "احترام هرمية الرتب (لا تستطيع استهداف من فوقك)",
                    "لوحة ويب كاملة تقرأ وتكتب على نفس قاعدة بيانات البوت",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-shield" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="shrink-0">
                <a
                  href={INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-fg transition hover:bg-primary-hover"
                >
                  <Plus className="h-5 w-5" />
                  أضف Vexon الآن
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">
          جاهز للبدء؟
        </h2>

        <p className="mt-3 text-muted">
          أضف البوت، عيّن رتبة الموظفين، واضبط السجلات — كل شيء في دقائق.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            <Plus className="h-5 w-5" />
            أضف البوت
          </a>

          <Link
            to="/quickstart"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-semibold hover:bg-card-hover"
          >
            دليل البداية السريعة
          </Link>
        </div>
      </section>
    </>
  );
}
