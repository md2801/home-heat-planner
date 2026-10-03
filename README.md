# Home Heat Planner

**Understand why your bedroom gets hot, explore cooling improvements, and turn a next step into a plan.**

Home Heat Planner is a web app for homeowners in Greater Sydney, built for the Junction Climate Hack-tion 2026 under the Resilient Cities and Buildings track. The prototype focuses on one bedroom at a time.

It starts with the details you know about your room, explains what may be contributing to overheating, and helps you investigate shading, insulation, ventilation or an AC replacement. Where the required energy readings, assumptions and quote details are available, it calculates cooling costs and a bounded financial comparison. You can then save a checklist and return to review progress, spending and comfort.

**No account is required. The full manual journey works without an AI API key.**

## Start the app locally

Requirements: **Node.js 22.18 or newer** and **npm**.

```sh
git clone https://github.com/md2801/home-heat-planner.git
cd home-heat-planner
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the URL printed in the terminal if another process is already using that port. To choose a port explicitly:

```sh
npm run dev -- --port 3001
```

No provider setup is needed to answer questions, review guidance, calculate from your own inputs, save a plan or record a check-in. Optional AI features are described below.

## A full walkthrough

```text
Home → Room assessment → Room & cooling cost review → Heat contributors
     → Cooling options → Saved cooling plan → Follow-up
```

### 1. Start with your bedroom

The home page introduces the app and shows an illustrative bedroom cooling story. Choose **Start my assessment** to begin. The example room is a demonstration, not a model of your home.

### 2. Answer questions about your room

The assessment presents one question at a time and builds a live 3D room preview as you answer. It asks about:

- When the room feels hottest, its floor, and what is directly above it.
- The number of windows, their compass-facing walls and external shade.
- Whether ceiling or roof insulation is known to be present.
- Fans and air conditioning, including equipment type and relevant placement details.

The questionnaire adapts to your answers. One to four windows each get their own direction question; an unknown count or more than four uses a room-wide direction question. Fan questions appear when you report a fan, and wall placement appears for wall-mounted or window-mounted ACs. The preview supports up to four windows.

Choose **Not sure** when a detail is unknown. **Why this matters** explains how an answer is used. Once the core questions are complete, **See my assessment** lets you continue; optional questions can refine cooling use, budget, permissions, window coverings, opening constraints, location and comfort.

If you want to describe the problem in your own words, optional question assistance can suggest a relevant question from the app's defined list. It does not automatically turn your description into confirmed room facts.

Answers save in the same browser. **Reset questionnaire** asks for confirmation before clearing that browser's assessment, diagram, plans and check-ins.

### 3. Review your room and current cooling cost

The room review shows your reported details alongside the diagram. Correct answers before confirming the review, or use **Refine your room diagram** to edit window details, coverings, shade and equipment. An optional description-based diagram proposal must be reviewed and confirmed before it updates your answers.

The cost section offers three paths:

| Path | What you provide | What the app shows |
| --- | --- | --- |
| Cooling-specific measurement | Total cooling kWh, start/end dates, measurement scope and a flat electricity rate | Electricity cost for that measured period, once bedroom-only scope is confirmed |
| What-if estimate | Assumed average electrical input, operating hours per cooling day, cooling days, period and a flat rate | A cost conditional on your stated equipment-use assumptions |
| Skip / unknown | No reliable energy information | Room guidance without an invented cooling bill |

A whole-home electricity bill does not identify bedroom cooling consumption. For a measurement, enter the **total kWh over the whole stated period**, not an hourly or daily average. For an estimate, electrical input power is different from an AC's advertised cooling capacity.

Expand **See calculation** to inspect the arithmetic, units, period and input provenance. Continue with **See what's heating your room** to confirm the reported profile and open the assessment.

### 4. Understand possible heat contributors

The heat contributors page explains what is worth investigating based on your answers. Examples include sun through unshaded windows, roof/ceiling heat transfer where insulation is absent or unknown, and practical limits on opening windows.

Each explanation identifies the facts it uses, what remains uncertain, relevant guidance and a next check. **Why these?** explains the selection. These are plausible contributors, not a measured diagnosis of your building.

You can refine your answers or continue to the cooling options.

### 5. Explore cooling options

Improvement cards lead with your reported room context, a practical next action, checks to make and source links. Depending on eligibility, you may see window shading, ceiling insulation, window-opening or comparable AC replacement investigations. The app can show fewer options when the evidence or permissions do not support them.

Choose **Find guidance for my room** for an optional internet search of Australian government guidance from Your Home, energy.gov.au and Energy Rating. A loading skeleton appears while the search runs. Returned guidance includes source links and a search timestamp; the existing reviewed guidance remains available if the search fails.

Use **Set a budget** or **Change budget** to refine your spending limit. A budget alone does not establish an installation price or savings. Choosing an investigation selects a next step; it does not commit you to purchasing or installing anything.

Three optional sections provide more detail:

- **Compare costs and savings:** the guided AC replacement comparison described below.
- **Understand your cooling costs:** your baseline, inputs to confirm and, when supported figures exist, a spending explanation.
- **Explore a cooling scenario:** the separate experimental temperature and cost tool.

Select an investigation, then choose **Continue to my cooling plan**.

#### The guided AC comparison

For an eligible AC replacement investigation, **Compare costs and savings** opens four focused steps:

1. **Your current AC:** indoor/outdoor model numbers, cooling capacity, yearly label cooling energy and a label link.
2. **The replacement:** the equivalent details for the proposed system, with help finding the right energy-label figures.
3. **Rate & quote:** your flat electricity usage rate, installed price, quote provider/inclusions/date and any extra yearly costs.
4. **Your comparison:** the two systems side by side, required comparability confirmations and supported results.

Details and your current step save automatically. Use **Finish later** to return when you have the remaining information. Blank values remain unknown; zero recurring costs must be entered explicitly when applicable.

The method compares two distinct, equal-capacity, comparable **non-ducted single-split AC systems** using current Zoned Energy Rating Labels for a confirmed **Average climate zone**. It also requires installer confirmation of sizing and comparable features, bedroom-only system scope, installation permission, dated references and a scoped quote. Optional sourced service-life information helps assess payback.

When those checks are complete, the app shows annual label electricity costs, annual net savings, installed price and simple payback where calculable. Negative savings appear as a higher annual cost. Missing details produce an explanation of what still needs checking.

This is a comparison under standard annual label conditions, **not a prediction of your household's actual savings**. Labels and quotes are transcribed by you and are not independently verified. See the [financial method](docs/financial-method.md) for applicability and limitations.

### 6. Save a cooling plan

Your selected investigation becomes **My cooling plan**, with a room view, plan summary, practical checklist and supporting assumptions/evidence. Checklist items help you gather information, confirm constraints or arrange the next step; checking them does not prove that installation has occurred.

Choose a check-in in **7 days**, **14 days**, or on a custom date. You can also save without a date. Choose **Save my plan** to preserve the plan and its financial/evidence snapshot in this browser.

With a saved plan and check-in date, **Add to calendar** downloads an `.ics` event that you can import into your calendar. The app itself does not send email, SMS or push reminders. Changing the date in the app does not update an event already imported into a calendar.

### 7. Return and record what happened

Open your saved plan and continue to check-in. Record **Not started**, **Started**, **Completed**, **I'm stuck**, or **Deferred**.

If you are stuck, record a barrier such as cost, permissions, installation, time or uncertainty and review a smaller next step. For completed work, you can record the completion details, actual spending, cooling use and comfort, with optional energy readings and period information. Choose **Save update** to save the check-in.

Before/after usage is shown only when both records and comparable-use confirmation are supplied. Comfort ratings use a 1–5 scale and need comparable conditions and times of day. Weather, behaviour and other changes can affect the result, so these observations do not prove the selected action caused a saving or comfort improvement.

Material changes to your room or comparison inputs require reviewing the selection and saving a revised plan. Earlier saved plan snapshots and check-ins remain available in history until the assessment is reset.

## Simple techniques knowledge base

Open **Simple techniques** in the navigation or **Browse simple techniques** on the cooling options page. The `/knowledge-base` library contains 14 researched techniques for a room or house:

- Close curtains before direct sun arrives; add external shade; grow suitable shading plants.
- Use cooler outdoor air, seal unwanted gaps and check insulation with qualified help.
- Use fans for occupied spaces, cool rooms in use, choose a comfortable thermostat setting and clean AC filters.
- Choose LEDs, switch off unnecessary electronics, air-dry laundry and shift heat-producing chores away from peak heat.

Search the library or filter by focus and effort. Each entry explains its energy-saving mechanism and expands into practical steps, suitability checks and links to Australian government guidance. Entries were reviewed on **3 October 2026**; the date records our review, not the source's publication date.

The catalogue is checked into `src/features/knowledge-base/catalogue.ts` and renders without a provider request. Optional live recommendation research also receives a relevant subset of these entries, including their practical steps, checks and source links. The model can select up to three matching guides per investigation, displayed as **Simple techniques to try**. The app validates the guide IDs against the room context and renders links to the library. These reviewed resources are labelled separately from freshly searched sources and do not generate personalised financial savings, emissions or temperature predictions. Review the linked sources when updating entries.

## What the 3D room represents

The diagram gives your answers a visual reference: window directions, roof context, coverings and cooling equipment. You can rotate it, zoom, reset the view and switch to 2D. Equipment and window labels follow your reported details.

Furniture, finishes, dimensions and exact spacing are illustrative. The optional airflow animation is a visual preview, not a physical airflow or temperature simulation. The diagram does not establish consumption, installation suitability or savings.

## Experimental 24-hour cooling scenario

Open the simulator from **Explore a cooling scenario**, or visit `/thermal-scenario`.

Enter explicit room, heat-transfer, ventilation, AC and tariff assumptions plus 24 hourly outdoor-temperature and solar-gain pairs. Alternatively, choose **Load a synthetic example** to explore clearly labelled demonstration data. Try assumed changes to shading, insulation or night ventilation and choose **Compare this day**.

The tool compares a simplified single-room heat balance. Temperature curves use AC-off runs; separate AC-on runs calculate cooling electricity and cost for the supplied conditions. Inputs are page-local, reset when you leave, and do not become confirmed room facts or supported annual savings.

It is an uncalibrated what-if model, not a weather forecast or validated building prediction. It does not model detailed airflow, humidity or neighbouring rooms, and it does not calculate annual savings or payback. See the [thermal scenario documentation](docs/contracts/thermal-scenario.md).

## Where the advice and numbers come from

| Part of the app | How it works |
| --- | --- |
| Questions and eligibility | Defined question branches and deterministic rules use your reported facts and constraints |
| Contributor explanations | Conservative rules connect those facts to reviewed guidance and visible unknowns |
| Improvement cards | Reviewed guidance is available immediately; optional sourced web search adds qualitative explanations |
| Current cooling cost | Code multiplies measured cooling energy by the tariff, or uses your explicit power/time scenario |
| AC financial comparison | Code applies the documented label method to validated inputs and confirmations |
| 3D diagram | Rendering code builds an illustrative scene; optional AI proposes details for your confirmation |
| Follow-up | Your saved, self-reported observations are compared only when the required context is supplied |

The cooling-cost equations are:

```text
Measured-period cost = total cooling kWh × AUD/kWh

What-if period cost = average electrical input kW × hours/cooling day
                      × cooling days × AUD/kWh

AC annual net savings = (current label kWh/year − replacement label kWh/year)
                        × AUD/kWh + current extra yearly costs
                        − replacement extra yearly costs

Simple payback years = installed replacement price ÷ positive annual net savings
```

The calculators support a flat usage rate and exclude fixed supply charges and time-of-use pricing. A short measured period is not automatically annualised. General shading, insulation and ventilation guidance does not supply a numerical savings method, so the app does not invent those savings or payback periods. The experimental scenario stays separate from supported comparisons.

The environmental aim is to help people investigate reducing cooling energy demand while considering comfort. Actual benefits depend on the building, equipment and operation. The prototype does **not** calculate carbon emissions or claim verified environmental savings.

## Optional AI setup and data handling

The server reads **`OPEN_AI_KEY`** for optional OpenAI features. Configure it through your local server environment or an ignored `.env.local` file, then restart the development server. Use this exact variable name; the app does not read `OPENAI_API_KEY`. Never put a provider key in a `NEXT_PUBLIC_*` variable or commit it to Git.

| Feature | AI's role | Information sent |
| --- | --- | --- |
| Question assistance | Select a relevant allowed question (`gpt-4.1-mini`) | The submitted problem description and allowed questions |
| Room proposal | Suggest a structured diagram for review (`gpt-6-luna`) | The submitted room description and current diagram details |
| Financial explanation | Choose the reading order of app-owned explanation cards (`gpt-6-luna`) | Recomputed summaries, limitations and checks, not raw complaints, location or quote identities |
| Online guidance | Search allowed government sources (`gpt-5.5`), then format concise cards (`gpt-4.1-mini`) | Room categories, unknowns and eligible option IDs; not location, free-text answers, energy use, budgets or quote/model identities |

**AI does not calculate financial results, choose an installation for you or turn missing information into facts.** Diagram proposals require confirmation, and web guidance cannot override eligibility or calculation rules. Provider failures retain the manual flow. Calls use validated structured outputs, server-side credentials and `store: false`.

Descriptions submitted to assistance are sent to OpenAI; leave out addresses and personal details. The app's provider diagnostics exclude credentials, prompts, generated text and raw error messages.

Local endpoints have request limits, timeouts and, where applicable, short-lived caches. Intake also uses `AI_MAX_REQUESTS` and `AI_MAX_SPEND_USD` as conservative process-local guards, not actual billing measurement. Limits reset when the process restarts and are not distributed spend controls. See [API contracts and limits](docs/contracts/README.md).

On Vercel, optional assistance defaults off unless `AI_DISTRIBUTED_LIMITS_CONFIRMED=true`. That flag declares external/account-wide limits and abuse controls have been configured; it does not implement them. Keep it unset until those controls exist. Voice and photo-based assessment are not implemented.

## Saving and privacy

The prototype uses browser storage, with no account or server database for assessments, plans or check-ins. Return using the **same browser profile and site origin** to reopen your progress; changing devices, browsers or localhost ports does not share that storage.

Assessment and comparison drafts save automatically. Plans and check-ins have explicit **Save my plan** and **Save update** actions. Relevant input edits invalidate stale selections and preserve earlier saved snapshots in history; navigating between comparison steps does not change the financial inputs.

If browser saving is blocked, the app shows a notice and keeps working in the current tab, but a refresh may lose progress. Resetting the questionnaire clears the saved assessment, diagram, plans and history for that browser origin. Calendar files contain a generic check-in and return link, rather than private room or financial details.

## Routes

The educational library is available at `/knowledge-base`, including before an assessment is completed.

| Route | Screen |
| --- | --- |
| `/` | Introduction and illustrative cooling story |
| `/assessment` | Adaptive questionnaire and live room preview |
| `/room-baseline` | Room review, diagram editor and cooling-cost baseline |
| `/heat-contributors` | Possible contributors, evidence and investigations |
| `/cooling-options` | Improvement cards, optional search and guided AC comparison |
| `/cooling-plan` | Checklist, saved plan and calendar check-in |
| `/follow-up` | Progress, barriers, completion, usage, comfort and history |
| `/thermal-scenario` | Optional experimental 24-hour temperature/cost comparison |

## Development and architecture

The app uses **Next.js App Router, React, TypeScript and Three.js**. Feature styling uses CSS modules alongside the shared styles. Development and production builds use Webpack.

```text
src/app/               Pages and API routes
src/features/          Assessment, diagrams, guidance, comparison, plans and follow-up UI
src/domain/            Typed facts, plans, provenance and material input signatures
src/lib/               Calculations and browser persistence utilities
src/services/          Planner adapters and provider request clients
src/contracts/         Request/response types, schemas and validation
src/server/            Server-only OpenAI integration and request guards
docs/                  Product requirements, build spec, designs and method contracts
```

UI components, pure business/calculation models, persistence and provider calls are kept separate. The current planner client uses a local typed adapter; `/api/planner` exposes the same deterministic logic through an HTTP boundary. Optional provider calls use `/api/intake`, `/api/room-scene`, `/api/financial-brief` and `/api/cooling-research`. Transport inputs exclude the assessment question cursor, completion flag, saved history and storage keys. The comparison draft's optional step metadata does not affect calculations.

Run the project checks:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Serve a production build locally:

```sh
npm run build
npm start
```

Vercel is the intended hosting target: use the Next.js preset and `npm run build`, and configure any optional provider credentials in the hosting environment. The manual app can run without credentials. This README does not imply that a deployment is currently live.

## Further reading

- [Product requirements](docs/PRD.md): audience, scope, evidence rules and acceptance criteria.
- [Build specification](docs/BUILD_SPEC.md): architecture and authorised feature/presentation extensions.
- [Approved designs](docs/design/): the seven original screen references.
- [Financial method](docs/financial-method.md): AC comparison inputs, applicability and equations.
- [API and persistence contracts](docs/contracts/README.md): validation, units, provider limits and examples.
- [Guidance UI contract](docs/contracts/cooling-research-ui.md): how searched guidance becomes concise improvement cards.
- [Room scene contract](docs/contracts/room-scene.md): diagram proposals, confirmation and limitations.
- [Thermal scenario contract](docs/contracts/thermal-scenario.md): experimental model and checks.
