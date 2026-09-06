import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, TableWrap, Td, Th } from "@/components/dashboard/primitives";
import { getInvites } from "@/lib/dashboard/api";
import type { InviteRow } from "@/lib/dashboard/types";

export const Route = createFileRoute("/dashboard/$guildId/invites")({
  head: () => ({ meta: [{ title: "الدعوات | Vexon" }] }),
  component: InvitesPage,
});

function InvitesPage() {
  const { guildId } = Route.useParams();
  const [rows, setRows] = useState<InviteRow[] | null>(null);

  useEffect(() => {
    getInvites({ data: { guildId } })
      .then(setRows)
      .catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  return (
    <div>
      <PageHeader
        title="حماية الدعوات"
        description="العدّ الحقيقي يخصم المغادرين والحسابات الوهمية (عمر أقل من 4 أشهر بدون صورة) — نفس منطق /invites."
      />
      <Panel>
        {!rows ? (
          <p className="text-sm text-muted">تحميل…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="لا بيانات دعوات" body="ستُحتسب الدعوات تلقائياً عند انضمام الأعضاء." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>العضو</Th>
                <Th>حقيقي</Th>
                <Th>غادر</Th>
                <Th>وهمي</Th>
                <Th>الإجمالي</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberId}>
                  <Td className="font-medium">{r.username}</Td>
                  <Td className="tabular-nums text-success">{r.regular}</Td>
                  <Td className="tabular-nums text-muted">{r.left}</Td>
                  <Td className="tabular-nums text-danger">{r.fake}</Td>
                  <Td className="tabular-nums font-semibold">{r.total}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
