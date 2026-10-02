# Home Heat Planner

Technical foundation for the Greater Sydney bedroom cooling planner. All seven pages are explicit placeholders. Assessment, recommendations, action selection and follow-up are not implemented yet. The approved requirements and images in `docs/` remain unchanged.

## Development

Use Node.js 22.18 or newer (required for the dependency-free TypeScript test runner) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production commands are `npm run build` and `npm start`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Next.js 16.3.8, React 19.3.0 and Tailwind CSS 4.3.3 were confirmed against npm's stable releases during initialization. TypeScript 6.0.3 is used because the Next.js ESLint tooling rejects TypeScript 7. ESLint 9 is retained for the bundled React plugin's peer compatibility. See the [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation) when upgrading these together. Dependency versions are recorded in `package-lock.json`.

No environment variables or credentials are needed. No `.env.example` is included.

Development and production builds use Next.js's supported Webpack mode. Turbopack's CSS worker could not bind a local port in this execution environment, including on an escalated retry.

## Routes

| URL | Placeholder |
| --- | --- |
| `/` | Landing |
| `/assessment` | Guided assessment |
| `/room-baseline` | Confirmed profile and cooling baseline |
| `/heat-contributors` | Contributors and evidence |
| `/cooling-options` | Options comparison |
| `/cooling-plan` | Selected action and check-in |
| `/follow-up` | Progress and observational review |

Preview navigation connects all seven routes. Navigating does not collect inputs, confirm facts or save a plan.

## Project structure

```text
src/
  app/                       App Router pages, root layout and global design tokens
    assessment/
    room-baseline/
    heat-contributors/
    cooling-options/
    cooling-plan/
    follow-up/
  components/
    layout/                  Shared shell and screen placeholder
    ui/                      Lightweight reusable link control
  features/journey/          Route definitions and empty typed journey state
  domain/                    Product types, provenance and explicit unknowns
  contracts/                 Request/response DTOs and PlannerService interface
  services/                  Replaceable service selection
    mocks/                   Contract-conforming, explicitly unavailable stub
  lib/
    calculations/            Deterministic flat cooling cost and simple payback
    persistence/             Lazy, validated browser-storage abstraction
tests/                       PRD arithmetic fixtures and storage-failure tests
```

Root configuration: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`. Next.js generates the ignored `next-env.d.ts` and `.next/` build artifacts.

## Boundaries and contracts

Future UI code calls `plannerService` from `src/services/planner.ts`. Replace the selected mock with a real adapter implementing `PlannerService`; pages should not import mocks or call provider services directly. There are no API endpoints yet. The stub returns `not-implemented`, never fabricated successes or data.

The interface covers assessment, clarification, profile confirmation, recommendations, financial comparison, plan saving and follow-up recording. DTOs are separate from storage. These are initial shared types, not a completed backend contract specification or runtime API validation system; endpoint paths and full backend validation remain future work.

`Fact<T>` represents known data with provenance or explicit unknown data with a reason. Numeric zero and false remain valid values. Types retain AUD currency, units in field names, comparison periods, ranges, method versions, sources, assumptions, eligibility and observational follow-up status. Provenance dates are ISO date/date-time strings; check-in and completion dates are intended as local `YYYY-MM-DD` dates. Budget ranges use inclusive minimum/maximum AUD values.

`createEmptyJourney` contains no room facts, financial defaults, options or selected action. `createBrowserPersistence<T>` centralizes localStorage access with injected runtime validation, load/save/delete operations and explicit errors for unavailable, corrupt or blocked storage. It does not access storage during import. The future journey implementation must supply a complete state validator including schema-version checks before wiring persistence to forms. No application state is persisted by the placeholders.

## Calculation scope

`calculateCoolingCost` implements the PRD's measured-kWh and explicit average-electrical-input scenario equations using a flat tariff. It checks inputs, provenance, period and bedroom attribution, preserves zero and exposes unsupported inputs as insufficient evidence. Electrical-input scenarios remain what-if results. It never substitutes cooling capacity for electrical input or annualises a shorter period.

`calculateSimplePayback` divides a known positive upfront cost by supplied, supported, positive annual net savings. Missing inputs, nonannual periods, what-if savings, zero upfront cost and nonpositive savings return an explanation without a payback figure. It does not derive an intervention's savings, annual schedule or recurring costs. Range calculations, applicability checks, service-life comparisons and action-specific savings methods remain future work.

Tests use only labelled PRD verification fixtures. These values are not imported by the UI or mocks. No reviewed intervention method or evidence catalogue has been established, so this foundation makes no savings or performance claims.

## Design foundation and unresolved reference issues

Global Tailwind tokens provide warm cream, forest/eucalyptus green, restrained amber and blue-grey, system sans-serif typography, subtle borders, modest control/panel radii and an optional subtle shadow. The placeholders stop before implementing the approved visual screens or architectural illustrations.

The cooling-plan image shows `6 of 5` progress and asserts reduced roof heat from window shading. The PRD requires a coherent journey and source-backed conditional explanations. Reference financial figures have no supplied provenance. These details have been flagged without changing the sources or reproducing unsupported claims in the UI. The PRD's suggested seven-day check-in and the image's selected fourteen-day choice are compatible once users can choose a date.
