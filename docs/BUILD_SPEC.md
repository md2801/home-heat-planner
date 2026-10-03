# Home Heat Planner — Hackathon Build Specification

## 1. Purpose

This document defines how the hackathon prototype of Home Heat Planner will be built.

For product behaviour, requirements, calculations, evidence rules and acceptance criteria, the source of truth is:

`docs/PRD.md`

For visual implementation, the source of truth is:

`docs/design/`

This document does not replace the PRD. It converts the PRD into a practical implementation plan for the hackathon.

---

## 2. What We Are Building

Home Heat Planner is a responsive web application for the Junction Climate Hack-tion 2026, under the Resilient Cities and Buildings track.

The initial prototype is designed for a homeowner in Greater Sydney who has a bedroom that becomes uncomfortably hot.

The application helps the user answer:

> Before I spend money on cooling, which change is worth paying for, and what could it save me?

The application guides the user through:

1. describing the overheating problem;
2. providing relevant room and cooling information;
3. confirming their room profile and current cooling-cost baseline;
4. understanding plausible contributors to overheating;
5. comparing suitable improvement options;
6. choosing an action;
7. creating and saving a cooling plan;
8. returning later to record progress, actual cost, cooling use and comfort.

This is a decision-support prototype, not a building simulation tool.

---

## 3. Hackathon Priorities

Implementation priority is:

1. Complete core user journey
2. High-quality implementation of the seven approved screens
3. Correct state and calculations
4. Clear frontend/backend integration boundary
5. Reliable demo
6. Responsive behaviour
7. AI-assisted adaptive assessment
8. Optional enhancements such as computer vision

The core journey must remain functional even if optional AI or computer-vision functionality is unavailable.

Do not sacrifice the core experience to implement stretch features.

---

## 4. Technology Stack

### Application

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS

Use the current stable versions available when the application is initialized unless a compatibility issue requires otherwise.

Prefer the Next.js App Router.

### Deployment

Target deployment:

- Vercel

The application must successfully build using the production build command before deployment.

### Authentication

No user account system is required for the hackathon prototype.

Do not implement authentication unless the project requirements change.

### Database

A production database is not required for the initial prototype.

Use browser persistence for prototype user state where appropriate.

The architecture must not make local browser storage part of the API contract.

---

## 5. Application Architecture

Keep the prototype as one coherent Next.js application.

Conceptual architecture:

Browser UI
→ frontend application state
→ typed service/API boundary
→ server-side application logic
→ external AI/provider services when required

Business calculations must be separated from presentation components.

External provider API keys must never be exposed to browser code.

---

## 6. Approved Product Screens

The seven approved visual references are:

1. `docs/design/screen-01-landing.png`
2. `docs/design/screen-02-assessment.png`
3. `docs/design/screen-03-room-baseline.png`
4. `docs/design/screen-04-heat-contributors.png`
5. `docs/design/screen-05-cooling-options.png`
6. `docs/design/screen-06-cooling-plan.png`
7. `docs/design/screen-07-follow-up.png`

These images are the visual source of truth.

The implementation should closely reproduce their:

- visual hierarchy
- layout
- spacing
- typography
- colour system
- controls
- architectural room illustration
- information density
- interaction hierarchy

Do not independently redesign the screens.

Shared visual elements should be implemented as reusable components rather than copied independently between screens.

The application must also remain usable on smaller laptop and mobile displays. Responsive layouts may adapt the composition while preserving the same hierarchy and product meaning.

---

## 7. Core User Flow

The application should support the following flow:

Landing
→ Guided Assessment
→ Confirmed Room Profile / Cooling Baseline
→ Heat Contributors
→ Cooling Options Comparison
→ Cooling Plan
→ Follow-up / Review

Users must be able to move through the complete demo journey without manually editing application data.

Relevant values should remain editable where required by the PRD.

Changing a meaningful input should trigger reassessment or recalculation where appropriate.

---

## 8. Assessment

The assessment collects relevant information including:

- suburb or postcode
- heat timing
- user goal
- room position
- roof exposure
- window orientation when known
- external shading
- internal coverings
- insulation knowledge
- ventilation/opening constraints
- existing cooling equipment
- cooling usage
- electricity tariff
- budget
- permission or practical constraints

The interface should ask targeted questions rather than expose one large form.

Unknown values must remain explicitly unknown.

Never infer a value merely because it would make the demo easier.

The assessment may use adaptive clarification, but the user must remain able to complete the core flow if the adaptive service fails.

---

## 9. Application State

Maintain a typed application state representing the user's current journey.

At minimum it should support:

- assessment answers
- clarification answers
- confirmed room profile
- unknown fields
- cooling baseline inputs
- current cooling cost
- recommendation eligibility
- financial comparison results
- selected action
- action-plan checklist
- check-in date
- follow-up status
- actual cost
- later cooling usage
- later comfort rating

For the prototype, appropriate state may be persisted in browser storage so the user's plan survives refresh/revisit on the same browser.

Do not scatter direct `localStorage` access throughout UI components.

Use a small persistence abstraction so it can later be replaced by backend persistence.

---

## 10. Frontend / Backend Boundary

The frontend must not depend directly on temporary hard-coded data structures.

Define typed request and response contracts for core operations.

The required contract areas include:

- room assessment
- clarification answers
- confirmed room profile
- recommendations
- financial comparison
- saved cooling plan
- follow-up check-in

Optional photo-analysis contracts should only be added if computer vision is implemented.

Contract definitions must preserve:

- field names and types
- required versus optional values
- units
- allowed values
- identifiers
- missing versus zero
- currency
- calculation periods
- provenance
- assumptions
- evidence/source references
- calculation method version
- estimate ranges
- result status

API DTOs must remain separate from any future database schema.

Temporary mock implementations are allowed during frontend development, but mocks must conform to the same contracts that the real backend will use.

This allows backend functionality to replace mocks without redesigning frontend integration.

---

## 11. Financial Calculations

Financial calculations are deterministic application logic.

Do not ask an AI model to perform or invent financial calculations.

Follow the calculation rules defined in the PRD.

Current cooling cost may be based on:

- measured cooling-specific energy use; or
- a clearly labelled scenario using electrical input power, operating time, cooling days and tariff.

Do not confuse cooling capacity with electrical input power.

For supported cases:

simple payback =
upfront improvement cost / positive annual net savings

Do not display a misleading payback when:

- savings are zero;
- savings are negative;
- required inputs are missing; or
- evidence does not support the calculation.

All financial outputs must retain the assumptions and calculation method used to produce them.

---

## 12. Evidence and Result Status

Numerical savings must not be generated merely because an intervention is generally sensible.

Recommendations must distinguish between:

### Supported estimate

There is sufficient evidence and input data to calculate an estimate using an approved method.

### What-if scenario

The result depends on an explicitly stated user or scenario assumption.

### Insufficient evidence

The application does not have enough defensible evidence or information to calculate a numerical benefit.

The UI must be able to display these states clearly.

If numerical savings cannot be defended, show the recommendation without fabricated savings or payback.

Never invent values to make comparison rows visually symmetrical.

---

## 13. AI Responsibilities

AI is an assistive layer, not the source of numerical truth.

Approved AI responsibilities may include:

- extracting structured facts from natural-language user input;
- helping classify the overheating complaint;
- determining an appropriate next clarification within defined bounds;
- explaining retrieved evidence in plain language;
- drafting user-facing explanations;
- drafting action-plan/checklist wording from validated structured information.

AI must not:

- invent room facts;
- silently resolve unknown values;
- invent evidence;
- invent sources;
- calculate unsupported savings;
- invent payback periods;
- claim guaranteed cooling performance;
- infer hidden building properties;
- replace deterministic financial calculations.

Validate structured AI outputs before they affect application state.

The product UI should not expose implementation terminology such as LLM, model confidence, AI-powered recommendation or computer-vision confidence unless disclosure is genuinely required.

---

## 14. OpenAI Integration

If OpenAI is used:

- calls requiring secrets must occur server-side;
- API keys must be supplied through environment variables;
- no API key may appear in committed code;
- structured outputs should be validated before use;
- failure must degrade gracefully to the normal guided flow.

OpenAI should assist the experience, not become a dependency that prevents the core demo from working.

Exact model selection can be decided during implementation based on the task and available hackathon resources.

---

## 15. Jev Integration

Jev may be used for the bounded adaptive-intake role described in the PRD.

Its role should remain narrow:

- classify the user's complaint where useful;
- assist with selecting the next relevant clarification.

It must not become the authority for:

- financial calculations;
- evidence;
- savings estimates;
- payback;
- hidden room facts.

The core assessment must still function if Jev is unavailable.

---

## 16. Computer Vision — Stretch Goal

Computer vision is optional.

Do not implement it until the seven-screen core journey is functional and stable.

If implemented, the user may upload an authorised bedroom/window image.

A pretrained detector or segmentation model may propose visible features such as:

- windows;
- curtains or blinds;
- visible shading elements.

All detections remain proposals until the user confirms or corrects them.

Computer vision must not infer:

- compass direction;
- hidden insulation;
- glazing performance;
- physical dimensions without a valid measurement method;
- exact cooling benefit;
- annual shading effectiveness from one photograph.

Computer-vision failure must never block manual assessment.

Do not generate fake thermal heat maps from ordinary photographs.

---

## 17. Cooling Plan

When the user chooses an improvement, create a practical plan.

The plan should support:

- selected improvement;
- supported financial information where available;
- checklist steps;
- check-in date;
- browser persistence;
- optional calendar reminder.

Suggested check-in timing may be provided, with the user able to change it.

The prototype should support the approved design states for the plan screen.

---

## 18. Follow-up

The follow-up experience should support states such as:

- not started;
- started;
- completed;
- stuck.

Where appropriate, allow the user to record:

- actual cost;
- completion date;
- cooling usage after the change;
- comfort after the change;
- barriers.

Before/after information is observational.

Do not claim that the selected improvement caused the observed change.

Preserve the PRD disclaimer that weather, behaviour and other factors may also affect the result.

---

## 19. Error and Loading Behaviour

Do not leave users on broken or empty screens.

Provide appropriate states for:

- loading;
- invalid input;
- missing required information;
- provider/API failure;
- unsupported calculation;
- unavailable evidence;
- browser persistence failure where relevant.

When an optional external service fails, preserve the core manual journey whenever possible.

User-facing error messages should be concise and understandable.

Technical errors may be logged separately.

---

## 20. Accessibility and Responsive Behaviour

Use semantic HTML.

Interactive elements must be keyboard accessible.

Form controls require appropriate labels.

Maintain usable contrast.

Do not communicate important state using colour alone.

The desktop reference screens define the primary visual direction.

On smaller screens:

- preserve content priority;
- stack sections where necessary;
- avoid horizontal overflow;
- maintain usable touch targets;
- preserve all essential functionality.

---

## 21. Code Quality

Prefer:

- strict TypeScript;
- reusable components;
- small focused modules;
- clear naming;
- deterministic business logic;
- typed service boundaries;
- minimal dependencies.

Avoid:

- duplicated business logic;
- giant page components;
- unnecessary state-management libraries;
- premature infrastructure;
- unnecessary abstractions;
- hard-coded values scattered across UI components.

Do not refactor unrelated working functionality while implementing a focused task unless necessary.

---

## 22. Mocking Strategy

Frontend implementation must not wait for the complete backend.

Temporary mock services are allowed.

Mocks must:

1. implement the real typed contracts;
2. live behind the same service boundary intended for real APIs;
3. be clearly identifiable as mocks;
4. be replaceable without rewriting page components;
5. never present fabricated demo values as evidence-backed real-world estimates.

A controlled demo fixture may be provided for the hackathon walkthrough.

The fixture must be clearly separated from calculation/evidence logic.

---

## 23. Secrets and Environment Variables

Never commit:

- OpenAI API keys;
- Jev credentials;
- Vercel secrets;
- provider tokens;
- other private credentials.

Use environment variables.

Provide an `.env.example` containing variable names only, never real values.

---

## 24. Out of Scope for the Core Build

Do not implement these unless requirements change:

- authentication;
- production user accounts;
- production database infrastructure;
- contractor marketplace;
- contractor booking;
- live quote comparison;
- finance applications;
- hourly indoor-temperature simulation;
- guaranteed temperature reduction;
- guaranteed savings;
- emissions predictions;
- sensor hardware integration;
- custom ML model training;
- floor-plan reconstruction;
- social features;
- gamification.

---

## 25. Definition of Done — Core Prototype

The core prototype is complete when:

- all seven approved product screens are implemented;
- the complete journey works from landing to follow-up;
- the visual implementation closely matches the approved references;
- assessment inputs produce a confirmed profile;
- unknown values remain unknown;
- current cooling-cost calculations follow the PRD;
- comparison states distinguish supported estimates, what-if scenarios and insufficient evidence;
- unsupported savings are not fabricated;
- a user can choose an action and create a plan;
- the plan can persist in the same browser;
- follow-up information can be recorded;
- relevant input changes trigger recalculation/reassessment;
- mocks use the agreed DTO/service boundary;
- secrets remain server-side;
- optional provider failure does not destroy the core flow;
- the application works on desktop and remains usable on mobile;
- the production build succeeds;
- the application can be deployed to Vercel.

Only after these conditions are substantially met should optional computer vision or other stretch features take priority.

## Authorised extension: thermal what-if scenario (3 October 2026)

The user requested addressing the lack of thermal simulation. A separate experimental 24-hour single-zone scenario is now permitted in addition to the core release. It requires explicit physical assumptions, offers only an opt-in labelled synthetic example, and never promotes results into supported savings or known room facts. No annualisation, payback, CFD or calibrated home-temperature claims. See `docs/contracts/thermal-scenario.md` for the model, limitations and acceptance checks. This overrides the earlier simulation exclusion only for this bounded experimental feature.

## Authorised presentation revision: cooling options (3 October 2026)

The user requested replacing the empty financial comparison table with improvement cards as the primary screen-five view. Show reviewed guidance, reported room context, practical next steps, evidence and investigation selection immediately; optional internet search enriches those cards. Keep the AC label method and quote inputs in an initially collapsed `Compare costs and savings` section. Display individual figures only when their inputs support them; otherwise explain what is needed to calculate the comparison. The spending guide and experimental simulator are secondary disclosures. This changes the earlier screen-five presentation, while retaining eligibility, financial calculations, unknown input states, source provenance and the action-plan journey.

The AC comparison disclosure now uses four guided steps: current AC, replacement, rate and quote, then side-by-side results and comparability checks. Inputs and the current step save to the existing browser draft; users can finish later without supplying missing values. Optional step metadata is backward-compatible and excluded from the material financial signature. Label and quote provenance, required confirmations, eligibility and deterministic calculation gates remain unchanged. Technical explanations stay in expandable help.


## Heat-reduction journey update - 3 October 2026

The AC-and-shading financial example remains the featured homepage demonstration. The product goal is to reduce bedroom heat and cooling energy while retaining comfort, with money as a motivation. Present eligible shading and insulation investigations, then ventilation review, then conditional AC replacement. Retain all four eligible paths rather than dropping a passive option to satisfy the earlier three-option limit. This is a reading order, not an effectiveness ranking. Core intake includes window coverings, opening ability and constraints before equipment questions. Every option has a mechanism, room evidence and a practical next step without requiring an AI call. AC label calculations remain separate; personal passive savings and emissions are not invented. Follow-up reviews comfort, usage and spending as observations.

## User-requested techniques knowledge base - 3 October 2026

Add a supplementary `/knowledge-base` route for at least ten simpler, eco-friendly home and room efficiency techniques. Store reviewed, paraphrased Australian government guidance in a typed catalogue, with category, effort, energy mechanism, steps, suitability checks, source links and review date. The searchable library is linked from navigation and cooling options and works without an AI call or saved room profile. It is general education, not a new financial method or an eligibility ranking. The existing room investigations, saved selections and numerical calculations retain their contracts. Source review is manual; no automatic refresh is implied.

Recommendation research also receives relevant catalogue entries selected by eligible investigation and typed room reports. Contract v3 allows up to three validated technique IDs per suggestion. The app resolves these into library links, with the review date displayed separately from live search sources. Both provider stages receive steps, checks and government source metadata; no additional private user data is sent. A library reference cannot bypass live-search provenance or financial evidence requirements.

## Dynamic recommendations requested by the user - 3 October 2026

Contract v4 supersedes the v3 presentation: the model selects a relevant subset of eligible investigations and standalone practical techniques from the reviewed catalogue, generating short structured cards rather than rewriting a mandatory fixed list. Rooms without equipment or an upgrade investigation can receive techniques. Simple actions precede upgrades. Explicit equipment reports constrain both provider prompts and runtime validation: no AC references unless AC is reported, and no fan advice unless a fan is reported. Window count and covering categories join the minimal context; unknown values remain unknown. Reviewed starting points and the existing investigation-to-plan flow remain available if generation fails. No arbitrary markup, new installation IDs or financial predictions are accepted. See `docs/contracts/cooling-research-ui.md`.


## Final positioning and Heatwave-Ready plan — 4 October 2026

The product story now leads with understanding overheating, keeping unnecessary heat out, reducing cooling demand and preparing for hotter days. This supersedes earlier whole-journey cooling/financial-first naming; equipment-specific cost calculations retain cooling terminology and their evidence rules. The existing AC-and-shading homepage scenario remains illustrative, with heat entry and reduced demand leading the story.

Add a small deterministic Heatwave-Ready guide inside the existing room-plan screen, alongside the selected longer-term investigation. Group a few applicable reviewed knowledge-base actions before a hot day, during peak heat and conditionally when outdoors is cooler. Reuse existing eligibility and source references. Require explicit reported equipment for equipment advice. Omit window-opening advice when opening ability or constraints are unknown or limiting; never assume night conditions are suitable. Missing facts permit only a restrained generally applicable reviewed starting point. Do not infer absent insulation, weather, health risk, performance or numerical benefits.

Guidance is derived from retained room facts on revisit; it introduces no new saved action IDs, completion state, DTO, provider calls or API. Existing investigation checklist, saved financial/evidence snapshots, history, calendar date and observational follow-up remain intact. The next action precedes supporting financial information. Follow-up notes can record preparation actions tried. No weather service, health prediction, savings percentage, temperature reduction or quantified climate-target contribution is added.
