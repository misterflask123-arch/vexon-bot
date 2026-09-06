import { Select } from "@/components/ui/input";
import type { GuildChannel, GuildMember, GuildRole } from "@/lib/dashboard/types";

export function ChannelSelect({
  channels,
  value,
  onChange,
  allowEmpty,
  types,
}: {
  channels: GuildChannel[];
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  allowEmpty?: boolean;
  types?: GuildChannel["type"][];
}) {
  const list = types ? channels.filter((c) => types.includes(c.type)) : channels.filter((c) => c.type !== "category");
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">— غير محدد —</option>}
      {list.map((c) => (
        <option key={c.id} value={c.id}>
          {c.type === "voice" ? "🔊 " : "# "}
          {c.name}
        </option>
      ))}
    </Select>
  );
}

export function RoleSelect({
  roles,
  value,
  onChange,
  allowEmpty,
}: {
  roles: GuildRole[];
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  allowEmpty?: boolean;
}) {
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">— غير محدد —</option>}
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </Select>
  );
}

export function MemberSelect({
  members,
  value,
  onChange,
  allowEmpty,
  hideBots,
}: {
  members: GuildMember[];
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  allowEmpty?: boolean;
  hideBots?: boolean;
}) {
  const list = hideBots ? members.filter((m) => !m.bot) : members;
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">— اختر عضواً —</option>}
      {list.map((m) => (
        <option key={m.memberId} value={m.memberId}>
          {m.displayName || m.username}
        </option>
      ))}
    </Select>
  );
}

export function MultiRoleSelect({
  roles,
  value,
  onChange,
}: {
  roles: GuildRole[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((r) => {
        const on = value.includes(r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== r.id) : [...value, r.id])}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              on ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-elevated text-muted hover:text-fg"
            }`}
          >
            {r.name}
          </button>
        );
      })}
    </div>
  );
}

export function MultiChannelSelect({
  channels,
  value,
  onChange,
}: {
  channels: GuildChannel[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const list = channels.filter((c) => c.type === "text");
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((c) => {
        const on = value.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              on ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-elevated text-muted hover:text-fg"
            }`}
          >
            #{c.name}
          </button>
        );
      })}
    </div>
  );
}
