import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "سياسة الخصوصية | Vexon" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-muted">آخر تحديث: سبتمبر 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-fg/90">
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. مقدمة</h2>
          <p>
            تحترم Vexon خصوصيتك. توضّح هذه السياسة أنواع البيانات التي يجمعها البوت، ولماذا، وكيف تُستخدم. باستخدامك للبوت فإنك توافق على هذه السياسة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">2. البيانات التي نجمعها</h2>
          <ul className="list-disc space-y-2 pr-5 text-muted">
            <li>معرّفات Discord (معرّف المستخدم، معرّف السيرفر، معرّف القناة، معرّف الرسالة) اللازمة لتشغيل الأوامر والسجلات.</li>
            <li>محتوى الرسائل فقط عندما يكون ذلك مطلوباً لغرض الإشراف، الفلترة التلقائية (AutoMod)، أو الردود عبر المساعد الآلي في التذاكر.</li>
            <li>إعدادات السيرفر التي يضبطها المسؤولون عبر أوامر /config و /automod و /ticket وغيرها.</li>
            <li>سجلات الإجراءات الإدارية (حظر، طرد، تحذير...) لأغراض المراجعة داخل السيرفر.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">3. كيف نستخدم البيانات</h2>
          <p className="text-muted">
            تُستخدم البيانات حصرياً لتشغيل وظائف البوت: تنفيذ الأوامر، تطبيق الحماية التلقائية، إدارة التذاكر، وعرض السجلات للموظفين المخوّلين. لا نبيع أي بيانات لأطراف ثالثة، ولا نستخدمها لأغراض إعلانية.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">4. الاحتفاظ والحذف</h2>
          <p className="text-muted">
            تُحفظ البيانات طالما البوت مضافاً إلى السيرفر أو طالما كانت مطلوبة لتشغيل الميزات. يمكنك طلب حذف بيانات سيرفرك أو بياناتك الشخصية عبر التواصل معنا (راجع صفحة الدعم). سنبذل جهداً معقولاً للاستجابة خلال فترة مناسبة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">5. الأمان</h2>
          <p className="text-muted">
            نطبق إجراءات تقنية وتنظيمية معقولة لحماية البيانات من الوصول غير المصرّح به. مع ذلك، لا يمكن ضمان أمان مطلق لأي نظام متصل بالإنترنت.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">6. التغييرات</h2>
          <p className="text-muted">قد نحدّث هذه السياسة من وقت لآخر. يُنشر التحديث على هذه الصفحة مع تاريخ آخر تعديل.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">7. التواصل</h2>
          <p className="text-muted">
            لأي استفسار متعلق بالخصوصية أو لطلب حذف بيانات، تواصل معنا عبر سيرفر الدعم أو الطريقة المذكورة في صفحة الدعم والتواصل.
          </p>
        </section>
      </div>
    </div>
  );
}
