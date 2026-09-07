-- Removes the fake dashboard replica that used to live in the SITE database.
--
-- The dashboard no longer keeps its own copy of the bot's data: every read and
-- write now goes to the bot over `/admin/*` with a short-lived signed token
-- (see src/lib/dashboard/api.ts). These tables were only ever populated by the
-- deleted `seed.ts`, so dropping them is the whole cleanup.
--
-- Nothing here touches the Better Auth schema in 0001_auth.sql ("user",
-- "session", "account", "verification") — there is no name overlap.
-- On a database that never ran 0002_dashboard.sql every statement is a no-op.

drop table if exists guild_channels cascade;
drop table if exists guild_roles cascade;
drop table if exists guild_members cascade;
drop table if exists command_perms cascade;
drop table if exists warnings cascade;
drop table if exists warn_ladders cascade;
drop table if exists mod_cases cascade;
drop table if exists automod_config cascade;
drop table if exists automod_words cascade;
drop table if exists security_events cascade;
drop table if exists custom_commands cascade;
drop table if exists ticket_panels cascade;
drop table if exists tickets cascade;
drop table if exists knowledge_base cascade;
drop table if exists welcome cascade;
drop table if exists role_menus cascade;
drop table if exists suggestions cascade;
drop table if exists giveaways cascade;
drop table if exists polls cascade;
drop table if exists stats_channels cascade;
drop table if exists auto_react cascade;
drop table if exists invite_joins cascade;
drop table if exists game_scores cascade;
drop table if exists guilds cascade;
