import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState, Field, PageHeader, Panel, PanelTitle, Pill, TableWrap, Td, Th } from "@/components/dashboard/primitives";
import { ChannelSelect, MultiRoleSelect } from "@/components/dashboard/selects";
import { closeTicketFn, deleteTicketPanel, getGuild, getTicketsPage, saveKnowledge, saveTicketPanel } from "@/lib/dashboard/api";
import type { GuildMeta, KnowledgeItem, TicketPanel, TicketRow } from "@/lib/dashboard/types";
import { TICKET_STATUSES } from "@/lib/dashboard/labels";
import { formatRelative, memberName } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/$guildId/tickets")({
  head: () => ({ meta: [{ title: "التذاكر | Vexon" }] }),
  component: TicketsPage,
});

function TicketsPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [editing, setEditing] = useState<Partial<TicketPanel> | null>(null);
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");

  async function reload() {
    const [g, t] = await Promise.all([getGuild({ data: { guildId } }), getTicketsPage({ data: { guildId } })]);
    setGuild(g);
    setPanels(t.panels);
    setTickets(t.tickets);
    setKnowledge(t.knowledge);
  }

  useEffect(() => {
    reload().catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  if (!guild) return null;

  return (
    <div>
      <PageHeader
        title="التذاكر"
        description="لوحات، تذاكر مفتوحة/مغلقة، وقاعدة معرفة المساعد الآلي — نفس جداول /ticket."
        actions={
          <Button
            onClick={() =>
              setEditing({
                channelId: guild.channels.find((c) => c.type === "text")?.id ?? "",
                title: "الدعم",
                description: "افتح تذكرة وسنرد عليك.",
                style: "buttons",
                categories: [{ key: "support", label: "دعم عام", categoryId: "" }],
                staffRoleIds: [],
                maxOpenPerUser: 1,
                autocloseMs: 0,
                aiEnabled: true,
              })
            }
          >
            لوحة جديدة
          </Button>
        }
      />

      {editing && (
        <Panel className="mb-5">
          <PanelTitle>{editing.id ? "تعديل اللوحة" : "لوحة جديدة"}</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="العنوان">
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="القناة">
              <ChannelSelect
                channels={guild.channels}
                value={editing.channelId}
                onChange={(v) => setEditing({ ...editing, channelId: v ?? "" })}
                types={["text"]}
              />
            </Field>
            <Field label="الوصف">
              <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="النمط">
              <Select value={editing.style ?? "buttons"} onChange={(e) => setEditing({ ...editing, style: e.target.value })}>
                <option value="buttons">أزرار</option>
                <option value="select">قائمة</option>
              </Select>
            </Field>
            <Field label="الحد لكل عضو">
              <Input
                type="number"
                min={1}
                value={editing.maxOpenPerUser ?? 1}
                onChange={(e) => setEditing({ ...editing, maxOpenPerUser: Number(e.target.value) })}
              />
            </Field>
            <Field label="إغلاق تلقائي (ساعات، 0 = لا)">
              <Input
                type="number"
                min={0}
                value={Math.round((editing.autocloseMs ?? 0) / 3_600_000)}
                onChange={(e) => setEditing({ ...editing, autocloseMs: Number(e.target.value) * 3_600_000 })}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Switch
              checked={editing.aiEnabled !== false}
              onCheckedChange={(v) => setEditing({ ...editing, aiEnabled: v })}
              label="مساعد الذكاء الاصطناعي"
            />
          </div>
          <div className="mt-4">
            <Field label="رتب طاقم التذاكر">
              <MultiRoleSelect
                roles={guild.roles}
                value={editing.staffRoleIds ?? []}
                onChange={(v) => setEditing({ ...editing, staffRoleIds: v })}
              />
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">التصنيفات</p>
            {(editing.categories ?? []).map((cat, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={cat.key}
                  placeholder="المفتاح"
                  onChange={(e) => {
                    const categories = [...(editing.categories ?? [])];
                    categories[i] = { ...cat, key: e.target.value };
                    setEditing({ ...editing, categories });
                  }}
                />
                <Input
                  value={cat.label}
                  placeholder="الاسم"
                  onChange={(e) => {
                    const categories = [...(editing.categories ?? [])];
                    categories[i] = { ...cat, label: e.target.value };
                    setEditing({ ...editing, categories });
                  }}
                />
                <ChannelSelect
                  channels={guild.channels}
                  value={cat.categoryId}
                  onChange={(v) => {
                    const categories = [...(editing.categories ?? [])];
                    categories[i] = { ...cat, categoryId: v ?? "" };
                    setEditing({ ...editing, categories });
                  }}
                  types={["category", "text"]}
                  allowEmpty
                />
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setEditing({
                  ...editing,
                  categories: [...(editing.categories ?? []), { key: "new", label: "تصنيف", categoryId: "" }],
                })
              }
            >
              تصنيف إضافي
            </Button>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={async () => {
                try {
                  await saveTicketPanel({
                    data: {
                      guildId,
                      id: editing.id,
                      channelId: editing.channelId ?? "",
                      title: editing.title ?? "",
                      description: editing.description ?? "",
                      style: editing.style ?? "buttons",
                      categories: editing.categories ?? [],
                      staffRoleIds: editing.staffRoleIds ?? [],
                      maxOpenPerUser: editing.maxOpenPerUser ?? 1,
                      autocloseMs: editing.autocloseMs ?? 0,
                      aiEnabled: editing.aiEnabled !== false,
                    },
                  });
                  toast.success("حُفظت اللوحة");
                  setEditing(null);
                  await reload();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              حفظ اللوحة
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid gap-3">
        {panels.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.categories.map((c) => (
                    <Pill key={c.key}>{c.label}</Pill>
                  ))}
                  {p.aiEnabled && <Pill tone="success">AI</Pill>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(p)}>
                  تعديل
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await deleteTicketPanel({ data: { guildId, id: p.id } });
                    await reload();
                  }}
                >
                  حذف
                </Button>
              </div>
            </div>
          </div>
        ))}
        {panels.length === 0 && !editing && <EmptyState title="لا لوحات" body="أنشئ لوحة تذاكر في قناة الدعم." />}
      </div>

      <Panel className="mt-5">
        <PanelTitle>التذاكر</PanelTitle>
        {tickets.length === 0 ? (
          <EmptyState title="لا تذاكر" body="عندما يفتح الأعضاء تذاكر ستظهر هنا." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>الفاتح</Th>
                <Th>النوع</Th>
                <Th>الحالة</Th>
                <Th>المستلم</Th>
                <Th>التاريخ</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <Td>{memberName(guild.members, t.openerId)}</Td>
                  <Td>{t.categoryKey}</Td>
                  <Td>
                    <Pill tone={t.status === "open" ? "success" : "default"}>{TICKET_STATUSES[t.status] ?? t.status}</Pill>
                  </Td>
                  <Td className="text-muted">{memberName(guild.members, t.claimedBy)}</Td>
                  <Td className="text-muted">{formatRelative(t.createdAt)}</Td>
                  <Td>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={async () => {
                        await closeTicketFn({ data: { guildId, id: t.id, reopen: t.status === "closed" } });
                        await reload();
                      }}
                    >
                      {t.status === "open" ? "إغلاق" : "إعادة فتح"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel className="mt-5">
        <PanelTitle hint="المساعد الآلي يجيب من هذه المقالات داخل التذكرة.">قاعدة المعرفة</PanelTitle>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Input value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} placeholder="العنوان" />
          <Textarea value={kbContent} onChange={(e) => setKbContent(e.target.value)} placeholder="المحتوى" />
        </div>
        <Button
          className="mb-5"
          onClick={async () => {
            try {
              await saveKnowledge({ data: { guildId, title: kbTitle, content: kbContent } });
              setKbTitle("");
              setKbContent("");
              toast.success("أُضيفت المقالة");
              await reload();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          إضافة مقالة
        </Button>
        <ul className="space-y-3">
          {knowledge.map((k) => (
            <li key={k.id} className="rounded-xl border border-border bg-elevated p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{k.title}</p>
                  <p className="mt-1 text-sm text-muted">{k.content}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-danger"
                  onClick={async () => {
                    await saveKnowledge({ data: { guildId, id: k.id, title: k.title, content: k.content, remove: true } });
                    await reload();
                  }}
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
