# Home Heat Planner

All seven designed pages work as a manual journey: assessment → room/baseline review → contributors → options → saved plan → observational follow-up. Browser persistence retains answers, plan snapshots and check-ins without an account.

## Run and validate

Use Node 22.18+ and npm. Run `npm ci`, `npm run dev`, then open http://localhost:3000. Validation: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. `npm start` serves the production build. Webpack is selected for compatibility with the local environment.

| Route | Function |
| --- | --- |
| / | Landing and explanation |
| /assessment | Seven core interactions, optional details, explicit unknowns and question assistance |
| /room-baseline | Room review and measured/scenario cooling cost |
| /heat-contributors | Conditional explanations and reviewed evidence |
| /cooling-options | Investigations and optional standard-label AC comparison |
| /cooling-plan | Checklist, date, financial snapshot and calendar download |
| /follow-up | Five progress states, completion, barriers, spending, usage, comfort and history |

## Financial scope

Current cost uses cooling-specific measured kWh or an explicit average electrical-input scenario, multiplied by a supplied flat tariff. It never substitutes cooling capacity for electrical input or annualises a short measured period.

Method `zerl-comparable-ac-v1` supports **standard annual label comparisons** for equal-capacity, comparable non-ducted single-split ACs in the confirmed Average climate zone. It requires dated label references, installer sizing confirmation, permission, an installed quote, tariff and recurring costs. It does not predict the home's actual savings. See [method and applicability](docs/financial-method.md).

Shading, insulation and opening investigations have no numeric savings method here. Their unknown cost/savings/payback remain visible. No best-value installation is selected from incomplete evidence.

## Architecture and persistence

Transport DTOs exclude browser cursor, completion flag, saved history and storage keys. Runtime guards validate requests and responses. The working local and HTTP adapters share deterministic logic through `/api/planner`; room confirmation calls the adapter through `plannerClient`. Page projections reuse pure calculation models. The old placeholder service/duplicate contracts are removed. See [contracts, units and examples](docs/contracts/README.md).

Plan/check-in save contracts use actual structured snapshots and explicit save scope; current repositories save only in this browser. No server persistence or external notification service is claimed. Material value changes invalidate selection and archive saved estimates/check-ins. Re-entering the same values or editing unrelated goals preserves the saved snapshot. Baseline comfort is captured in the original plan.

Calendar downloads contain a generic all-day check-in and return link. Manage an imported event in your calendar; changing the app date does not update it. Clear assessment deletes this browser's saved history.

## Optional providers

Optional OpenAI endpoints emit server-only `[openai]` diagnostics with an allowlisted failure boundary, HTTP status, request ID, known error code/type and incomplete reason. Prompts, generated text, credentials, headers and raw error messages are never logged. `networkCode: EACCES` means the running process was denied an outbound connection; start it in an approved environment with HTTPS access to OpenAI. Provider authentication/model/schema errors are separate from this network failure. Same-origin checks compare the browser origin to the incoming Host, preserving local hostname aliases while rejecting cross-origin requests.

The manual journey needs no credentials. Server runtime reads `OPEN_AI_KEY` for optional complaint classification/allowed-question selection. Input is at most 500 characters, structured output is validated, `store:false`, output limit 200 tokens, timeout 10 seconds. No room fact or financial result is generated. Failures offer manual continuation and retry.

Local guards: three requests/client/minute, `AI_MAX_REQUESTS` (default 50, max 500), and a conservative USD 0.05/request reservation against `AI_MAX_SPEND_USD` (default 2, max 25). These reset on process restart and are **not actual billing measurement or a distributed spending guarantee**. A five-minute server cache uses hashed keys. Descriptions are retained in the same browser for room review, cleared by Clear assessment, and are not logged or saved on the application server.

On Vercel, assistance defaults off. Set `AI_DISTRIBUTED_LIMITS_CONFIRMED=true` only after external/account-wide hard limits and abuse controls exist; the flag does not implement those controls. Configure credentials through the hosting platform's environment UI; never upload local environment files. Provider success is not required for the demo.

Jev remains a dependency: no usable provider adapter/documented endpoint is configured in the repository. ElevenLabs voice and computer vision remain deferred. `ELEVEN_API_KEY` is not used.

## Deployment

Target: Vercel, Next.js preset, `npm run build`. No deployment was completed in this change. Automatic approval review blocked source export to that destination; the connected account lists no projects. Explicit deployment approval and project configuration remain necessary. Keep local environment files excluded. The deterministic/manual demo needs no provider credentials.

Requirements, build spec and seven visual references remain in `docs/`. Business models/calculations, feature UI, persistence, transport DTOs and server provider calls are separated under `src/`.

## Financial explanation assistance

Cooling options now includes a calculated brief and optional OpenAI gpt-6-luna call to prioritise explanations for understanding, budget or next-step focus. The server recomputes the comparison; the model returns allowed card IDs only. App-owned wording preserves figures, evidence limitations and next-input links. This does not create a shading/insulation savings method. The local brief remains usable without a provider. See docs/contracts/README.md for limits and transport.

## Online cooling guidance

On cooling options, **Find guidance for my room** performs an optional OpenAI Responses web search of Your Home, energy.gov.au and Energy Rating. It returns qualitative explanations and next checks for existing eligible improvements, with retrieved source links and a search timestamp. Only room categories reach the provider; addresses, free-text answers, bills and quotes are excluded. It uses the existing server `OPEN_AI_KEY`, requires no new package, and preserves unknown prices/savings/payback and the manual journey on failure. Search is bounded, cached for five minutes and subject to the hosted usage-control guard above. See [search contract and limits](docs/contracts/README.md#optional-cooling-guidance-search).

Guidance uses a [versioned UI contract](docs/contracts/cooling-research-ui.md): concise improvement cards with a takeaway, reported room context, possible benefit, next action, checks and sources. Word/character limits keep them compact. App-owned selection buttons connect each card to the existing comparison and plan flow.
