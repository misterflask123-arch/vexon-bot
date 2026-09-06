import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, CheckCircle2, ArrowLeft } from "lucide-react";
import { INVITE_URL } from "@/lib/utils";

export const Route = createFileRoute("/quickstart")({
  head: () => ({
    meta: [{ title: "البداية السريعة | Vexon" }],
  }),
  component: QuickStartPage,
});

const steps = [
  {
    title: "أضف البوت إلى سيرفرك",
    body: "اضغط زر «أضف البوت» وامنحه الصلاحيات المطلوبة. يُفضّل منح صلاحية Administrator أثناء الإعداد الأولي ثم تقييدها لاحقاً إن أردت.",
  },
  {
    title: "حدد رتبة الموظفين",
    body: "نفّذ الأمر /config staff-role واختر الرتبة التي تريد منحها صلاحيات الإشراف الافتراضية. هذه الرتبة هي بوابة معظم أوامر الإدارة.",
  },
  {
    title: "اضبط قنوات السجلات",
    body: "استخدم /config logs لتحديد قناة لسجلات الإشراف، وقناة للأحداث العامة، وقناة لنشاط التذاكر إن وجدت. السجلات ضرورية للمراجعة والمساءلة.",
  },
  {
    title: "أنشئ لوحة تذاكر (اختياري)",
    body: "إن كنت تحتاج نظام دعم، نفّذ /ticket panel واختر القناة والكاتيجوري ورتبة الموظفين. يمكنك تفعيل المساعد الآلي لاحقاً عبر قاعدة المعرفة.",
  },
  {
    title: "جاهز للاستخدام",
    body: "ابدأ باستخدام أوامر /mod و /automod و /server، أو افتح لوحة التحكم لإدارة نفس الإعدادات من المتصفح. المساران يكتبان على نفس قاعدة البيانات.",
  },
];

function QuickStartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">البداية السريعة</h1>
      <p className="mt-3 leading-relaxed text-muted">
        إعداد Vexon لا يستغرق أكثر من دقائق. أوامر السلاش تبقى كما هي، واللوحة مسار مرئي لنفس البيانات.
      </p>

      <ol className="mt-12 space-y-8">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
              {i + 1}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl border border-primary/20 bg-primary-soft/40 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-shield" />
          <div>
            <p className="font-medium">مساران لنفس البيانات</p>
            <p className="mt-1 text-sm text-muted">
              كل أمر سلاش يبقى شغّالاً كما هو. لوحة التحكم تقرأ وتكتب على نفس جداول البوت — بدون نظام موازٍ.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" />
          أضف البوت الآن
        </a>
        <Link
          to="/commands"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-semibold hover:bg-card-hover"
        >
          مرجع الأوامر
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
