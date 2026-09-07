import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState, Field, PageHeader, Panel, PanelTitle, Pill } from "@/components/dashboard/primitives";
import { ChannelSelect, MultiRoleSelect, RoleSelect } from "@/components/dashboard/selects";
import {
  endGiveaway,
  getGuild,
  getServerSystems,
  saveAutoReact,
  saveGiveaway,
  savePoll,
  saveRoleMenu,
  saveStatsChannels,
  saveWelcome,
  setSuggestionStatus,
} from "@/lib/dashboard/api";
import type {
  AutoReact,
  Giveaway,
  GuildMeta,
  Poll,
  RoleMenu,
  StatsChannels,
  Suggestion,
  WelcomeConfig,
} from "@/lib/dashboard/types";
import { SUGGEST_STATUSES, parseDurationInput } from "@/lib/dashboard/labels";
import { channelName, formatRelative, memberName } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/$guildId/server")({
  head: () => ({ meta: [{ title: "أنظمة السيرفر | Vexon" }] }),
  component: ServerPage,
});

function ServerPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [welcome, setWelcome] = useState<WelcomeConfig | null>(null);
  const [menus, setMenus] = useState<RoleMenu[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [autoReact, setAutoReact] = useState<AutoReact[]>([]);
  const [stats, setStats] = useState<StatsChannels | null>(null);
  const [prize, setPrize] = useState("");
  const [gDur, setGDur] = useState("1d");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("نعم | لا");
  const [menuTitle, setMenuTitle] = useState("اختر رتبة");
  const [menuRole, setMenuRole] = useState<string | null>(null);
  const [reactChannel, setReactChannel] = useState<string | null>(null);
  const [reactEmoji, setReactEmoji] = useState("✅");

  async function reload() {
    const [g, s] = await Promise.all([getGuild({ data: { guildId } }), getServerSystems({ data: { guildId } })]);
    setGuild(g);
    setWelcome(s.welcome);
    setMenus(s.menus);
    setSuggestions(s.suggestions);
    setGiveaways(s.giveaways);
    setPolls(s.polls);
    setAutoReact(s.autoReact);
    setStats(s.stats);
  }

  useEffect(() => {
    reload().catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  if (!guild || !welcome || !stats) return null;

  return (
    <div>
      <PageHeader title="أنظمة السيرفر" description="ترحيب، رتب، اقتراحات، سحوبات، استطلاعات، رياكشن تلقائي وإحصائيات." />

      <Panel>
        <PanelTitle>الترحيب والوداع</PanelTitle>
        <Switch checked={welcome.enabled} onCheckedChange={(v) => setWelcome({ ...welcome, enabled: v })} label="تفعيل الترحيب" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="قناة الترحيب">
            <ChannelSelect channels={guild.channels} value={welcome.channelId} onChange={(v) => setWelcome({ ...welcome, channelId: v })} allowEmpty types={["text"]} />
          </Field>
          <Field label="رسالة الترحيب" hint="{user} {username} {server} {membercount}">
            <Textarea value={welcome.message ?? ""} onChange={(e) => setWelcome({ ...welcome, message: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4">
          <Switch checked={welcome.goodbyeEnabled} onCheckedChange={(v) => setWelcome({ ...welcome, goodbyeEnabled: v })} label="تفعيل الوداع" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="قناة الوداع">
            <ChannelSelect
              channels={guild.channels}
              value={welcome.goodbyeChannelId}
              onChange={(v) => setWelcome({ ...welcome, goodbyeChannelId: v })}
              allowEmpty
              types={["text"]}
            />
          </Field>
          <Field label="رسالة الوداع">
            <Textarea value={welcome.goodbyeMessage ?? ""} onChange={(e) => setWelcome({ ...welcome, goodbyeMessage: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="رتب تلقائية عند الدخول">
            <MultiRoleSelect roles={guild.roles} value={welcome.autoroleIds} onChange={(v) => setWelcome({ ...welcome, autoroleIds: v })} />
          </Field>
          <Field label="قناة الاقتراحات">
            <ChannelSelect
              channels={guild.channels}
              value={welcome.suggestChannelId}
              onChange={(v) => setWelcome({ ...welcome, suggestChannelId: v })}
              allowEmpty
              types={["text"]}
            />
          </Field>
        </div>
        <Button
          className="mt-5"
          onClick={async () => {
            await saveWelcome({ data: { guildId, ...welcome } });
            toast.success("حُفظ الترحيب");
          }}
        >
          حفظ الترحيب
        </Button>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle>قوائم الرتب</PanelTitle>
          <div className="space-y-3">
            <Field label="العنوان">
              <Input value={menuTitle} onChange={(e) => setMenuTitle(e.target.value)} />
            </Field>
            <Field label="الرتبة">
              <RoleSelect roles={guild.roles} value={menuRole} onChange={setMenuRole} allowEmpty />
            </Field>
            <Button
              onClick={async () => {
                if (!menuRole) return toast.error("اختر رتبة");
                const ch = guild.channels.find((c) => c.type === "text");
                await saveRoleMenu({
                  data: {
                    guildId,
                    channelId: ch?.id ?? "",
                    mode: "buttons",
                    title: menuTitle,
                    uniquePick: true,
                    options: [{ label: guild.roles.find((r) => r.id === menuRole)?.name ?? "رتبة", roleId: menuRole }],
                  },
                });
                toast.success("أُنشئت القائمة");
                await reload();
              }}
            >
              إنشاء قائمة أزرار
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {menus.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-xl bg-elevated px-3 py-2 text-sm">
                <span>
                  {m.title} · {m.options.length} خيار
                </span>
                <button
                  type="button"
                  className="text-xs text-danger"
                  onClick={async () => {
                    await saveRoleMenu({
                      data: {
                        guildId,
                        id: m.id,
                        remove: true,
                        channelId: m.channelId,
                        mode: m.mode,
                        title: m.title,
                        uniquePick: m.uniquePick,
                        options: m.options,
                      },
                    });
                    await reload();
                  }}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelTitle hint="ينشئ البوت هذه القنوات ويتحكم بأسمائها بنفسه — تماماً مثل /server stats.">
            قنوات الإحصائيات
          </PanelTitle>
          <ul className="space-y-2 text-sm">
            {(
              [
                ["القسم", stats.categoryId],
                ["قناة الأعضاء", stats.membersChannelId],
                ["قناة البوتات", stats.botsChannelId],
                ["المتصلون", stats.onlineChannelId],
              ] as const
            ).map(([label, id]) => (
              <li key={label} className="flex items-center justify-between gap-3 rounded-xl bg-elevated px-3 py-2">
                <span className="text-muted">{label}</span>
                <span className="truncate">{id ? channelName(guild.channels, id) : "—"}</span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4"
            onClick={async () => {
              const existed = Boolean(stats.categoryId);
              try {
                const res = await saveStatsChannels({ data: { guildId } });
                setStats(res.stats);
                toast.success(existed ? "حُدِّثت قنوات الإحصائيات" : "أُنشئت قنوات الإحصائيات");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {stats.categoryId ? "تحديث الإحصائيات" : "إنشاء قنوات الإحصائيات"}
          </Button>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle>الاقتراحات</PanelTitle>
        {suggestions.length === 0 ? (
          <EmptyState title="لا اقتراحات" body="اقتراحات الأعضاء عبر /server suggest." />
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-elevated p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm">{s.content}</p>
                  <p className="mt-1 text-xs text-muted">
                    {memberName(guild.members, s.authorId)} · {formatRelative(s.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={s.status === "approved" ? "success" : s.status === "denied" ? "danger" : "warn"}>
                    {SUGGEST_STATUSES[s.status] ?? s.status}
                  </Pill>
                  {s.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={async () => {
                          await setSuggestionStatus({ data: { guildId, id: s.id, status: "approved" } });
                          await reload();
                        }}
                      >
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          await setSuggestionStatus({ data: { guildId, id: s.id, status: "denied" } });
                          await reload();
                        }}
                      >
                        رفض
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle>السحوبات</PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الجائزة">
              <Input value={prize} onChange={(e) => setPrize(e.target.value)} />
            </Field>
            <Field label="المدة">
              <Input value={gDur} onChange={(e) => setGDur(e.target.value)} placeholder="1d" />
            </Field>
          </div>
          <Button
            className="mt-3"
            onClick={async () => {
              const ms = parseDurationInput(gDur) ?? 86_400_000;
              const ch = guild.channels.find((c) => c.type === "text");
              await saveGiveaway({ data: { guildId, channelId: ch?.id ?? "", prize, winners: 1, endsAt: Date.now() + ms } });
              setPrize("");
              toast.success("بدأ السحب");
              await reload();
            }}
          >
            بدء سحب
          </Button>
          <ul className="mt-4 space-y-2">
            {giveaways.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-xl bg-elevated px-3 py-2 text-sm">
                <span>
                  {g.prize} · {g.entries.length} مشارك {g.ended ? "(انتهى)" : ""}
                </span>
                {!g.ended && (
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={async () => {
                      await endGiveaway({ data: { guildId, id: g.id } });
                      await reload();
                    }}
                  >
                    إنهاء
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelTitle>الاستطلاعات</PanelTitle>
          <Field label="السؤال">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          </Field>
          <Field label="الخيارات" hint="افصل بـ |">
            <Input className="mt-3" value={options} onChange={(e) => setOptions(e.target.value)} />
          </Field>
          <Button
            className="mt-3"
            onClick={async () => {
              const opts = options.split("|").map((s) => s.trim()).filter(Boolean);
              const ch = guild.channels.find((c) => c.type === "text");
              await savePoll({ data: { guildId, channelId: ch?.id ?? "", question, options: opts, endsAt: Date.now() + 86_400_000 } });
              setQuestion("");
              toast.success("نُشر الاستطلاع");
              await reload();
            }}
          >
            نشر استطلاع
          </Button>
          <ul className="mt-4 space-y-2">
            {polls.map((p) => (
              <li key={p.id} className="rounded-xl bg-elevated px-3 py-2 text-sm">
                {p.question}
                <span className="mt-1 block text-xs text-muted">{p.options.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle>رياكشن تلقائي</PanelTitle>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ChannelSelect channels={guild.channels} value={reactChannel} onChange={setReactChannel} allowEmpty types={["text"]} />
          <Input value={reactEmoji} onChange={(e) => setReactEmoji(e.target.value)} className="sm:max-w-[8rem]" placeholder="إيموجي" />
          <Button
            onClick={async () => {
              if (!reactChannel) return toast.error("اختر قناة");
              const existing = autoReact.find((a) => a.channelId === reactChannel);
              const emojis = [...(existing?.emojis ?? []), reactEmoji].slice(0, 5);
              await saveAutoReact({ data: { guildId, channelId: reactChannel, emojis } });
              toast.success("أُضيف الرياكشن");
              await reload();
            }}
          >
            إضافة
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {autoReact.map((a) => (
            <li key={a.channelId} className="flex items-center justify-between rounded-xl bg-elevated px-3 py-2 text-sm">
              <span>
                #{channelName(guild.channels, a.channelId)} · {a.emojis.join(" ")}
              </span>
              <button
                type="button"
                className="text-xs text-danger"
                onClick={async () => {
                  await saveAutoReact({ data: { guildId, channelId: a.channelId, emojis: [], remove: true } });
                  await reload();
                }}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
