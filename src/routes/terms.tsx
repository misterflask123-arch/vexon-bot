import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "شروط الاستخدام | Vexon" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">شروط الاستخدام</h1>
      <p className="mt-2 text-sm text-muted">آخر تحديث: سبتمبر 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-fg/90">
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. القبول</h2>
          <p className="text-muted">
            باستخدامك لبوت Vexon فإنك توافق على هذه الشروط وعلى سياسة الخصوصية. إذا لم توافق، يرجى إزالة البوت من سيرفرك.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">2. الاستخدام المقبول</h2>
          <ul className="list-disc space-y-2 pr-5 text-muted">
            <li>يُستخدم البوت لإدارة سيرفرات Discord بشكل مشروع ومتوافق مع شروط خدمة Discord.</li>
            <li>يُحظر استخدام البوت لإيذاء الآخرين، أو التحايل على أنظمة Discord، أو أي نشاط غير قانوني.</li>
            <li>أنت مسؤول عن الإجراءات التي يتخذها موظفوك باستخدام صلاحيات البوت.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">3. توفر الخدمة</h2>
          <p className="text-muted">
            نسعى لتوفير خدمة مستقرة، لكننا لا نضمن توفراً بنسبة 100٪. قد تحدث انقطاعات للصيانة أو لأسباب خارجة عن إرادتنا. لا نتحمل مسؤولية أي خسائر ناتجة عن توقف مؤقت.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">4. التعديلات والإنهاء</h2>
          <p className="text-muted">
            نحتفظ بالحق في تعديل الميزات أو إيقاف البوت أو حظر سيرفرات تنتهك هذه الشروط دون إشعار مسبق عند الضرورة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">5. إخلاء المسؤولية</h2>
          <p className="text-muted">يُقدَّم البوت «كما هو» دون ضمانات صريحة أو ضمنية. استخدامك له على مسؤوليتك الخاصة.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">6. التواصل</h2>
          <p className="text-muted">للاستفسارات المتعلقة بهذه الشروط، راجع صفحة الدعم والتواصل.</p>
        </section>
      </div>
    </div>
  );
}
