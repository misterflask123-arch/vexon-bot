import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Mail, ExternalLink } from "lucide-react";
import { INVITE_URL, SUPPORT_URL } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [{ title: "الدعم والتواصل | Vexon" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">الدعم والتواصل</h1>
      <p className="mt-3 text-muted">نحن هنا لمساعدتك في إعداد البوت أو حل أي مشكلة.</p>

      <div className="mt-12 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">سيرفر الدعم</h2>
              <p className="mt-1 text-sm text-muted">
                انضم إلى سيرفر الدعم الرسمي للحصول على مساعدة سريعة من الفريق والمجتمع.
              </p>
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                انضم إلى سيرفر الدعم
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">تواصل مباشر</h2>
              <p className="mt-1 text-sm text-muted">
                للمسائل المتعلقة بالخصوصية أو طلبات حذف البيانات أو الاستفسارات الرسمية.
              </p>
              <p className="mt-3 text-sm">
                Discord: <span className="font-mono text-primary">f8_b</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card/50 p-6 text-center">
        <p className="mb-4 text-sm text-muted">لم تضف البوت بعد؟</p>
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          أضف Vexon إلى سيرفرك
        </a>
      </div>
    </div>
  );
}
