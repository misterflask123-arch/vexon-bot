-- Discord account links for the dashboard.
--
-- The site signs people in with Better Auth (Google / X through the Grok
-- broker), which knows NOTHING about Discord. The dashboard needs a real
-- Discord identity to (a) list the visitor's servers from the Discord API and
-- (b) sign the short-lived admin token the bot verifies. This table holds that
-- link: one row per site user, keyed by the Better Auth user id.
--
-- Access/refresh tokens are the only sensitive columns here. They are read
-- server-side only (src/lib/discord/oauth.server.ts) and are never part of any
-- server function's return value, so they cannot reach the browser.

create table if not exists discord_links (
  user_id text primary key,
  discord_id text not null,
  username text,
  global_name text,
  avatar text,
  access_token text not null,
  refresh_token text,
  scope text not null default 'identify guilds',
  -- Milliseconds since the epoch; the token is refreshed shortly BEFORE this.
  expires_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lookup used when the bot needs "which site user is this Discord account".
create index if not exists idx_discord_links_discord on discord_links (discord_id);
