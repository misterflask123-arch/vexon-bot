import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  EmptyState,
  Field,
  PageHeader,
  Panel,
  PanelTitle,
  Pill,
  Skeleton,
  TableWrap,
  Td,
  Th,
} from "@/components/dashboard/primitives";
import { ChannelSelect, MultiRoleSelect, RoleSelect } from "@/components/dashboard/selects";
import { getAudit, getGuild, saveCommandPerm, saveGuildSettings } from "@/lib/dashboard/api";
import type { AuditEntry, GuildMeta } from "@/lib/dashboard/types";
import { COMMAND_PERM_KEYS } from "@/lib/dashboard/labels";
import { formatRelative } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/$guildId/settings")({
  head: () => ({ meta: [{ title: "الإعدادات | Vexon" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [staffRoleId, setStaffRoleId] = useState<string | null>(null);
  const [logChannelId, setLogChannelId] = useState<string | null>(null);
  const [modLogChannelId, setModLogChannelId] = useState<string | null>(null);
  const [ticketLogChannelId, setTicketLogChannelId] = useState<string | null>(null);
  const [locale, setLocale] = useState("ar");
  const [perms, setPerms] = useState<Record<string, string[]>>({});
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [auditErr, setAuditErr] = useState<string | null>(null);
  const [auditLimit, setAuditLimit] = useState(50);

  async function loadAudit(limit = auditLimit) {
    try {
      setAudit(await getAudit({ data: { guildId, limit } }));
      setAuditErr(null);
    } catch (e) {
      setAudit([]);
      setAuditErr((e as Error).message);
    }
  }

  useEffect(() => {
    getGuild({ data: { guildId } })
      .then((g) => {
        setGuild(g);
        setStaffRoleId(g.staffRoleId);
        setLogChannelId(g.logChannelId);
        setModLogChannelId(g.modLogChannelId);
        setTicketLogChannelId(g.ticketLogChannelId);
        setLocale(g.locale);
        const map: Record<string, string[]> = {};
        for (const p of g.commandPerms) map[p.commandKey] = p.roleIds;
        setPerms(map);
      })
      .catch((e: Error) => toast.error(e.message));
    loadAudit();
  }, [guildId]);

  if (!guild) return null;

  return (
    <div>
      <PageHeader title="إعدادات السيرفر" description="رتبة الموظفين، قنوات السجلات، وصلاحيات كل مجموعة أوامر — نفس /config." />

      <Panel>
        <PanelTitle>الأساسيات</PanelTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رتبة الموظفين" hint="بوابة أوامر الإشراف إن لم تُحدَّد رتب خاصة بالأمر.">
            <RoleSelect roles={guild.roles} value={staffRoleId} onChange={setStaffRoleId} allowEmpty />
          </Field>
          <Field label="اللغة">
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <Field label="سجل عام">
            <ChannelSelect channels={guild.channels} value={logChannelId} onChange={setLogChannelId} allowEmpty types={["text"]} />
          </Field>
          <Field label="سجل الإشراف">
            <ChannelSelect channels={guild.channels} value={modLogChannelId} onChange={setModLogChannelId} allowEmpty types={["text"]} />
          </Field>
          <Field label="سجل التذاكر">
            <ChannelSelect channels={guild.channels} value={ticketLogChannelId} onChange={setTicketLogChannelId} allowEmpty types={["text"]} />
          </Field>
        </div>
        <Button
          className="mt-5"
          onClick={async () => {
            try {
              await saveGuildSettings({
                data: { guildId, staffRoleId, logChannelId, modLogChannelId, ticketLogChannelId, locale },
              });
              toast.success("حُفظت الإعدادات");
            } catch (e) {
              toast.error((e as Error).message);
            }
            await loadAudit();
          }}
        >
          حفظ الإعدادات
        </Button>
      </Panel>

      <Panel className="mt-5">
        <PanelTitle hint="إن حددت رتباً لأمر، لن تكفي رتبة الموظفين وحدها — يجب أن يملك العضو إحدى هذه الرتب.">
          رتب الأوامر
        </PanelTitle>
        <div className="space-y-5">
          {COMMAND_PERM_KEYS.map((k) => (
            <Field key={k.value} label={k.label}>
              <MultiRoleSelect
                roles={guild.roles}
                value={perms[k.value] ?? []}
                onChange={(v) => setPerms({ ...perms, [k.value]: v })}
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  try {
                    await saveCommandPerm({ data: { guildId, commandKey: k.value, roleIds: perms[k.value] ?? [] } });
                    toast.success(`حُفظت رتب ${k.label}`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                  await loadAudit();
                }}
              >
                حفظ
              </Button>
            </Field>
          ))}
        </div>
      </Panel>

      <Panel className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelTitle hint="يكتبه البوت بنفسه عند كل عملية تعديل — الناجحة والفاشلة — ويحتفظ بآخر 5000 عملية لكل سيرفر.">
            سجل التدقيق
          </PanelTitle>
          <div className="flex items-center gap-2">
            {audit && audit.length >= auditLimit && auditLimit < 200 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAuditLimit(200);
                  loadAudit(200);
                }}
              >
                عرض حتى 200
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => loadAudit()}>
              تحديث
            </Button>
          </div>
        </div>

        {auditErr && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{auditErr}</div>
        )}

        {!audit && !auditErr && <Skeleton className="h-40" />}

        {audit && audit.length === 0 && !auditErr && (
          <EmptyState title="السجل فارغ" body="لم تُسجَّل أي عملية تعديل على هذا السيرفر بعد." />
        )}

        {audit && audit.length > 0 && (
          <TableWrap>
            <thead>
              <tr>
                <Th>من</Th>
                <Th dir="ltr">العملية</Th>
                <Th dir="ltr">الهدف</Th>
                <Th dir="ltr">التفاصيل</Th>
                <Th>الحالة</Th>
                <Th>متى</Th>
              </tr>
            </thead>
            <tbody>
              {audit.map((e) => (
                <tr key={e.id}>
                  <Td>{e.actorName ?? "—"}</Td>
                  <Td dir="ltr" className="font-mono text-xs text-muted">
                    {e.action}
                  </Td>
                  <Td dir="ltr" className="font-mono text-xs text-muted">
                    {e.target ?? "—"}
                  </Td>
                  <Td dir="ltr" className="font-mono text-xs text-subtle">
                    <span className="block max-w-[18rem] truncate" title={e.detail ?? undefined}>
                      {e.detail ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    {e.ok ? (
                      <Pill tone="success">نجحت</Pill>
                    ) : (
                      <span className="flex flex-col items-start gap-1">
                        <Pill tone="danger">فشلت</Pill>
                        {e.error && <span className="text-xs text-danger">{e.error}</span>}
                      </span>
                    )}
                  </Td>
                  <Td className="text-muted">{formatRelative(e.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
