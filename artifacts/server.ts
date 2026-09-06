/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * Pre-wired for live preview + deploy — do not rewrite this file. To enable
 * local email/password, flip the flag in `./email-password` only (see auth skill).
 *
 * The app runs its own Better Auth at `/api/auth/*`, so the session cookie stays
 * on this app's own origin. Sign-in federates to the shared **Grok auth broker**
 * (`GROK_AUTH_ISSUER`) via the `genericOAuth` plugin — the broker brokers the
 * upstream sign-in methods (Google, X, …) and holds their shared secrets; this
 * app only holds its own client id/secret and names the upstream it wants via
 * each provider's `idp` hint.
 *
 * Direct Discord OAuth is always registered here (providerId `"discord"`).
 * Credentials are read lazily per request so Cloudflare Workers bindings are
 * visible; an empty clientId at import time is what caused
 * `PROVIDER_CONFIG_NOT_FOUND discord`.
 *
 * Tri-mode:
 *   - Deployed: the deployer injects a per-app `GROK_AUTH_*` + `BETTER_AUTH_URL`
 *     + `DATABASE_URL`, so real federated auth is persisted in Postgres.
 *   - Sandbox live preview: no injection -> falls back to the shared **preview
 *     client** (`./preview`) and derives the preview's `https://*.grok-sandbox.com`
 *     origin from the request, so real sign-in works (no demo users). Sessions
 *     and identities persist in the embedded PGLite DB (same DB as app data);
 *     the process restart wipes both. Live-preview iframe clients use a bearer
 *     token (partitioned cookies) — see `client.ts`.
 *   - Off (`VITE_AUTH_ENABLED=false`, the shipped default): no providers;
 *     `requireUserId` resolves a dev user with no database configured, and
 *     throws fail-closed once `DATABASE_URL` is set (see `verify.server.ts`).
 *
 * Cloudflare Workers: bindings are attached per-request (`env` on fetch, also
 * mirrored onto `globalThis.__env__` by Nitro). They are NOT available during
 * module evaluation, so every `env()` read used to build Better Auth happens
 * inside `createAuth()` / getters, which run on the first real request — never
 * at import time. Caching a Discord clientId of `undefined` for the life of
 * the isolate is what produced `PROVIDER_CONFIG_NOT_FOUND discord`.
 *
 * NEVER import this from client code — it pulls in `pg` + the preview secret +
 * server-only Better Auth internals. The client uses `@/lib/auth/client`;
 * components read the user via `@/lib/auth/use-current-user`; server functions get
 * a verified id via `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { bearer, genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { GROK_PROVIDERS } from "./providers";
import { pgliteDialect } from "./pglite-dialect";
import {
  GROK_ISSUER_DEFAULT,
  PREVIEW_ALLOWED_HOSTS,
  PREVIEW_CLIENT_ID,
  PREVIEW_CLIENT_SECRET,
} from "./preview";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
// On Cloudflare Workers this is a no-op until DATABASE_URL is readable (see db.ts).
void ensureDbReady();

/**
 * Preview secret must outlive module reloads: PGLite (and its session rows) is
 * stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev. Process
 * restart clears both the secret and PGLite together.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
  __vexonAuth__?: AuthInstance;
  __vexonAuthPool__?: Pool;
};

function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

type CfEnv = Record<string, unknown>;

/** Nitro's Cloudflare runtime assigns the per-request binding object here. */
function cfEnv(): CfEnv | undefined {
  return (globalThis as typeof globalThis & { __env__?: CfEnv }).__env__;
}

/**
 * Read an env var, treating empty/whitespace as unset.
 *
 * On Cloudflare Workers this MUST run inside a request (or a getter invoked
 * from one). Module-level reads see an empty `process.env` and would freeze
 * `undefined` for the isolate lifetime.
 */
function env(key: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? process.env[key] : undefined;
  const fromCf = cfEnv()?.[key];
  const value =
    (typeof fromProcess === "string" ? fromProcess : undefined) ??
    (typeof fromCf === "string" ? fromCf : undefined);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function grokIssuer(): string {
  return env("GROK_AUTH_ISSUER") ?? GROK_ISSUER_DEFAULT;
}

function grokClientId(): string {
  return env("GROK_AUTH_CLIENT_ID") ?? PREVIEW_CLIENT_ID;
}

function grokClientSecret(): string {
  return env("GROK_AUTH_CLIENT_SECRET") ?? PREVIEW_CLIENT_SECRET;
}

function discordClientId(): string | undefined {
  return env("DISCORD_CLIENT_ID");
}

function discordClientSecret(): string | undefined {
  return env("DISCORD_CLIENT_SECRET");
}

function isAuthDisabled(): boolean {
  return env("VITE_AUTH_ENABLED") === "false";
}

/** True when federated sign-in is active (real auth is enforced). Live on Workers. */
export function isAuthConfigured(): boolean {
  return !isAuthDisabled() && Boolean(grokClientId() && grokClientSecret());
}

/**
 * @deprecated Use `isAuthConfigured()` — a boolean snapshot is wrong on
 * Cloudflare Workers because env is bound per-request. Kept as a function
 * alias so `if (!isAuthConfigured())` is the only supported check.
 */
export const authConfigured = isAuthConfigured;

function grokIssuerBase(): string {
  return grokIssuer().replace(/\/+$/, "");
}

const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

function discordProviderConfig() {
  return {
    providerId: "discord",
    // Getters: Better Auth reads these at sign-in / callback time, not at
    // plugin construction. That is the CF Workers-safe path even if this
    // object is created before bindings exist.
    get clientId() {
      return discordClientId() ?? "";
    },
    get clientSecret() {
      return discordClientSecret() ?? "";
    },
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scopes: ["identify", "email"],
    authorizationUrlParams: { prompt: "consent" },
    redirectURI:
      "https://vexon-bot.vexon-bot.workers.dev/api/auth/oauth2/callback/discord",
    mapProfileToUser: (profile: Record<string, unknown>) => {
      const id = String(profile.id ?? "");
      const avatar = profile.avatar as string | null;
      const ext = avatar?.startsWith("a_") ? "gif" : "png";
      return {
        id,
        name:
          (profile.global_name as string) ||
          (profile.username as string) ||
          id,
        email: (profile.email as string) ?? undefined,
        emailVerified: Boolean(profile.verified),
        image: avatar
          ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}`
          : undefined,
      };
    },
  };
}

function grokProviderConfig(providerId: string, idp: string) {
  return {
    providerId,
    get clientId() {
      return grokClientId();
    },
    get clientSecret() {
      return grokClientSecret();
    },
    get authorizationUrl() {
      return `${grokIssuerBase()}/api/auth/oauth2/authorize`;
    },
    get tokenUrl() {
      return `${grokIssuerBase()}/api/auth/oauth2/token`;
    },
    get userInfoUrl() {
      return `${grokIssuerBase()}/api/auth/oauth2/userinfo`;
    },
    scopes: ["openid", "profile", "email"],
    authorizationUrlParams: { idp, prompt: "login" },
  };
}

function resolveBaseURL():
  | string
  | {
      allowedHosts: string[];
      protocol: "auto";
      fallback: string;
    } {
  const explicitBaseURL = env("BETTER_AUTH_URL");
  if (explicitBaseURL) return explicitBaseURL;
  return {
    allowedHosts: [
      ...previewAllowedHosts,
      "localhost",
      "127.0.0.1",
      "[::1]",
      "*.workers.dev",
    ],
    protocol: "auto" as const,
    fallback: "http://localhost:8080",
  };
}

function resolveTrustedOrigins(): string[] {
  const explicitBaseURL = env("BETTER_AUTH_URL");
  if (explicitBaseURL) return [explicitBaseURL, ...LOCAL_DEV_ORIGINS];
  return [
    ...previewAllowedHosts,
    ...previewAllowedHosts.flatMap((host) => [
      `https://${host}`,
      `http://${host}`,
    ]),
    "*.workers.dev",
    "https://*.workers.dev",
    ...LOCAL_DEV_ORIGINS,
  ];
}

function resolveDatabase():
  | Pool
  | { dialect: ReturnType<typeof pgliteDialect>; type: "postgres" } {
  const databaseUrl = env("DATABASE_URL");
  if (!databaseUrl) {
    return {
      dialect: pgliteDialect(() => getPglite()),
      type: "postgres" as const,
    };
  }
  globalAuthRef.__vexonAuthPool__ ??= new Pool({
    connectionString: databaseUrl,
  });
  return globalAuthRef.__vexonAuthPool__;
}

/** Session token cookie name — also read by the live-preview popup completion page. */
export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

function createAuth() {
  // All env() reads below run on the first real request, after Cloudflare has
  // bound vars/secrets onto this isolate.
  const oauthPlugin = isAuthDisabled()
    ? null
    : genericOAuth({
        config: [
          ...GROK_PROVIDERS.map(({ providerId, idp }) =>
            grokProviderConfig(providerId, idp),
          ),
          // Always register Discord. Gating on a module-level
          // `discordConfigured` is what dropped the provider on Workers and
          // produced PROVIDER_CONFIG_NOT_FOUND. Credentials are read via
          // getters at sign-in / callback time.
          discordProviderConfig(),
        ],
      });

  return betterAuth({
    baseURL: resolveBaseURL(),
    secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
    database: resolveDatabase(),
    trustedOrigins: resolveTrustedOrigins(),

    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: [
          ...GROK_PROVIDERS.map((p) => p.providerId),
          "discord",
          GATE_PROVIDER_ID,
        ],
        requireLocalEmailVerified: false,
      },
    },

    session: { cookieCache: { enabled: true, maxAge: 300 } },

    ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

    advanced: {
      useSecureCookies: false,
      defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
      cookies: {
        session_token: { name: SESSION_TOKEN_COOKIE },
        session_data: { name: "__Host-grok-auth.session_data" },
        account_data: { name: "__Host-grok-auth.account_data" },
        dont_remember: { name: "__Host-grok-auth.dont_remember" },
      },
    },

    plugins: [
      gateIdentitySessions(),
      ...(oauthPlugin ? [oauthPlugin] : []),
      bearer(),
      tanstackStartCookies(),
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

function getAuth(): AuthInstance {
  globalAuthRef.__vexonAuth__ ??= createAuth();
  return globalAuthRef.__vexonAuth__;
}

/**
 * Lazy Better Auth instance. Construction is deferred until the first property
 * access (a request handler / `auth.api.*` call), which on Cloudflare Workers
 * is after bindings have been attached.
 */
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

// Re-exported for convenience; the array lives in the dependency-free
// `providers.ts` so the client can import it too.
export { GROK_PROVIDERS } from "./providers";
