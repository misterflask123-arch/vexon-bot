import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Field, PageHeader, Panel, PanelTitle, TableWrap, Td, Th } from "@/components/dashboard/primitives";
import { MemberSelect } from "@/components/dashboard/selects";
import { adjustPoints, getGames, getGuild } from "@/lib/dashboard/api";
import type { GameScore, GuildMeta } from "@/lib/dashboard/types";

export const Route = createFileRoute("/dashboard/$guildId/games")({
  head: () => ({ meta: [{ title: "الألعاب | Vexon" }] }),
  component: GamesPage,
});

function GamesPage() {
  const { guildId } = Route.useParams();
  const [guild, setGuild] = useState<GuildMeta | null>(null);
  const [scores, setScores] = useState<GameScore[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [delta, setDelta] = useState(10);

  async function reload() {
    const [g, s] = await Promise.all([getGuild({ data: { guildId } }), getGames({ data: { guildId } })]);
    setGuild(g);
    setScores(s);
  }

  useEffect(() => {
    reload().catch((e: Error) => toast.error(e.message));
  }, [guildId]);

  if (!guild) return null;

  return (
    <div>
      <PageHeader
        title="الألعاب"
        description="نقاط ومتصدرون لألعاب الشات (أسرع، فكك، لغز، أعلام، روليت…) — نفس جدول game_scores."
      />

      <Panel className="mb-5">
        <PanelTitle>تعديل النقاط</PanelTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="العضو">
            <MemberSelect members={guild.members} value={memberId} onChange={setMemberId} hideBots allowEmpty />
          </Field>
          <Field label="القيمة (+/−)">
            <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
          </Field>
          <div className="flex items-end gap-2">
            <Button
              onClick={async () => {
                if (!memberId) return toast.error("اختر عضواً");
                await adjustPoints({ data: { guildId, memberId, delta } });
                toast.success("عُدّلت النقاط");
                await reload();
              }}
            >
              تطبيق
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!memberId) return toast.error("اختر عضواً");
                await adjustPoints({ data: { guildId, memberId, delta: 0, reset: true } });
                await reload();
              }}
            >
              تصفير العضو
            </Button>
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          className="mt-4"
          onClick={async () => {
            await adjustPoints({ data: { guildId, memberId: "", delta: 0, resetAll: true } });
            toast.success("صُفّر المتصدرون");
            await reload();
          }}
        >
          تصفير السيرفر بالكامل
        </Button>
      </Panel>

      <Panel>
        <PanelTitle>المتصدرون</PanelTitle>
        {scores.length === 0 ? (
          <EmptyState title="لا نقاط بعد" body="العب عبر /games play أو أوامر الشات النصية." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>العضو</Th>
                <Th>النقاط</Th>
                <Th>الفوز</Th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={s.memberId}>
                  <Td className="tabular-nums text-muted">{i + 1}</Td>
                  <Td className="font-medium">{s.username}</Td>
                  <Td className="tabular-nums font-semibold">{s.points}</Td>
                  <Td className="tabular-nums">{s.wins}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
