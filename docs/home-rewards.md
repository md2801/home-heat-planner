# Home Rewards

On 4 October 2026 the homeowner requested coins for recommended tasks, automated photo assessment, and demo coupons with real retailer links. Their colleague built the initial marketplace; the homeowner then requested persistent earning, visible approvals and improvements to that marketplace. This extension integrates those requests without changing the financial or thermal evidence rules.

## Design plan

Give a homeowner one useful next action and a visible record of following through. Preserve Arial typography, cream `#faf7f1`, surface `#fffdfa`, forest `#24584a`, eucalyptus `#eaf0e9`, cooling blue `#597d8a` and a restrained yellow `#ffb13b` coin accent. Keep the colleague's latest marketplace hero, visual product cards, search, category filters and sorting. Connect its balance to the private wallet. Add a left-aligned task list, architectural house drawing and an Approvals section. No leaderboards, streaks or purchase requirements. Links from the plan, account and Rewards navigation make earning and approval results discoverable.

## How earning works

1. Save the room assessment to a private account. Task eligibility reuses the existing recommendation rules; unknown room facts stay unknown.
2. Complete a suitable task and submit the required photos with consent. Some habits cannot be established from photos and do not have a coin task.
3. Automated assessment checks only the visible criteria in the task's photo guide. A checking result is pending; unclear evidence needs better photos. Provider failures earn nothing.
4. Approval appends one ledger entry and adds the task's deterministic coin amount. Each task earns once per account. Checkboxes, assessment resets and refreshes cannot award coins.
5. Approvals shows pending, approved and retry-needed submissions with their reason and award. Coin history records awards and demo coupon deductions. Wallets/results persist across devices; they never use guest storage or device caches.

Approval cannot establish photo authenticity, ownership, continuing habits, professional installation quality or causal savings/temperature changes. These prototype coins have no cash value or AUD conversion. Exact normalised-image reuse is checked within an account; this is a basic replay control, not fraud-proof verification.

## Privacy and limits

Photos are resized/re-encoded to strip metadata, processed in memory, sent to OpenAI with `store:false`, and not stored by the app. The database keeps normalised-image hashes, task/result metadata and timestamps. Provider retention follows [OpenAI's data controls](https://developers.openai.com/api/docs/guides/your-data). Users consent before submitting and should exclude people, addresses and identifying details.

Only still JPEG/PNG/WebP inputs are accepted. Browser photos are capped at 12 MB before resizing; server files are capped at 1.5 MB each and 24 million input pixels. Requests are streamed with a 3.1 MB limit. Two concurrent assessments per process and 12 submissions per account in a rolling day are allowed. A checking attempt expires after two minutes. Recent unsuccessful attempts are capped at 30 in the view; all approved task records are included.

## Marketplace

The colleague's service port is preserved through `connectedMarketplaceService`. Its balance and activity map to the authoritative account wallet. The old in-memory preview service is used only by its isolated unit tests and is no longer the page default.

The catalogue has four actual product links: a thermometer/hygrometer, removable draught stopper, pedestal fan and block-out curtains. Coin costs are prototype rules, not product prices. Links were checked on 4 October 2026; current specifications, prices, stock and purchases belong to the retailer.

Each account can generate one `HHP-DEMO-…` coupon per catalogue reward. Confirmation explicitly says that spending saved coins creates a **demo code which the retailer does not accept**. No real discount, order, partnership or fulfilment is implied. A receipt retains the code and retailer link. Retrying the same redemption returns the existing coupon without a second deduction.

- [Holman Thermometer and Hygrometer — Bunnings](https://www.bunnings.com.au/holman-thermometer-and-hygrometer_p3130792)
- [Sperling 78cm Double Sided Draught Stopper — Bunnings](https://www.bunnings.com.au/sperling-78cm-double-sided-draught-stopper_p0010722)
- [40cm Pedestal Fan — Kmart](https://www.kmart.com.au/product/40cm-pedestal-fan-white-43711369/)
- [MAJGULL block-out curtains — IKEA](https://www.ikea.com/au/en/p/majgull-block-out-curtains-1-pair-grey-with-heading-tape-10417814/)

## Setup and API

Use the existing private account database and Neon Auth configuration. Apply `db/migrations/003_home_rewards.sql` to an isolated branch first, then run `npm run migrate:rewards` against the intended database. The script needs a direct `DATABASE_URL_UNPOOLED` (or a direct `DATABASE_URL`). It sends separate prepared statements in one transaction and logs no credentials. It is safe to re-run.

Live photo assessment needs server-only `OPEN_AI_KEY` (also accepts `OPENAI_API_KEY` for this endpoint). Restart the server after editing `.env.local`. No key means assessment is unavailable; it never falls back to invented approvals. The assessor uses Responses API image inputs, `gpt-6-luna`, strict structured output and an allowlisted decision/reason. The model cannot set coins or change a balance. See the [official image guide](https://developers.openai.com/api/docs/guides/images-vision). On Vercel, the existing `AI_DISTRIBUTED_LIMITS_CONFIRMED=true` hosting guard applies; configure distributed limits before enabling paid provider traffic there.

`GET /api/rewards` returns `RewardsSnapshot` from `src/contracts/rewards.ts`: available `balance`, lifetime `earned`, `completed`, eligible `tasks`, `attempts`, `entries`, `coupons` and `assessmentAvailable`. Send `X-Account-User` with the current account ID. The server independently validates the session, rejects an account mismatch and serves `private, no-store`. The client clears data and discards late responses when the account changes.

`POST /api/rewards/proof` accepts multipart `taskId`, `notes` (up to 500 characters), `consent=yes`, `photo1`, and `photo2` when required. The server loads eligibility from the saved account journey and chooses the coin amount. Successful HTTP responses may contain a needs-evidence/unavailable result: inspect the attempt status before showing an award.

`POST /api/rewards` accepts only `{ "action": "redeem", "rewardId": "thermometer", "demoConsent": true }`. It validates the catalogue cost on the server. The SQL functions lock the same wallet row, append a ledger entry and update the balance atomically. Concurrent claims/redemptions cannot double-award or overspend; retries are idempotent. 409 indicates duplicate proof/task, stale eligibility or insufficient coins; 429 indicates submission/concurrency limits; 503 indicates unavailable service/storage.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:rewards-ui`.

Unit/integration tests use real PostgreSQL functions through PGlite for ownership, idempotency, ledger equality, concurrent redemptions, retry/expiry and request/schema/image bounds. Browser tests use `.env.auth-test.local` for an isolated database/Auth branch and a **test-only Node fetch preload** to intercept the exact rewards assessment request. They exercise synthetic pending/rejection/approval, balance updates, refresh, coupons, cross-device retrieval and another account's isolation. Synthetic approvals verify the workflow, not real-photo assessment accuracy. No test mock or approval bypass is imported by production code.
