/**
 * Request-scoped stash for the Discord user OAuth grant.
 *
 * Better Auth encrypts `account.accessToken` before insert, so the only moment
 * the plaintext token is visible is `getUserInfo` during the OAuth callback.
 * We park it here for a few seconds and copy it onto the Better Auth `session`
 * row in `databaseHooks.session.create.before`. Listing guilds later reads that
 * session column — never `account` and never `discord_links`.
 */

type Grant = { discordId: string; accessToken: string; at: number };

const pending: Grant[] = [];
const TTL_MS = 60_000;

function prune(now = Date.now()): void {
  for (let i = pending.length - 1; i >= 0; i -= 1) {
    if (now - pending[i]!.at > TTL_MS) pending.splice(i, 1);
  }
}

/** Called from Discord `getUserInfo` with the freshly issued user token. */
export function stashDiscordGrant(discordId: string, accessToken: string): void {
  if (!discordId || !accessToken) return;
  prune();
  const at = Date.now();
  const idx = pending.findIndex((g) => g.discordId === discordId);
  const next = { discordId, accessToken, at };
  if (idx >= 0) pending[idx] = next;
  else pending.push(next);
}

/**
 * Consume the most recent grant. Session creation runs in the same request as
 * `getUserInfo`, so there is at most one live grant to pick up.
 */
export function takeLatestDiscordGrant(): { discordId: string; accessToken: string } | null {
  prune();
  const grant = pending.pop();
  return grant ? { discordId: grant.discordId, accessToken: grant.accessToken } : null;
}
