import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState, Field, PageHeader, Panel, PanelTitle, Pill, TableWrap, Td, Th } from "@/components/dashboard/primitives";
import { MultiChannelSelect, MultiRoleSelect } from "@/components/dashboard/selects";
import { addBlockedWord, getAutomod, getGuild, removeBlockedWord, saveAutomod } from "@/lib/dashboard/api";
import type { AutomodConfig, AutomodWord, GuildMeta } from "@/lib/dashboard/types";
import { ACTION_LABELS } from "@/lib/dashboard/types";
import { AUTOMOD_ACTIONS, RAID_ACTIONS, formatDuration, parseDurationInput } from "@/lib/dashboard/labels";

export const Route = createFileRoute("/dashboard/$guildId/automod")({
  head: () => ({ meta: [{ title: "الحماية | Vexon" }] }),
  component: AutomodPage,
});

function AutomodPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [config, setConfig] = useState<AutomodConfig | null>(null);
  const [words, setWords] = useState<AutomodWord[]>([]);
  const [word, setWord] = useState("");
  const [wAction, setWAction] = useState("warn");
  const [wDur, setWDur] = useState("10m");
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [g, a] = await Promise.all([getGuild({ data: { guildId } }), getAutomod({ data: { guildId } })]);
    setGuild(g);
    setConfig(a.config);
    setWords(a.words);
  }

  useEffect(() => {
    reload().catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  if (!guild || !config) return null;
  const patch = (p: Partial<AutomodConfig>) => setConfig({ ...config, ...p });

  return (
    <div>
      <PageHeader
        title="الحماية التلقائية"
        description="مكافحة السبام، المنشنات، الروابط، الغارات، والتخريب — نفس جدول automod_config."
        actions={
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveAutomod({ data: { guildId, config } });
                toast.success("حُفظت إعدادات الحماية");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            حفظ الإعدادات
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle>مكافحة السبام</PanelTitle>
          <Switch checked={config.spamEnabled} onCheckedChange={(v) => patch({ spamEnabled: v })} label="تفعيل" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="عدد الرسائل">
              <Input type="number" min={3} max={20} value={config.spamMessages} onChange={(e) => patch({ spamMessages: Number(e.target.value) })} />
            </Field>
            <Field label="النافذة (ث)">
              <Input
                type="number"
                min={2}
                max={30}
                value={Math.round(config.spamWindowMs / 1000)}
                onChange={(e) => patch({ spamWindowMs: Number(e.target.value) * 1000 })}
              />
            </Field>
            <Field label="العقوبة">
              <Select value={config.spamAction} onChange={(e) => patch({ spamAction: e.target.value })}>
                {AUTOMOD_ACTIONS.filter((a) => a.value !== "warn").map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="مدة الكتم (د)">
              <Input
                type="number"
                min={1}
                value={Math.round(config.spamDurationMs / 60000)}
                onChange={(e) => patch({ spamDurationMs: Number(e.target.value) * 60000 })}
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelTitle>المنشنات والروابط</PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="حد المنشنات">
              <Input type="number" min={2} max={20} value={config.mentionLimit} onChange={(e) => patch({ mentionLimit: Number(e.target.value) })} />
            </Field>
            <Field label="عقوبة المنشن">
              <Select value={config.mentionAction} onChange={(e) => patch({ mentionAction: e.target.value })}>
                {AUTOMOD_ACTIONS.filter((a) => a.value !== "warn").map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4 space-y-1">
            <Switch checked={config.linksBlock} onCheckedChange={(v) => patch({ linksBlock: v })} label="حظر الروابط" />
            <Switch checked={config.invitesBlock} onCheckedChange={(v) => patch({ invitesBlock: v })} label="حظر دعوات ديسكورد" />
          </div>
        </Panel>

        <Panel>
          <PanelTitle>مكافحة الغارات</PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="عدد الانضمامات">
              <Input type="number" min={3} max={50} value={config.raidJoins} onChange={(e) => patch({ raidJoins: Number(e.target.value) })} />
            </Field>
            <Field label="النافذة (ث)">
              <Input
                type="number"
                min={5}
                max={120}
                value={Math.round(config.raidWindowMs / 1000)}
                onChange={(e) => patch({ raidWindowMs: Number(e.target.value) * 1000 })}
              />
            </Field>
            <Field label="الإجراء">
              <Select value={config.raidAction} onChange={(e) => patch({ raidAction: e.target.value })}>
                {RAID_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="عمر الحساب الأدنى (ساعات)">
              <Input
                type="number"
                min={0}
                value={Math.round(config.raidMinAccountAgeMs / 3_600_000)}
                onChange={(e) => patch({ raidMinAccountAgeMs: Number(e.target.value) * 3_600_000 })}
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelTitle>مكافحة التخريب (Nuke)</PanelTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="حذف قنوات">
              <Input type="number" min={2} max={20} value={config.nukeChannelDeletes} onChange={(e) => patch({ nukeChannelDeletes: Number(e.target.value) })} />
            </Field>
            <Field label="حذف رتب">
              <Input type="number" min={2} max={20} value={config.nukeRoleDeletes} onChange={(e) => patch({ nukeRoleDeletes: Number(e.target.value) })} />
            </Field>
            <Field label="حظر جماعي">
              <Input type="number" min={2} max={20} value={config.nukeBans} onChange={(e) => patch({ nukeBans: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="نافذة الرصد (ث)" hint="خلال كم ثانية تُحتسب الأفعال المتتالية.">
            <Input
              type="number"
              className="mt-3"
              min={5}
              value={Math.round(config.nukeWindowMs / 1000)}
              onChange={(e) => patch({ nukeWindowMs: Number(e.target.value) * 1000 })}
            />
          </Field>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle hint="الرتب والقنوات هنا تتجاوز فلاتر الحماية.">استثناءات</PanelTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="رتب مستثناة">
            <MultiRoleSelect roles={guild.roles} value={config.ignoreRoleIds} onChange={(v) => patch({ ignoreRoleIds: v })} />
          </Field>
          <Field label="قنوات مستثناة">
            <MultiChannelSelect channels={guild.channels} value={config.ignoreChannelIds} onChange={(v) => patch({ ignoreChannelIds: v })} />
          </Field>
        </div>
      </Panel>

      <Panel className="mt-5">
        <PanelTitle>الكلمات المحظورة</PanelTitle>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="الكلمة" className="sm:max-w-xs" />
          <Select value={wAction} onChange={(e) => setWAction(e.target.value)} className="sm:max-w-[10rem]">
            {AUTOMOD_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
          <Input value={wDur} onChange={(e) => setWDur(e.target.value)} placeholder="المدة للكتم" className="sm:max-w-[8rem]" />
          <Button
            onClick={async () => {
              try {
                await addBlockedWord({
                  data: {
                    guildId,
                    word,
                    action: wAction,
                    durationMs: wAction === "timeout" ? parseDurationInput(wDur) : null,
                  },
                });
                setWord("");
                toast.success("أُضيفت الكلمة");
                await reload();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            إضافة
          </Button>
        </div>
        {words.length === 0 ? (
          <EmptyState title="لا كلمات محظورة" body="أضف كلمات تُعاقَب تلقائياً عند ظهورها في الشات." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>الكلمة</Th>
                <Th>العقوبة</Th>
                <Th>المدة</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {words.map((w) => (
                <tr key={w.id}>
                  <Td className="font-mono" dir="ltr">
                    {w.word}
                  </Td>
                  <Td>
                    <Pill tone={w.action === "ban" ? "danger" : "primary"}>{ACTION_LABELS[w.action] ?? w.action}</Pill>
                  </Td>
                  <Td className="text-muted">{formatDuration(w.durationMs)}</Td>
                  <Td>
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      onClick={async () => {
                        await removeBlockedWord({ data: { guildId, id: w.id } });
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
    </div>
  );
}
