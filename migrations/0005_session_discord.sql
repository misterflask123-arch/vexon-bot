-- Store the Discord user OAuth grant on the Better Auth session itself.
-- Listing guilds reads these columns; the token is never returned to the client.

alter table "session" add column if not exists "discordAccessToken" text;
alter table "session" add column if not exists "discordId" text;
