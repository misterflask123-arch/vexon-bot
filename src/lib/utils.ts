import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1540775400026673222&permissions=8&integration_type=0&scope=bot";

export const SUPPORT_URL = "https://discord.gg/5RY55steKR";

/** رابط إحصائيات البوت الحية */
export const STATS_API_URL = "http://node1.waifly.com:25198/stats";

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

export function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} ي`;
  return new Date(ts).toLocaleDateString("ar");
}

export function memberName(
  members: { memberId: string; username: string; displayName: string | null }[],
  id: string | null | undefined,
) {
  if (!id) return "—";
  const m = members.find((x) => x.memberId === id);
  return m?.displayName || m?.username || id.slice(0, 8);
}

export function channelName(channels: { id: string; name: string }[], id: string | null | undefined) {
  if (!id) return "غير محدد";
  return channels.find((c) => c.id === id)?.name ?? id.slice(0, 8);
}

export function roleName(roles: { id: string; name: string }[], id: string | null | undefined) {
  if (!id) return "غير محدد";
  return roles.find((r) => r.id === id)?.name ?? id.slice(0, 8);
}
