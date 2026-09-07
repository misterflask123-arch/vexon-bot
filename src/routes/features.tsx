import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gavel,
  Bot,
  Ticket,
  Command,
  Server,
  UserCheck,
  Gamepad2,
  Shield,
  Plus,
} from "lucide-react";
import { INVITE_URL } from "@/lib/utils";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [{ title: "الميزات | Vexon" }],
  }),
  component: FeaturesPage,
});

const categories = [
  {
    icon: Gavel,
    title: "الإشراف",
    intro: "أدوات إشراف كاملة مع احترام صلاحيات Discord وهرمية الرتب في كل إجراء.",
    points: [
      "حظر وطرد وكتم وتحذيرات مع سلّم عقوبات تلقائي قابل للتخصيص",
      "قفل القنوات، الوضع البطيء، حذف جماعي، وتغيير الألقاب",
      "سجلات مفصّلة وفحص صلاحيات حقيقي قبل تنفيذ أي عقوبة",
    ],
  },
  {
    icon: Bot,
    title: "الحماية التلقائية (AutoMod)",
    intro: "طبقات دفاع تعمل دون تدخل بشري لحماية السيرفر من السبام والغارات والتخريب.",
    points: [
      "كلمات محظورة مع عقوبات مخصصة، مكافحة سبام ومنشنات وروابط",
      "كشف غارات الانضمام الجماعي مع استهداف الحسابات الجديدة",
      "حماية Nuke: حجر تلقائي لأي موظف يحذف قنوات/رتب أو يحظر بكميات كبيرة",
    ],
  },
  {
    icon: Ticket,
    title: "التذاكر والذكاء الاصطناعي",
    intro: "نظام تذاكر احترافي مع مساعد آلي يجاوب من قاعدة معرفتك الخاصة.",
    points: [
      "لوحات متعددة الأنواع (أزرار أو قائمة منسدلة) حتى 25 نوع لكل لوحة",
      "استلام، نقل، إضافة أعضاء، إغلاق وإعادة فتح — كلها داخل التذكرة",
      "قاعدة معرفة قابلة للتوسيع وتكامل ذكاء اصطناعي اختياري",
    ],
  },
  {
    icon: Command,
    title: "الأوامر المخصصة",
    intro: "حوّل أي إجراء إداري إلى كلمة قصيرة تكتبها في الشات.",
    points: [
      "إجراءات متعددة لكل أمر: ban، kick، timeout، warn، purge، reply، dm، roles...",
      "دعم قوالب ديناميكية مثل {user} و {reason} و {moderator}",
      "حزمة جاهزة للأوامر العربية الشائعة بضغطة واحدة",
    ],
  },
  {
    icon: Server,
    title: "أنظمة السيرفر",
    intro: "كل الأدوات اليومية لإدارة المجتمع دون الحاجة لبوتات إضافية.",
    points: [
      "ترحيب ووداع ورتب تلقائية وأزرار رتب ورياكشن رتب",
      "سحوبات، استطلاعات، اقتراحات، إحصائيات حية، وإمبدات مخصصة",
      "رياكشن تلقائي على كل رسالة في قنوات محددة",
    ],
  },
  {
    icon: UserCheck,
    title: "حماية الدعوات",
    intro: "اعرف من يدعو فعلاً وتجنّب تضخيم الأرقام بالحسابات الوهمية.",
    points: [
      "عدّ دعوات حقيقي لكل عضو",
      "تصنيف تلقائي للحسابات المشبوهة (عمر أقل من 4 أشهر وبدون صورة)",
      "شفافية كاملة تساعد على مكافأة الداعين الحقيقيين فقط",
    ],
  },
  {
    icon: Gamepad2,
    title: "الألعاب الترفيهية",
    intro: "أضف حيوية للشات بألعاب نصية سريعة ونظام نقاط.",
    points: [
      "أسرع، فكك الحروف، لغز، عواصم، أعلام، اعكس الكلمة، وتحديات حساب",
      "روليت جماعي بالإقصاء ومتصدرين",
      "أوامر مزح خفيفة: صفعة، اختراق وهمي، نسبة توافق",
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-14 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-sm text-primary">
          <Shield className="h-3.5 w-3.5" />
          ميزات مبنية حول الأمان
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ميزات Vexon</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          كل فئة مصممة لتغطية حاجة حقيقية في إدارة السيرفرات — من الإشراف اليومي إلى الحماية المتقدمة.
        </p>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <div
            key={cat.title}
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30 sm:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <cat.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{cat.title}</h2>
                <p className="mt-1 text-muted">{cat.intro}</p>
                <ul className="mt-5 space-y-2.5">
                  {cat.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" />
          أضف البوت وجرّب الميزات
        </a>
        <p className="mt-4 text-sm text-muted">
          أو{" "}
          <Link to="/commands" className="text-primary hover:underline">
            تصفّح مرجع الأوامر الكامل
          </Link>
        </p>
      </div>
    </div>
  );
}
