# Neon cloud database and agent setup

Setup completed on 4 October 2026. Instructions were fetched from the [requested Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md); applicable Postgres and branch skills were then installed and read. Existing driver, endpoints and journey DTOs were reused.

## Live database

| Resource | Value |
| --- | --- |
| Project | `home-heat-planner` / `crimson-voice-67209110` |
| Account plan | Free; no subscription upgrade performed |
| Region | AWS Sydney / `aws-ap-southeast-2` |
| PostgreSQL | 18 |
| Compute bounds | 0.25 CU minimum and maximum; provider's default suspend policy |
| App branch | `main` / `br-raspy-snow-a7opc9dx` |
| Database | `home_heat_planner` |
| Initial database role | `journey_owner` |
| Journey table | `public.heat_planner_journeys` |

[Open this project in the Neon Console](https://console.neon.tech/app/projects/crimson-voice-67209110).

The original generated project `nameless-dawn-40760372` was not changed. The app branch has no expiry. Its migration is `db/migrations/001_journeys.sql`; the `document` column remains PostgreSQL `json`, preserving the existing snapshot guards' property-order requirements.

Migration validation ran first on the isolated `migration-validation` branch (`br-quiet-morning-a758oixw`), with a 24-hour expiry at **5 October 2026, 04:10:52 UTC**. The hosted journey test successfully created, saved, restored and deleted its synthetic assessment/plan/check-in there. The validated migration was then applied to `main`. A read-only live check confirmed all six columns, the `json` document type, successful pooled queries and zero journey rows after setup. No synthetic journey was inserted into `main`.

## Every setup change

| Location | Change |
| --- | --- |
| User's npm global tools | Installed official `neon@8.0.6`; CLI authentication reuses the approved Neon OAuth session |
| `.agents/skills/neon/` | Installed the Neon overview skill and its six reference documents |
| `.agents/skills/neon-postgres/` | Installed the Postgres skill and four search reference documents |
| `.agents/skills/neon-postgres-branches/` | Installed the branch workflow skill |
| `skills-lock.json` | Added source paths and hashes for those three skills from `neondatabase/agent-skills` |
| `.codex/config.toml` | Added project-level Neon streamable HTTP MCP configuration with OAuth by default, pinned to `crimson-voice-67209110`; no embedded credential |
| `.neon` (ignored) | Linked this checkout to the new project and its `main` branch; metadata only |
| `.env.local` (ignored) | Added `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_BRANCH`; only the Postgres variable bundle was pulled |
| `.gitignore` | Added `.neon` to exclude local project/branch selection; existing environment-file ignore rules already exclude `.env.local` |
| `.env.example` | Added the empty `DATABASE_URL_UNPOOLED` example key |
| `scripts/migrate-journeys.ts` | Prefer the direct URL, retain support for an existing direct `DATABASE_URL`, reject pooled migrations, and report errors without connection details |
| `docs/contracts/journey-persistence.md` | Document direct migration connections and branch validation |
| This document and README | Record setup, verification, preservation and activation details |
| Neon cloud resources | Created the named Sydney project and temporary migration-validation branch; applied the existing migration to each |

Before installation, neither these skills nor Neon MCP configuration existed in the project or the checked user configuration. Existing user-level Codex settings were backed up outside Git under `~/.codex/task-backups/home-heat-planner-neon-20261004/`. Their bytes, along with `AGENTS.md`, `package.json` and `package-lock.json`, were verified unchanged after setup. No existing `.env` or `.env.local` was present to overwrite. No new API key, Neon Auth, Data API, object storage, Functions, AI Gateway, ORM or app dependency was introduced.

## Use the database and tooling

Restart the development server so it loads `.env.local`. Journey endpoints now use the live cloud database. The assessment frontend still uses its existing browser repository until the frontend team connects it to those endpoints; document imports remain temporary and separate.

```sh
npm run dev
node --env-file-if-exists=.env.local --experimental-strip-types scripts/migrate-journeys.ts
```

No Vercel configuration or deployment was modified. To enable the same backend in a deployed Vercel project, supply the pooled `DATABASE_URL` in that project's server environment and redeploy. Keep direct migration credentials server-only as well. Never publish either URL or use a `NEXT_PUBLIC_` variable. Endpoint usage and access-token requirements are in the [journey persistence contract](contracts/journey-persistence.md).

The MCP URL is `https://mcp.neon.tech/mcp?projectId=crimson-voice-67209110`. OAuth configuration is installed, but an authenticated MCP session was not created in this running agent. Open/reload Codex with this repository as its trusted workspace and complete Neon OAuth when prompted. Codex's user-level `mcp get` command does not discover this project layer in the current setup; the equivalent configuration override was parsed successfully as `streamable_http`. [Codex project MCP configuration](https://developers.openai.com/codex/mcp) describes project configuration and OAuth activation. The authenticated Neon CLI already works and is the skill's preferred tool.

For subsequent feature work, follow the installed skill's branch workflow. Preserve existing env values, use `--no-env-pull` before choosing a branch when necessary, and pull only the required service variables. Update installed skills for a new session with `neon skills update -y` after reviewing the intended update scope.
