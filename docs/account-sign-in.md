# Account sign-in and private journey storage

The 4 October 2026 request adds Google SSO and email/password accounts. Each homeowner owns one current bedroom journey, including room answers, selected techniques/investigation, a plan, check-ins and the existing archived plan history. This supersedes the earlier prototype's account exclusion. Anonymous assessment remains available.

## Experience and design

`/sign-in` uses the approved app palette: cream `#faf7f1`, surface `#fffdfa`, forest `#24584a`, eucalyptus `#eaf0e9`, cooling blue `#597d8a`, and sun yellow `#ffb13b`. It inherits Arial and the shared navigation. The architectural house drawing is native SVG, illustrative rather than a reported home. Desktop has a quiet home-and-plan introduction beside the form; mobile puts the form in one column. Form controls retain visible focus, password-manager autocomplete, password visibility, pending states and bounded error copy. No new font, image service or UI component library is used.

Google and email/password lead to `/account`. `/sign-up` also opens the account form. Forgotten-password requests and `/reset-password` are included. Google cancellation returns to the sign-in error state. Account creation is handled by the provider; the app never receives a stored plaintext password or implements password hashing itself.

An account can import an existing guest browser assessment **only by clicking the import button**, and only while its current journey has no room answers. An existing account journey takes precedence. Guest work remains in its original browser key. An imported plan retains all original evidence, unknowns and reported observations.

## Identity and configuration

Use [Neon managed Better Auth](https://neon.com/docs/auth/overview), through `@neondatabase/auth` (installed 0.5.0-beta). The same-origin Next.js proxy is `/api/auth/[...path]`. Session cookies are handled by the SDK. `src/lib/auth/server.ts` creates the server lazily, so missing deployment configuration does not break the production build; requests fail with an explicit unavailable response. No passwords or auth tokens are stored in browser localStorage.

Server-only environment variables:

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

`NEON_AUTH_COOKIE_SECRET` must be a high-entropy value of at least 32 characters. Local setup generated 32 random bytes, stored as base64 in ignored `.env.local`, and preserved every existing setting. Do not commit that file. No `NEXT_PUBLIC_` secret is required.

Live setup uses the existing Sydney project `crimson-voice-67209110`, branch `main`, database `home_heat_planner`. Managed Auth is enabled, email/password registration is enabled, and the shared development Google provider is available. Localhost redirects are allowed. Email verification is currently off in the provider's default prototype configuration. Changing that setting requires adding the corresponding OTP verification flow before enforcing it in the app.

For deployment, set the four environment variables on the app host, add the application's actual domain to Neon Auth trusted domains, and configure your own Google OAuth application for production. The shared Google credentials are for development. Configure production SMTP in Neon for branded recovery mail. See [Google OAuth setup](https://neon.com/docs/auth/guides/setup-oauth) and [Neon Auth production checklist](https://neon.com/docs/auth/production-checklist). Account UI and reset-token handling are tested; live recovery email delivery and a completed Google login require the owner/provider setup and were not simulated as successful identity verification.

## Fresh checkout and 503 troubleshooting

Git ignores `.env.local`, so pulling the sign-in code does not transfer the server configuration. Both Google and email/password use `/api/auth/[...path]`. Missing `NEON_AUTH_BASE_URL`, missing `NEON_AUTH_COOKIE_SECRET`, a secret shorter than 32 characters, or an invalid Auth URL prevents either flow from starting. This is separate from an incorrect email or password.

Stop the development server, then run from the repository root:

```sh
npm ci
npm run setup:auth
npm run check:auth
npm run dev
```

The setup command uses the public development Auth URL in `.env.example` and generates a fresh 32-byte random cookie secret. It creates `.env.local` if missing, fills only missing/blank auth settings, and preserves existing database/provider values, custom Auth URLs, comments and valid secrets. It does not rotate an existing secret, overwrite invalid settings, configure hosting, enable remote Auth, or migrate a database. No secret value is printed. For your own Neon branch, set its Auth URL before running setup.

The Auth endpoint URL is a public service address, **not a credential**; it is safe in `.env.example`. The cookie secret, database connections and provider keys stay in the ignored local file or hosting secrets. Each independent local installation can generate its own cookie secret. Instances of the same hosted app should share a stable configured secret.

`check:auth` loads `.env.local`, respects exported environment overrides, checks the URL/secret and makes a read-only anonymous provider session request with a ten-second timeout. It creates no account and prints no session or credentials. It also identifies a missing `DATABASE_URL`, which is needed for private account saving even though sign-in itself can work without it. Obtain the matching database connection through the team's secure configuration channel.

| Symptom | Check and next step |
| --- | --- |
| Both sign-in methods return 503 with `AUTH_NOT_CONFIGURED` | Run local setup and restart; on a hosted app, set the auth URL and cookie secret in host environment variables and redeploy. |
| Setup reports an existing invalid URL or short secret | Correct the Auth URL, or remove the invalid secret assignment and rerun setup to generate one. Existing settings are preserved on failure. |
| 503 with `AUTH_UNAVAILABLE` after configuration is valid | Run `check:auth`; check network access and the Neon Auth branch. Server logs contain a bounded `request` diagnostic, without exception text or credentials. |
| Provider rejects a redirect/origin | Use `http://localhost:<port>` locally; configure the actual hosted domain in Neon Auth's trusted domains. |
| Sign-in works but `/api/account/journey` returns 503 | Configure the matching database connection and apply migration 002 with a direct connection. |
| Login returns 401 | Check email/password, or create an account first; this is an authentication failure rather than missing server setup. |

The auth proxy returns a stable error code, an explicit local setup message during development, and bounded owner-facing copy in production. Configuration diagnostics contain only variable names and validation requirements. Network/provider exception text, passwords, cookies and connection strings are never logged by this boundary.

The fresh-checkout fix was verified with a real CLI run in a temporary directory, preserving configuration on repeated setup, invalid-setting checks, both auth proxy routes, and browser coverage for both buttons. On 4 October 2026, 277 unit tests passed (one optional skip), all four auth browser tests passed, and TypeScript, lint and the production build passed. The configured app's read-only provider check also succeeded. No local secret was committed or transferred to another developer.

## Storage and authorization

`db/migrations/002_account_journeys.sql` adds `heat_planner_account_journeys`, with a text `user_id` primary key, complete journey `draft` as PostgreSQL `json`, integer `revision`, and `updated_at`. The `json` type preserves the existing financial/evidence snapshot property order. Identity is supplied by Neon Auth, so this table does not duplicate user or password records.

```sh
node --env-file=.env.local --experimental-strip-types scripts/migrate-accounts.ts
```

The script prefers the direct migration URL and rejects pooled migration connections. Existing anonymous journey tables and token endpoints remain available; account saving does not grant access to those records.

| Operation | Request | Result |
| --- | --- | --- |
| `GET /api/account/journey` | Verified session cookie; `X-Account-User` must match that session | `{draft,revision}`; a new account returns `{draft:null,revision:0}` |
| `PUT /api/account/journey` | Same session/identity check; JSON `{draft,revision}` | `{saved:true,revision}` |

The owner always comes from the server-verified session, never a URL, body or client-selected ID. `X-Account-User` prevents a tab with the old user's in-memory draft from writing it into a newly signed-in account after another tab changes the cookie. It is an identity consistency check, not a credential. Every SQL operation filters by the verified user ID. Unknown fields, malformed journey values and invalid revisions are rejected. Responses are private/no-store. Cross-origin and cross-site requests are blocked; PUT requires JSON and has a 512,000-byte streaming limit. Provider diagnostics and journey data are not logged by the account endpoints.

Writes are serialized in the browser and use atomic database revision checks. A stale write returns 409 and pauses autosaving until the user chooses between the account and device versions. A failure keeps edits locally and exposes a retry; an expired session asks the user to sign in again. No API failure is shown as a successful cloud save.

Signed-in browser caches use a separate key per user and retain the revision plus an unsaved flag. Reloading after an offline edit therefore preserves it; a newer cloud version does not silently discard it. Sign-out switches the complete repository back to the guest namespace without archiving or copying the private plan into guest state. Browser caches are not encryption against someone with access to the browser/OS. Resetting a signed-in questionnaire saves an empty journey for that account, leaving other users' records untouched.

## Changes to remote and local setup

- Enabled managed Auth on the existing `main` branch and allowed localhost authentication redirects. Existing Google and email/password defaults were inspected rather than replaced.
- Added the two local authentication values to ignored `.env.local`, preserving database and provider values.
- Created the isolated `auth-validation` branch (`br-calm-leaf-a7fnisuq`), expiring 5 October 2026 at 05:00 UTC, after enabling Auth so it has separate auth/data state. Synthetic accounts used for testing exist only there.
- Stored isolated branch test values in ignored `.env.auth-test.local`; existing environment files were preserved.
- Applied migration 002 on the isolated branch before the app branch.
- Added the Neon Auth SDK, account/session UI, account persistence HTTP/service boundary, browser synchronization, and tests. Existing calculations and journey contracts were preserved.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:auth-ui
```

Auth browser tests require an **isolated branch's** ignored `.env.auth-test.local` containing the four environment variables above. The config explicitly loads that file before starting Next on port 3101. It defaults to installed Chrome; set `PLAYWRIGHT_CHANNEL` for another supported browser. Never point this file at the app database: the test creates synthetic accounts.

PostgreSQL tests cover private read/write isolation, exact full-journey round trips, stale revisions, reset scope, account switching, direct unauthenticated access, origin checks, body limits, malformed data and safe failure responses. Browser synchronization tests cover namespace switching, offline reload/retry, conflicts and late responses after stopping an account. Hosted browser tests cover registration, login/logout, explicit guest import, reload, second-device plan restoration and checklist saving, a second account's empty data, password visibility, login errors, recovery UI, mobile layout and Google flow initiation.

Screenshots are saved under `artifacts/verification/sign-in-desktop.png`, `sign-in-mobile.png`, and `account-saved.png`.

Final validation on 4 October 2026: 267 unit tests passed, one optional test skipped, all three browser tests passed, and lint, TypeScript and the production build passed. The app branch's read-only storage check found zero saved account journeys; synthetic account and journey data remained on the isolated test branch.
