import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Panel, PanelTitle, Pill, TableWrap, Td, Th } from "@/components/dashboard/primitives";
import { ChannelSelect, MemberSelect, RoleSelect } from "@/components/dashboard/selects";
import {
  addWarningFn,
  getGuild,
  getModeration,
  removeWarningFn,
  runModAction,
  saveLadder,
} from "@/lib/dashboard/api";
import { ACTION_LABELS, type GuildMeta, type ModCase, type WarnLadder, type Warning } from "@/lib/dashboard/types";
import { formatDuration, LADDER_ACTIONS, parseDurationInput } from "@/lib/dashboard/labels";
import { formatRelative, memberName } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/$guildId/moderation")({
  head: () => ({ meta: [{ title: "الإشراف | Vexon" }] }),
  component: ModerationPage,
});

/** What the action needs to point at. `user` is unban: a banned user is usually no longer in the guild. */
type ModTarget = "member" | "user" | "channel";
type ModField = "reason" | "duration" | "deleteMessages" | "amount" | "seconds" | "nickname" | "role";

/** Mirrors `MOD_ACTIONS` in the bot's `adminServer.ts` — the path segment is sent verbatim. */
const MOD_ACTIONS: { value: string; label: string; target: ModTarget; fields: ModField[] }[] = [
  { value: "ban", label: "حظر", target: "member", fields: ["reason", "deleteMessages"] },
  { value: "kick", label: "طرد", target: "member", fields: ["reason"] },
  { value: "timeout", label: "كتم مؤقت", target: "member", fields: ["reason", "duration"] },
  { value: "untimeout", label: "رفع الكتم", target: "member", fields: ["reason"] },
  { value: "unban", label: "فك حظر", target: "user", fields: ["reason"] },
  { value: "nickname", label: "تغيير اللقب", target: "member", fields: ["nickname"] },
  { value: "role_add", label: "إضافة رتبة", target: "member", fields: ["role"] },
  { value: "role_remove", label: "إزالة رتبة", target: "member", fields: ["role"] },
  { value: "purge", label: "حذف رسائل", target: "channel", fields: ["amount", "reason"] },
  { value: "lock", label: "قفل قناة", target: "channel", fields: ["reason"] },
  { value: "unlock", label: "فتح قناة", target: "channel", fields: ["reason"] },
  { value: "slowmode", label: "وضع بطيء", target: "channel", fields: ["seconds", "reason"] },
];

const DANGEROUS = new Set(["ban", "kick", "timeout", "purge", "lock", "role_remove"]);

/** Presets inside the bot's 0..604800 second clamp for `deleteMessageSeconds`. */
const DELETE_MESSAGE_OPTIONS = [
  { value: 0, label: "لا تحذف رسائله" },
  { value: 3600, label: "آخر ساعة" },
  { value: 86400, label: "آخر 24 ساعة" },
  { value: 604800, label: "آخر 7 أيام" },
];

function ModerationPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [cases, setCases] = useState<ModCase[]>([]);
  const [ladders, setLadders] = useState<WarnLadder[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [count, setCount] = useState(3);
  const [action, setAction] = useState("timeout");
  const [dur, setDur] = useState("1h");

  const [modAction, setModAction] = useState("ban");
  const [modMemberId, setModMemberId] = useState<string | null>(null);
  const [modUserId, setModUserId] = useState("");
  const [modChannelId, setModChannelId] = useState<string | null>(null);
  const [modRoleId, setModRoleId] = useState<string | null>(null);
  const [modReason, setModReason] = useState("");
  const [modDuration, setModDuration] = useState("1h");
  const [modNickname, setModNickname] = useState("");
  const [modAmount, setModAmount] = useState(10);
  const [modSeconds, setModSeconds] = useState(60);
  const [modDeleteSeconds, setModDeleteSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [g, m] = await Promise.all([getGuild({ data: { guildId } }), getModeration({ data: { guildId } })]);
    setGuild(g);
    setWarnings(m.warnings);
    setCases(m.cases);
    setLadders(m.ladders);
  }

  async function submitAction(choice: (typeof MOD_ACTIONS)[number]) {
    const data: {
      guildId: string;
      action: string;
      targetId?: string;
      reason?: string;
      durationMs?: number | null;
      deleteMessageSeconds?: number;
      channelId?: string | null;
      amount?: number;
      seconds?: number;
      nickname?: string | null;
      roleId?: string | null;
    } = { guildId, action: choice.value };

    if (choice.target === "member") {
      if (!modMemberId) return void toast.error("اختر عضواً");
      data.targetId = modMemberId;
    } else if (choice.target === "user") {
      if (!modUserId.trim()) return void toast.error("أدخل معرّف المستخدم");
      data.targetId = modUserId.trim();
    } else {
      if (!modChannelId) return void toast.error("اختر قناة");
      data.channelId = modChannelId;
    }

    const has = (f: ModField) => choice.fields.includes(f);
    if (has("reason") && modReason.trim()) data.reason = modReason.trim();
    if (has("deleteMessages")) data.deleteMessageSeconds = modDeleteSeconds;
    if (has("amount")) data.amount = modAmount;
    if (has("seconds")) data.seconds = modSeconds;
    // An empty nickname clears it, which is what /mod nickname does too.
    if (has("nickname")) data.nickname = modNickname.trim() || null;
    if (has("role")) {
      if (!modRoleId) return void toast.error("اختر رتبة");
      data.roleId = modRoleId;
    }
    if (has("duration")) {
      const ms = parseDurationInput(modDuration);
      if (!ms) return void toast.error("مدة غير صالحة — اكتب مثل 10m أو 1h أو 1d");
      data.durationMs = ms;
    }

    setBusy(true);
    try {
      await runModAction({ data });
      toast.success(`تم تنفيذ: ${choice.label}`);
      setModReason("");
      setModNickname("");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    reload().catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  if (!guild) return null;

  const choice = MOD_ACTIONS.find((c) => c.value === modAction) ?? MOD_ACTIONS[0];
  const shows = (f: ModField) => choice.fields.includes(f);

  return (
    <div>
      <PageHeader title="الإشراف" description="التحذيرات، سلّم العقوبات، الإجراءات المباشرة، وسجل القضايا — نفس جداول ودوال /mod." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle hint="يُسجَّل في warnings و mod_cases كما يفعل أمر /mod warn.">تحذير جديد</PanelTitle>
          <div className="space-y-3">
            <Field label="العضو">
              <MemberSelect members={guild.members} value={targetId} onChange={setTargetId} hideBots allowEmpty />
            </Field>
            <Field label="السبب">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب التحذير" />
            </Field>
            <Button
              onClick={async () => {
                if (!targetId) return toast.error("اختر عضواً");
                try {
                  await addWarningFn({ data: { guildId, targetId, reason } });
                  setReason("");
                  toast.success("تم تسجيل التحذير");
                  await reload();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              تسجيل تحذير
            </Button>
          </div>
        </Panel>

        <Panel>
          <PanelTitle hint="عند الوصول لهذا العدد تُطبَّق العقوبة تلقائياً.">سلّم العقوبات</PanelTitle>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Field label="عدد التحذيرات">
              <Input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </Field>
            <Field label="الإجراء">
              <Select value={action} onChange={(e) => setAction(e.target.value)}>
                {LADDER_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="المدة" hint="مثل 10m أو 1h">
              <Input value={dur} onChange={(e) => setDur(e.target.value)} />
            </Field>
          </div>
          <Button
            onClick={async () => {
              try {
                await saveLadder({
                  data: {
                    guildId,
                    warnCount: count,
                    action,
                    durationMs: action === "timeout" ? parseDurationInput(dur) : null,
                  },
                });
                toast.success("حُفظ السلم");
                await reload();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            حفظ الدرجة
          </Button>
          <ul className="mt-4 space-y-2">
            {ladders.map((l) => (
              <li key={l.warnCount} className="flex items-center justify-between rounded-xl bg-elevated px-3 py-2 text-sm">
                <span>
                  {l.warnCount} تحذير → {ACTION_LABELS[l.action] ?? l.action}
                  {l.durationMs ? ` (${formatDuration(l.durationMs)})` : ""}
                </span>
                <button
                  type="button"
                  className="text-xs text-danger hover:underline"
                  onClick={async () => {
                    await saveLadder({ data: { guildId, warnCount: l.warnCount, action: "remove", durationMs: null, remove: true } });
                    await reload();
                  }}
                >
                  حذف
                </button>
              </li>
            ))}
            {ladders.length === 0 && <p className="text-sm text-muted">لا درجات بعد.</p>}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle hint="كل إجراء يمر من نفس دوال /mod في البوت: تُسجَّل القضية في mod_cases، ويُتحقَّق من الصلاحيات وترتيب الرتب قبل التنفيذ.">
          إجراءات إشرافية
        </PanelTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="الإجراء">
            <Select value={choice.value} onChange={(e) => setModAction(e.target.value)}>
              {MOD_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          {choice.target === "member" && (
            <Field label="العضو">
              <MemberSelect members={guild.members} value={modMemberId} onChange={setModMemberId} hideBots allowEmpty />
            </Field>
          )}

          {choice.target === "user" && (
            <Field label="معرّف المستخدم" hint="المحظور غالباً لم يعد في السيرفر، فيُكتب معرّفه رقمياً.">
              <Input
                dir="ltr"
                value={modUserId}
                onChange={(e) => setModUserId(e.target.value)}
                placeholder="123456789012345678"
              />
            </Field>
          )}

          {choice.target === "channel" && (
            <Field label="القناة">
              <ChannelSelect channels={guild.channels} value={modChannelId} onChange={setModChannelId} allowEmpty />
            </Field>
          )}

          {shows("role") && (
            <Field label="الرتبة">
              <RoleSelect roles={guild.roles} value={modRoleId} onChange={setModRoleId} allowEmpty />
            </Field>
          )}

          {shows("duration") && (
            <Field label="المدة" hint="مثل 10m أو 1h أو 1d — تُحَدّ بين 5 ثوانٍ و28 يوماً.">
              <Input dir="ltr" value={modDuration} onChange={(e) => setModDuration(e.target.value)} />
            </Field>
          )}

          {shows("deleteMessages") && (
            <Field label="حذف رسائله">
              <Select value={modDeleteSeconds} onChange={(e) => setModDeleteSeconds(Number(e.target.value))}>
                {DELETE_MESSAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {shows("amount") && (
            <Field label="عدد الرسائل" hint="من 1 إلى 100، ولا يشمل الرسائل الأقدم من 14 يوماً.">
              <Input
                type="number"
                min={1}
                max={100}
                value={modAmount}
                onChange={(e) => setModAmount(Number(e.target.value))}
              />
            </Field>
          )}

          {shows("seconds") && (
            <Field label="الثواني" hint="0 يلغي الوضع البطيء — وأعلاه 21600.">
              <Input
                type="number"
                min={0}
                max={21600}
                value={modSeconds}
                onChange={(e) => setModSeconds(Number(e.target.value))}
              />
            </Field>
          )}

          {shows("nickname") && (
            <Field label="اللقب الجديد" hint="اتركه فارغاً لإزالة اللقب.">
              <Input value={modNickname} onChange={(e) => setModNickname(e.target.value)} />
            </Field>
          )}

          {shows("reason") && (
            <Field label="السبب" hint="يظهر في سجل القضايا وفي رسالة الإشراف.">
              <Input value={modReason} onChange={(e) => setModReason(e.target.value)} placeholder="سبب الإجراء" />
            </Field>
          )}
        </div>

        <Button
          className="mt-5"
          variant={DANGEROUS.has(choice.value) ? "danger" : "default"}
          disabled={busy}
          onClick={() => submitAction(choice)}
        >
          {busy ? "جارٍ التنفيذ…" : `تنفيذ: ${choice.label}`}
        </Button>
      </Panel>

      <Panel className="mt-5">
        <PanelTitle>التحذيرات</PanelTitle>
        {warnings.length === 0 ? (
          <EmptyState title="لا تحذيرات" body="سجّل تحذيراً من النموذج أعلاه أو عبر /mod warn." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>العضو</Th>
                <Th>المشرف</Th>
                <Th>السبب</Th>
                <Th>التاريخ</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {warnings.map((w) => (
                <tr key={w.id}>
                  <Td className="tabular-nums text-muted">{w.id}</Td>
                  <Td>{memberName(guild.members, w.targetId)}</Td>
                  <Td>{memberName(guild.members, w.moderatorId)}</Td>
                  <Td className="max-w-[16rem] truncate">{w.reason}</Td>
                  <Td className="text-muted">{formatRelative(w.createdAt)}</Td>
                  <Td>
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      onClick={async () => {
                        await removeWarningFn({ data: { guildId, id: w.id } });
                        toast.success("حُذف التحذير");
                        await reload();
                      }}
                    >
                      حذف
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel className="mt-5">
        <PanelTitle>سجل القضايا</PanelTitle>
        {cases.length === 0 ? (
          <EmptyState title="السجل فارغ" body="كل إجراء إشرافي يُضاف هنا." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>الإجراء</Th>
                <Th>الهدف</Th>
                <Th>المنفّذ</Th>
                <Th>السبب</Th>
                <Th>متى</Th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Pill tone={c.action === "ban" || c.action === "kick" ? "danger" : "primary"}>
                      {ACTION_LABELS[c.action] ?? c.action}
                    </Pill>
                  </Td>
                  <Td>{memberName(guild.members, c.targetId)}</Td>
                  <Td>{memberName(guild.members, c.moderatorId)}</Td>
                  <Td className="max-w-[16rem] truncate text-muted">{c.reason ?? "—"}</Td>
                  <Td className="text-muted">{formatRelative(c.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
