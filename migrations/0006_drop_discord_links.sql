-- Discord is now authenticated through Better Auth's direct Discord provider.
-- The access token and Discord id live on the Better Auth session row, so the
-- legacy second link table is no longer part of the dashboard flow.

drop table if exists discord_links cascade;