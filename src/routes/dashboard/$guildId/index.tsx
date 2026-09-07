import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ticket, Gavel, Command, Bot, ShieldAlert, MessageSquare } from "lucide-react";
import { EmptyState, PageHeader, Pill, StatCard, TableWrap, Td, Th } from "@/components/dashboard/primitives";
import { getOverview } from "@/lib/dashboard/api";
import type { Overview } from "@/lib/dashboard/types";
import { ACTION_LABELS } from "@/lib/dashboard/types";
import { formatRelative, memberName } from "@/lib/utils";
import { Skeleton } from "@/components/dashboard/primitives";

export const Route = createFileRoute("/dashboard/$guildId/")({
  head: () => ({ meta: [{ title: "نظرة عامة | Vexon" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const { guildId } = Route.useParams();
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getOverview({ data: { guildId } })
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [guildId]);

  if (err) return <p className="text-sm text-danger">{err}</p>;
  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const { guild } = data;
  return (
    <div>
      <PageHeader
        title={guild.name}
        description="ملخص حي لنفس بيانات البوت — التغييرات هنا تصل أوامر السلاش فوراً لأنها تكتب على نفس الجداول."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="تذاكر مفتوحة" value={data.openTickets} hint={`${data.closedTickets} مغلقة`} icon={<Ticket className="h-5 w-5" />} />
        <StatCard label="تحذيرات" value={data.warnings} hint={`${data.cases} قضية`} icon={<Gavel className="h-5 w-5" />} />
        <StatCard label="أوامر مخصصة" value={data.customCommands} icon={<Command className="h-5 w-5" />} />
        <StatCard
          label="حماية"
          value={data.automodOn ? "مفعّلة" : "متوقفة"}
          hint={`${data.blockedWords} كلمة محظورة`}
          icon={<Bot className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">آخر القضايا</h2>
            <Link
              to="/dashboard/$guildId/moderation"
              params={{ guildId }}
              className="text-xs text-primary hover:underline"
            >
              عرض الكل
            </Link>
          </div>
          {data.recentCases.length === 0 ? (
            <EmptyState title="لا قضايا بعد" body="ستظهر إجراءات الإشراف هنا." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>الإجراء</Th>
                  <Th>الهدف</Th>
                  <Th>متى</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentCases.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Pill tone={c.action === "ban" || c.action === "kick" ? "danger" : "primary"}>
                        {ACTION_LABELS[c.action] ?? c.action}
                      </Pill>
                    </Td>
                    <Td>{memberName(guild.members, c.targetId)}</Td>
                    <Td className="text-muted">{formatRelative(c.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">التذاكر الأخيرة</h2>
            <Link to="/dashboard/$guildId/tickets" params={{ guildId }} className="text-xs text-primary hover:underline">
              إدارة التذاكر
            </Link>
          </div>
          {data.recentTickets.length === 0 ? (
            <EmptyState title="لا تذاكر" body="لوحات التذاكر تظهر نشاطها هنا." />
          ) : (
            <ul className="space-y-2">
              {data.recentTickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-elevated px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted" />
                    <span className="truncate text-sm">{memberName(guild.members, t.openerId)}</span>
                    <span className="text-xs text-muted">{t.categoryKey}</span>
                  </div>
                  <Pill tone={t.status === "open" ? "success" : "default"}>{t.status === "open" ? "مفتوحة" : "مغلقة"}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.securityEvents.length > 0 && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-warning" />
            أحداث أمنية
          </h2>
          <ul className="space-y-2 text-sm">
            {data.securityEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                <span>
                  <span className="font-medium">{memberName(guild.members, e.actorId)}</span>
                  <span className="text-muted"> — {e.kind}</span>
                </span>
                <span className="text-xs text-muted">{formatRelative(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
