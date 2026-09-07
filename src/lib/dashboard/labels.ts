export const MATCH_MODES = [
  { value: "prefix", label: "بداية الرسالة" },
  { value: "exact", label: "مطابقة كاملة" },
  { value: "contains", label: "يحتوي النص" },
] as const;

export const AUTOMOD_ACTIONS = [
  { value: "warn", label: "تحذير" },
  { value: "timeout", label: "كتم" },
  { value: "kick", label: "طرد" },
  { value: "ban", label: "حظر" },
] as const;

export const RAID_ACTIONS = [
  { value: "lockdown", label: "إغلاق السيرفر" },
  { value: "timeout", label: "كتم المنضمين" },
  { value: "kick", label: "طرد المنضمين" },
] as const;

export const LADDER_ACTIONS = [
  { value: "timeout", label: "كتم" },
  { value: "kick", label: "طرد" },
  { value: "ban", label: "حظر" },
] as const;

export const COMMAND_PERM_KEYS = [
  { value: "mod", label: "/mod الإشراف" },
  { value: "custom", label: "/custom الأوامر" },
  { value: "automod", label: "/automod الحماية" },
  { value: "ticket", label: "/ticket التذاكر" },
  { value: "server", label: "/server السيرفر" },
  { value: "games", label: "/games الألعاب" },
] as const;

export const SUGGEST_STATUSES: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  denied: "مرفوض",
};

export const TICKET_STATUSES: Record<string, string> = {
  open: "مفتوحة",
  closed: "مغلقة",
};

export function formatDuration(ms: number | null | undefined) {
  if (!ms || ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} س`;
  return `${Math.floor(h / 24)} ي`;
}

export function parseDurationInput(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const m = t.match(/^(\d+)\s*(s|m|h|d|ث|د|س|ي)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2] || "m";
  if (u === "s" || u === "ث") return n * 1000;
  if (u === "h" || u === "س") return n * 3_600_000;
  if (u === "d" || u === "ي") return n * 86_400_000;
  return n * 60_000;
}
