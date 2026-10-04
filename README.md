# Home Heat Planner

**A more comfortable home. Less wasted energy. A practical plan for a changing climate.**

[**Try the live app**](https://home-heat-planner.vercel.app/) · [**Watch the 2-minute demo**](https://youtu.be/TMwqq4ahnBs) · [**Full app walkthrough**](docs/app-walkthrough.md)

Home Heat Planner helps households understand why a room overheats, find practical ways to reduce cooling demand, and turn advice into action. It brings together an interactive room assessment, energy-bill assistance, everyday efficiency guides and preparations for extreme weather.

Built for Junction Climate Hack-tion 2026's **Build for 2035** challenge, under the **Resilient Cities & Buildings** track, the prototype starts with one bedroom in a Greater Sydney home. Its guide libraries also cover broader household energy use and home resilience using Australian sources.

You can start with the room details you know, upload a bill to the Energy Assistant, or browse the guides. **An account is optional. The manual room journey and guide libraries work without an AI API key.**

## How this contributes to COP31's goals

The COP31 Presidency's announced Resilient Cities target is to reduce **energy consumption intensity in the building sector by at least 25% by 2035**. This is an energy-intensity target, rather than a flat reduction in total energy use. [Source: GlobalABC's report on the COP31 Presidency's targets, June 2026](https://globalabc.org/news/bonn-2026-buildings-electrification-cop31).

Home Heat Planner addresses the household decisions behind that ambition: understanding energy use, keeping unwanted heat out, using existing equipment thoughtfully and preparing before extreme weather arrives.

| App capability | What it helps a household do | Intended contribution |
| --- | --- | --- |
| Room assessment and tailored improvements | Identify relevant shading, insulation, ventilation and equipment checks | Reduce avoidable cooling demand while considering comfort |
| Energy Assistant and transparent cost tools | Understand a bill, compare supported costs and decide what to investigate | Make energy use and the financial reasons for efficiency easier to understand |
| Simple techniques library | Try practical habits and improvements using what the household already has | Make energy-saving actions accessible before a larger purchase |
| Heatwave-Ready plans and Home resilience guides | Prepare a room, household essentials and a plan for extreme conditions | Support adaptation to heatwaves, floods, storms and bushfires |
| Saved plans, follow-ups and task rewards | Break an improvement into steps and return to record progress | Encourage follow-through beyond reading advice |

The climate story has two parts: **mitigation**, by helping people reduce unnecessary energy demand, and **adaptation**, by helping them prepare their homes and routines. Lower electricity demand can reduce associated emissions, depending on the energy supply. The prototype does not calculate household carbon reductions or claim a measured contribution to the 25% target; its current contribution is decision support and preparation. See [Your Home's guidance on reducing household energy demand](https://www.yourhome.gov.au/live-adapt/zero-carbon).

## What you can do in the app

### 1. Build a picture of your room

The **room assessment** asks one question at a time about when the bedroom feels hottest, its floor and roof context, windows and their directions, shade, insulation and cooling equipment. Questions adapt to previous answers: individual windows get direction questions, and equipment questions appear when that equipment is reported. You can choose **Not sure**, see **Why this matters**, or reset the questionnaire.

A live **3D room** changes alongside the answers, making the relationship between windows, sun-facing walls and equipment easier to understand. Rotate, zoom, switch to 2D or refine the diagram before continuing. Furniture, dimensions and airflow animations are illustrative; they are not a measured building model or a physical simulation.

### 2. Understand the heat and find relevant improvements

**What's heating your room?** connects your reported details to possible contributors, such as unshaded windows or missing insulation. Each explanation shows the facts behind it and what still needs checking.

The **room improvements** page turns that context into practical next actions. Reviewed starting points are available immediately. Optional **Personalise my recommendations** searches selected Australian government sources and returns structured cards with relevant benefits, steps, checks and links to the Simple techniques library.

Recommendations follow the room's reported equipment and constraints. If you have not reported AC, the personalised recommendations cannot mention AC or suggest replacing it. Fan advice likewise requires a reported fan. This keeps the starting point focused on the home and opportunities the user actually has.

### 3. Understand costs before making a decision

The app offers different tools for different levels of information:

| Tool | What it explains |
| --- | --- |
| **Current cooling cost** | The cost of a cooling-specific energy measurement over its stated period, or an explicit power-and-usage what-if estimate |
| **Window shading scenario** | For eligible rooms with bedroom-only AC, how assumed shading changes affect modelled electricity use and cost over a selected period |
| **Comparable AC replacement** | For eligible systems, an annual energy-label cost comparison and simple payback when the required label details, suitability checks and installed quote are supplied |

Every number keeps its units, inputs and assumptions visible. Users can skip unknown energy details and still receive guidance. A whole-home bill is never treated as a measured bedroom cooling bill.

The shading scenario uses an uncalibrated room model and explicitly accepted synthetic weather and room assumptions. It is a way to explore possibilities, not a prediction of personal savings. Insulation and ventilation advice remains qualitative in the main comparison. The separate experimental **24-hour cooling scenario** lets users explore those changes with explicit assumptions.

### 4. Make sense of an electricity bill

The **Energy Assistant** supports general household-energy questions and guided bill analysis. Upload a digital PDF bill, review and correct the extracted details, then answer up to five household questions. The assistant explains relevant usage, tariffs, charges and credits, and suggests practical next steps with relevant guide links.

Supported bill totals and dates feed calculations such as average daily imported electricity. The assistant does not invent an appliance breakdown or allocate whole-home electricity to a bedroom. Multiple tariffs remain separate.

Bill analysis accepts selectable-text PDFs up to **4 MB and 12 pages**; it does not include OCR for scanned bills. The full extracted text, confirmed figures and household answers are sent to OpenAI for analysis. The active bill and chat reset when you leave, refresh or start a new chat; they are not saved with your room plan.

### 5. Find simple ways to use less energy

**Explore more → Simple techniques** is a public library of **14 practical guides**. Search or filter by focus and effort to find actions such as closing curtains before direct sun, adding external shade, using cooler outdoor air when appropriate, checking insulation, using fans in occupied rooms, choosing LEDs or shifting heat-producing chores.

Each illustrated guide explains why the action may help, how to try it, what to check and where the guidance comes from. The library works without AI. Relevant entries also inform personalised recommendations, so users can move from a suggested action to a practical guide.

### 6. Prepare your home for extreme conditions

**Explore more → Home resilience** contains **15 preparation guides** across heatwaves, floods, storms, bushfires and earthquakes. Cards show when to prepare, three practical steps, items to have ready or questions for a professional, a useful outcome and a safety check.

Examples include planning a flood evacuation route, preparing belongings for higher storage, securing loose outdoor items before a storm, making a bushfire leave plan and arranging professional building checks. Sources include NSW Health, Your Home, NSW SES, Victoria SES, NSW Rural Fire Service and Geoscience Australia.

This extends the app from everyday efficiency to household resilience. It provides preparation guidance, not live warnings or property-specific risk assessments. Earthquakes are included as a broader home-resilience topic; they are geological hazards, not caused by climate change.

### 7. Turn advice into a plan and follow through

**My room plan** combines a selected investigation, a practical checklist, supporting assumptions and relevant **Heatwave-Ready** guidance for before a hot day, during peak heat and, where appropriate, when it is cooler outside.

Save a plan, choose a check-in date and download a calendar event. At follow-up, record progress, barriers, actual spending and observations about energy use or comfort. History helps users review what they tried and decide on the next step. Observations are not treated as proof that an action caused a saving.

Guest progress stays in the same browser and site origin. Optional Google or email/password sign-in saves a private journey across devices through Neon. Existing guest work can be explicitly imported into an empty account journey. Calendar events are downloaded for the user to import; the app does not send reminder messages.

### 8. Get encouragement to complete practical actions

**Home Rewards** connects eligible saved assessments to supported tasks. Signed-in users can submit task photos, receive an automated review and earn fixed app-defined coins for accepted submissions. A private history records approvals and the wallet balance.

The **marketplace** offers real retailer links and clearly labelled demo coupon redemptions. **Coupons are demonstrations: no retailer accepts the generated codes, and no real discount or order is issued.** Photo approval checks visible task criteria; it does not certify an installation or measure energy or emissions savings.

## The main journey

```text
Describe your room → Review its details and cooling cost → Understand possible heat contributors
                  → Explore relevant improvements → Save a plan → Return for a check-in
```

The Energy Assistant and both guide libraries are also independent entry points. Users do not need to complete an assessment to read a bill or browse preparations.

For a demo, follow one room through to a saved plan, then show the Energy Assistant, Simple techniques and Home resilience to explain how the app connects understanding, everyday action and preparation. The [full walkthrough](docs/app-walkthrough.md) covers individual controls, optional comparisons and additional tools.

## How it works technically

The app uses **Next.js App Router, React, strict TypeScript, CSS modules and Three.js**, with Vercel hosting, Neon Auth and Postgres for optional accounts and persistence. Server-side PDF extraction uses `unpdf`. Runtime AI calls use OpenAI's Responses API with `gpt-6-luna` and validated structured responses.

| Responsibility | Implementation |
| --- | --- |
| Questions, heat contributors and eligibility | Typed room facts and deterministic rules |
| Financial and scenario results | Calculation code validates inputs and applies documented methods |
| Language assistance | AI helps with question selection, diagram proposals, bill explanations and sourced recommendations |
| Generated UI | The model returns constrained data; the app validates it and renders its own components |
| Guidance libraries | Reviewed catalogues checked into the repository; no runtime AI required |
| Progress | Guest browser storage or an authenticated, private Neon journey |

**AI helps explain and organise information; code produces the numerical results.** Proposed document or diagram details require review, and generated guidance cannot override eligibility rules. The manual planner remains available if optional provider calls fail.

For example:

```text
Measured cooling cost = cooling-specific kWh × flat electricity rate
What-if cooling cost = electrical input kW × hours per cooling day × cooling days × rate
```

AC label comparisons, shading scenarios and the thermal experiment have distinct methods and limitations. See the [financial method](docs/financial-method.md), [shading scenario](docs/contracts/shading-scenario.md) and [thermal scenario](docs/contracts/thermal-scenario.md) documentation.

```text
src/app/        Pages and API routes
src/features/   Feature UI and reviewed guide catalogues
src/domain/     Typed room facts, plans and provenance
src/lib/        Calculations and persistence utilities
src/services/   Planner adapters and API clients
src/contracts/  Request/response schemas and validation
src/server/     Server-only providers and request guards
db/             Database migrations
docs/           Walkthrough, product spec and method contracts
```

## Run it locally

Use **Node.js 22.18 or newer** and **npm**:

```sh
git clone https://github.com/md2801/home-heat-planner.git
cd home-heat-planner
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), or the address printed by the terminal. To choose another port, run `npm run dev -- --port 3001`. The manual planner, local plan saving and guide libraries work without external credentials.

Optional capabilities use server-side configuration in an ignored `.env.local` file or the hosting environment:

| Capability | Configuration |
| --- | --- |
| AI assistance, bill analysis and task photo review | `OPEN_AI_KEY`; rewards also accepts `OPENAI_API_KEY` |
| Account sign-in | `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` |
| Private account saving and rewards wallet | `DATABASE_URL` for the matching Neon branch; a direct `DATABASE_URL_UNPOOLED` for migrations |
| Hosted AI usage controls | `AI_DISTRIBUTED_LIMITS_CONFIRMED=true` only after external/account-wide limits and abuse controls are configured; this flag does not implement them |

For this project's local sign-in setup, stop the dev server, run `npm run setup:auth` and `npm run check:auth`, then restart it. The setup helper fills missing local auth settings; it does not supply your database connection, apply migrations or configure Vercel. See [account setup](docs/account-sign-in.md) and [Home Rewards setup](docs/home-rewards.md) for database and deployment requirements. Never commit secrets or put provider/database credentials in `NEXT_PUBLIC_*` variables.

The app sends submitted assistance text, extracted bill contents or task photos to OpenAI when those features are used. Calls use `store: false`, but provider processing and retention policies still apply. The app does not intentionally persist bill PDFs or extracted bill text. Account journeys and reward records have separate persistence. Feature contracts describe the exact data sent and retained.

Project checks and production commands:

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

## Routes and further reading

| Routes | Purpose |
| --- | --- |
| `/` | App introduction, feature tour and starting points |
| `/assessment`, `/room-baseline` | Room questions, visual review and cooling cost |
| `/heat-contributors`, `/cooling-options` | Possible causes, improvements and optional comparisons |
| `/cooling-plan`, `/follow-up` | Saved plan, check-in and history |
| `/energy-assistant` | Household-energy chat and reviewed PDF bill analysis |
| `/knowledge-base`, `/explore` | Simple techniques and home-resilience guides |
| `/rewards`, `/marketplace` | Task approvals, coins and demo redemptions |
| `/sign-in`, `/sign-up`, `/account` | Optional identity and private saved journey |
| `/document-import` | Independent bill, label or quote extraction with per-field review and JSON export |
| `/thermal-scenario` | Experimental 24-hour temperature and electricity comparison |

- [Full app walkthrough](docs/app-walkthrough.md): detailed user journey and optional tools.
- [Product requirements](docs/PRD.md) and [build specification](docs/BUILD_SPEC.md): product intent, evidence rules and architecture.
- [API and persistence contracts](docs/contracts/README.md): developer details, validation and provider limits.
- [Energy Assistant](docs/contracts/energy-assistant.md) and [guidance UI](docs/contracts/cooling-research-ui.md): bill processing and structured recommendations.
- [Account sign-in](docs/account-sign-in.md) and [Home Rewards](docs/home-rewards.md): storage, setup and limits.
- [Document import](docs/contracts/document-import.md) and [room scene](docs/contracts/room-scene.md): reviewed proposals and illustrative diagrams.
- [Approved designs](docs/design/): the original seven-screen references.

## Development disclosure

OpenAI Codex was used as an AI coding/development tool during the hackathon for coding assistance, implementation, debugging, testing, and repository-level development workflows. This development-tool disclosure is separate from the application's runtime AI features.
