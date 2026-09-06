export type ChannelType = "text" | "category" | "voice";

export type GuildChannel = {
  id: string;
  name: string;
  type: ChannelType;
};

export type GuildRole = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export type GuildMember = {
  memberId: string;
  username: string;
  displayName: string | null;
  color: string;
  bot: boolean;
};

export type GuildSummary = {
  id: string;
  name: string;
  /** Real guild icon from Discord's CDN, or null when the guild has none. */
  iconUrl: string | null;
  /** Deterministic fallback colour derived from the guild id. */
  iconColor: string;
  memberCount: number;
  locale: string;
  staffRoleId: string | null;
};

export type GuildMeta = {
  id: string;
  name: string;
  iconUrl: string | null;
  iconColor: string;
  memberCount: number;
  ownerId: string | null;
  staffRoleId: string | null;
  logChannelId: string | null;
  modLogChannelId: string | null;
  ticketLogChannelId: string | null;
  locale: string;
  channels: GuildChannel[];
  roles: GuildRole[];
  members: GuildMember[];
  commandPerms: { commandKey: string; roleIds: string[] }[];
};

export type CustomAction = {
  type: string;
  reason?: string;
  content?: string;
  duration?: string;
  durationMs?: number;
  amount?: number;
  seconds?: number;
  roleId?: string;
  deleteMessageSeconds?: number;
};

export type CustomCommand = {
  id: number;
  trigger: string;
  matchMode: string;
  staffOnly: boolean;
  allowedRoleIds: string[];
  requiredPerm: string | null;
  cooldownSeconds: number;
  enabled: boolean;
  actions: CustomAction[];
  updatedAt: number;
};

export type AutomodConfig = {
  spamEnabled: boolean;
  spamMessages: number;
  spamWindowMs: number;
  spamAction: string;
  spamDurationMs: number;
  mentionLimit: number;
  mentionAction: string;
  mentionDurationMs: number;
  linksBlock: boolean;
  invitesBlock: boolean;
  raidJoins: number;
  raidWindowMs: number;
  raidAction: string;
  raidMinAccountAgeMs: number;
  nukeChannelDeletes: number;
  nukeRoleDeletes: number;
  nukeBans: number;
  nukeWindowMs: number;
  ignoreChannelIds: string[];
  ignoreRoleIds: string[];
};

export type AutomodWord = {
  id: number;
  word: string;
  action: string;
  durationMs: number | null;
};

export type WarnLadder = {
  warnCount: number;
  action: string;
  durationMs: number | null;
};

export type ModCase = {
  id: number;
  action: string;
  targetId: string;
  moderatorId: string;
  reason: string | null;
  createdAt: number;
};

export type Warning = {
  id: number;
  targetId: string;
  moderatorId: string;
  reason: string;
  createdAt: number;
};

export type TicketCategory = {
  key: string;
  label: string;
  description?: string;
  categoryId: string;
  emoji?: string;
  /** Intake questions the bot asks when the ticket opens — set by /ticket, not by the dashboard. */
  questions?: { id: string; label: string; required: boolean }[];
};

export type TicketPanel = {
  id: number;
  channelId: string;
  title: string;
  description: string;
  color: number;
  style: string;
  categories: TicketCategory[];
  staffRoleIds: string[];
  maxOpenPerUser: number;
  autocloseMs: number;
  aiEnabled: boolean;
};

export type TicketRow = {
  id: number;
  channelId: string;
  openerId: string;
  panelId: number;
  categoryKey: string;
  status: string;
  claimedBy: string | null;
  aiEnabled: boolean;
  createdAt: number;
  closedAt: number | null;
  rating: number | null;
};

export type KnowledgeItem = {
  id: number;
  title: string;
  content: string;
};

export type WelcomeConfig = {
  enabled: boolean;
  channelId: string | null;
  message: string | null;
  goodbyeEnabled: boolean;
  goodbyeChannelId: string | null;
  goodbyeMessage: string | null;
  autoroleIds: string[];
  suggestChannelId: string | null;
};

export type RoleMenu = {
  id: number;
  channelId: string;
  mode: string;
  title: string;
  uniquePick: boolean;
  options: { label: string; roleId: string; emoji?: string }[];
};

export type Suggestion = {
  id: number;
  channelId: string;
  authorId: string;
  content: string;
  status: string;
  createdAt: number;
};

export type Giveaway = {
  id: number;
  channelId: string;
  prize: string;
  winners: number;
  endsAt: number;
  hostId: string;
  ended: boolean;
  entries: string[];
};

export type Poll = {
  id: number;
  channelId: string;
  question: string;
  options: string[];
  /** Option index (as a string, since it survives JSON) -> number of votes. */
  votes: Record<string, number>;
  endsAt: number | null;
  ended: boolean;
  authorId: string;
};

export type AutoReact = {
  channelId: string;
  emojis: string[];
};

export type StatsChannels = {
  categoryId: string | null;
  membersChannelId: string | null;
  botsChannelId: string | null;
  onlineChannelId: string | null;
};

export type InviteRow = {
  memberId: string;
  username: string;
  regular: number;
  left: number;
  fake: number;
  total: number;
};

export type GameScore = {
  memberId: string;
  username: string;
  points: number;
  wins: number;
};

export type Overview = {
  guild: GuildMeta;
  openTickets: number;
  closedTickets: number;
  warnings: number;
  cases: number;
  customCommands: number;
  blockedWords: number;
  automodOn: boolean;
  recentCases: ModCase[];
  recentTickets: TicketRow[];
  securityEvents: { id: number; actorId: string; kind: string; createdAt: number }[];
};

/**
 * One row of the bot's `admin_audit_log` — every dashboard mutation is recorded
 * there by the bot itself, successes and failures alike.
 */
export type AuditEntry = {
  id: number;
  actorId: string;
  actorName: string | null;
  /** HTTP verb + route, e.g. `PATCH /settings`. */
  action: string;
  /** The id/name the action targeted, when the request carried one. */
  target: string | null;
  /** The request body as compact JSON (the bot stores it structured), or null when empty. */
  detail: string | null;
  ok: boolean;
  error: string | null;
  createdAt: number;
};

/** What `POST /admin/:guildId/mod/:action` answers with. */
export type ModActionResult = {
  ok: boolean;
  /** `mod_cases` row created by the action, when it creates one. */
  caseId?: number;
};

export const ACTION_TYPES = [
  "ban",
  "unban",
  "kick",
  "timeout",
  "untimeout",
  "warn",
  "unwarn",
  "purge",
  "lock",
  "unlock",
  "slowmode",
  "nickname",
  "reply",
  "dm",
  "role_add",
  "role_remove",
] as const;

export const ACTION_LABELS: Record<string, string> = {
  ban: "حظر",
  unban: "فك حظر",
  kick: "طرد",
  timeout: "كتم",
  untimeout: "إلغاء كتم",
  warn: "تحذير",
  unwarn: "حذف تحذير",
  purge: "حذف رسائل",
  lock: "قفل",
  unlock: "فتح",
  slowmode: "وضع بطيء",
  nickname: "لقب",
  reply: "رد",
  dm: "رسالة خاصة",
  role_add: "إضافة رتبة",
  role_remove: "إزالة رتبة",
  lockdown: "إغلاق السيرفر",
};

export const COMMAND_KEYS = ["mod", "custom", "automod", "ticket", "server", "games"] as const;
