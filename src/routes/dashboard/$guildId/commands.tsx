import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState, Field, PageHeader, Panel, PanelTitle, Pill } from "@/components/dashboard/primitives";
import { MultiRoleSelect } from "@/components/dashboard/selects";
import { deleteCustomCommand, getCustomCommands, getGuild, saveCustomCommand } from "@/lib/dashboard/api";
import { ACTION_LABELS, ACTION_TYPES, type CustomAction, type CustomCommand, type GuildMeta } from "@/lib/dashboard/types";
import { MATCH_MODES } from "@/lib/dashboard/labels";

export const Route = createFileRoute("/dashboard/$guildId/commands")({
  head: () => ({ meta: [{ title: "الأوامر المخصصة | Vexon" }] }),
  component: CommandsPage,
});

const emptyForm = (): Omit<CustomCommand, "id" | "updatedAt"> & { id?: number } => ({
  trigger: "",
  matchMode: "prefix",
  staffOnly: true,
  allowedRoleIds: [],
  requiredPerm: null,
  cooldownSeconds: 3,
  enabled: true,
  actions: [{ type: "reply", content: "" }],
});

function CommandsPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [list, setList] = useState<CustomCommand[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [open, setOpen] = useState(false);

  async function reload() {
    const [g, c] = await Promise.all([getGuild({ data: { guildId } }), getCustomCommands({ data: { guildId } })]);
    setGuild(g);
    setList(c);
  }

  useEffect(() => {
    reload().catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  if (!guild) return null;

  function setAction(i: number, patch: Partial<CustomAction>) {
    setForm({ ...form, actions: form.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });
  }

  return (
    <div>
      <PageHeader
        title="الأوامر المخصصة"
        description="اختصارات عربية مثل «برا» و«كتم» تنفّذ نفس إجراءات /mod مع فحص صلاحيات Discord."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            أمر جديد
          </Button>
        }
      />

      {open && (
        <Panel className="mb-5">
          <PanelTitle>{form.id ? "تعديل الأمر" : "إنشاء أمر"}</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الكلمة / المشغّل">
              <Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="برا" />
            </Field>
            <Field label="نمط المطابقة">
              <Select value={form.matchMode} onChange={(e) => setForm({ ...form, matchMode: e.target.value })}>
                {MATCH_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="تهدئة (ثواني)">
              <Input
                type="number"
                min={0}
                value={form.cooldownSeconds}
                onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })}
              />
            </Field>
            <Field label="صلاحية Discord مطلوبة">
              <Select
                value={form.requiredPerm ?? ""}
                onChange={(e) => setForm({ ...form, requiredPerm: e.target.value || null })}
              >
                <option value="">— لا شيء —</option>
                {["BanMembers", "KickMembers", "ModerateMembers", "ManageMessages", "ManageChannels", "ManageNicknames", "ManageRoles"].map(
                  (p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>
          <div className="mt-4 space-y-1">
            <Switch checked={form.staffOnly} onCheckedChange={(v) => setForm({ ...form, staffOnly: v })} label="للموظفين فقط" />
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} label="مفعّل" />
          </div>
          <div className="mt-4">
            <Field label="رتب مسموح لها (اختياري)">
              <MultiRoleSelect roles={guild.roles} value={form.allowedRoleIds} onChange={(v) => setForm({ ...form, allowedRoleIds: v })} />
            </Field>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium">الإجراءات</p>
            {form.actions.map((a, i) => (
              <div key={i} className="rounded-xl border border-border bg-elevated p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={a.type} onChange={(e) => setAction(i, { type: e.target.value })}>
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ACTION_LABELS[t] ?? t}
                      </option>
                    ))}
                  </Select>
                  {(a.type === "reply" || a.type === "dm" || a.type === "nickname") && (
                    <Textarea
                      value={a.content ?? ""}
                      onChange={(e) => setAction(i, { content: e.target.value })}
                      placeholder="النص — {user} {reason} {moderator} {server}"
                    />
                  )}
                  {a.type === "timeout" && (
                    <Input
                      value={a.duration ?? "10m"}
                      onChange={(e) => setAction(i, { duration: e.target.value })}
                      placeholder="المدة مثل 10m"
                    />
                  )}
                  {a.type === "purge" && (
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={a.amount ?? 50}
                      onChange={(e) => setAction(i, { amount: Number(e.target.value) })}
                    />
                  )}
                  {a.type === "slowmode" && (
                    <Input
                      type="number"
                      min={0}
                      value={a.seconds ?? 10}
                      onChange={(e) => setAction(i, { seconds: Number(e.target.value) })}
                    />
                  )}
                </div>
                {form.actions.length > 1 && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-danger"
                    onClick={() => setForm({ ...form, actions: form.actions.filter((_, idx) => idx !== i) })}
                  >
                    حذف الإجراء
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setForm({ ...form, actions: [...form.actions, { type: "reply", content: "" }] })}
            >
              إضافة إجراء
            </Button>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              onClick={async () => {
                try {
                  await saveCustomCommand({
                    data: {
                      guildId,
                      id: form.id,
                      trigger: form.trigger,
                      matchMode: form.matchMode,
                      staffOnly: form.staffOnly,
                      allowedRoleIds: form.allowedRoleIds,
                      requiredPerm: form.requiredPerm,
                      cooldownSeconds: form.cooldownSeconds,
                      enabled: form.enabled,
                      actions: form.actions,
                    },
                  });
                  toast.success("حُفظ الأمر");
                  setOpen(false);
                  await reload();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              حفظ
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </Panel>
      )}

      {list.length === 0 && !open ? (
        <EmptyState title="لا أوامر مخصصة" body="أنشئ اختصاراً عربياً ينفّذ حظر أو كتم أو رداً جاهزاً." />
      ) : (
        <div className="grid gap-3">
          {list.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold" dir="ltr">
                    {c.trigger}
                  </span>
                  <Pill>{MATCH_MODES.find((m) => m.value === c.matchMode)?.label ?? c.matchMode}</Pill>
                  {c.staffOnly && <Pill tone="primary">موظفون</Pill>}
                  {!c.enabled && <Pill tone="warn">متوقف</Pill>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {c.actions.map((a) => ACTION_LABELS[a.type] ?? a.type).join(" ← ")} · تهدئة {c.cooldownSeconds}ث
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setForm({ ...c });
                    setOpen(true);
                  }}
                >
                  تعديل
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await deleteCustomCommand({ data: { guildId, id: c.id } });
                    toast.success("حُذف الأمر");
                    await reload();
                  }}
                >
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
