import { createFileRoute } from "@tanstack/react-router";
import { GuildShell } from "@/components/dashboard/shell";

export const Route = createFileRoute("/dashboard/$guildId")({
  component: GuildLayout,
});

function GuildLayout() {
  const { guildId } = Route.useParams();
  return <GuildShell guildId={guildId} />;
}
