# App walkthrough

[Back to the project overview](../README.md)

This guide follows the current screens in more detail, including optional tools, the information they need and what their results mean. For the feature overview, COP31 connection and local setup, start with the project README.

## The room-planning journey

```text
Home → Room assessment → Room & cooling cost review → Heat contributors
     → Room improvements → Saved room plan → Follow-up
```

### 1. Start with your bedroom

The home page introduces the app and shows an illustrative bedroom cooling story. Choose **Start my assessment** to begin. The example room is a demonstration, not a model of your home. Below it, a three-step walkthrough explains the journey, with introductions and direct links to the Energy Assistant, room planning, Simple techniques, Home resilience and Rewards. A climate section explains the purpose of reducing energy demand, and FAQs cover starting points, accounts, estimates, bill processing and guidance scope.

### 2. Answer questions about your room

The assessment presents one question at a time and builds a live 3D room preview as you answer. It asks about:

- When the room feels hottest, its floor, and what is directly above it.
- The number of windows, their compass-facing walls and external shade.
- Whether ceiling or roof insulation is known to be present.
- Fans and air conditioning, including equipment type and relevant placement details.

The questionnaire adapts to your answers. One to four windows each get their own direction question; an unknown count or more than four uses a room-wide direction question. Fan questions appear when you report a fan, and wall placement appears for wall-mounted or window-mounted ACs. The preview supports up to four windows.

Choose **Not sure** when a detail is unknown. **Why this matters** explains how an answer is used. Once the core questions are complete, **See my assessment** lets you continue; optional questions can refine cooling use, budget, permissions, window coverings, opening constraints, location and comfort.

If you want to describe the problem in your own words, optional question assistance can suggest a relevant question from the app's defined list. It does not automatically turn your description into confirmed room facts.

Guest answers save in the same browser. Signed-in users can save their journey to their account across devices. **Reset questionnaire** asks for confirmation before clearing the current guest or signed-in journey, including its assessment, diagram, plans and check-ins.

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

You can refine your answers or continue to room improvements.

### 5. Explore room improvements

Improvement cards lead with your reported room context, a practical next action, checks to make and source links. Depending on eligibility, you may see window shading, ceiling insulation, window-opening or comparable AC replacement investigations. The app can show fewer options when the evidence or permissions do not support them.

Choose **Personalise my recommendations** for an optional internet search of Australian government guidance. The model selects relevant practical techniques and investigations and writes concise cards with room context, possible benefits, next actions and checks. Simple techniques appear first; the main generated grid shows the returned subset rather than a fixed list. Rooms without equipment or upgrade investigations can still receive practical guidance. A loading skeleton appears while the search runs, and reviewed starting points remain available if it fails.

Equipment constraints are enforced in both prompts and server/browser validation: if AC is not explicitly reported, recommendations cannot mention it or suggest AC replacement. Fan advice requires a reported fan. Sources are searched through Your Home and energy.gov.au, with Energy Rating included when AC is reported. Financial calculations remain deterministic and separate from generated guidance.

Use **Set a budget** or **Change budget** to refine your spending limit. A budget alone does not establish an installation price or savings. Choosing an investigation selects a next step; it does not commit you to purchasing or installing anything.

Optional sections provide more detail:

- **What could window shade save?** For eligible shading investigations with bedroom-only AC, a three-step scenario compares the same room before and after shading. Enter window area, direction and glazing, choose shading assumptions, and review your cooling schedule and tariff. Explicitly opt into synthetic hot-day weather and editable example room assumptions, then confirm the assumptions to see selected-period costs and electricity differences. Results, assumptions and optional scoped installed cost carry into your saved plan; edits invalidate the prior result. There is no automatic annualisation or payback. Rooms without AC receive qualitative guidance without an invented avoided AC bill. See the [shading scenario contract](contracts/shading-scenario.md).
- **Compare costs and savings:** the guided AC replacement comparison described below.
- **Understand your cooling costs:** your baseline, inputs to confirm and, when supported figures exist, a spending explanation.
- **Explore a cooling scenario:** the separate experimental temperature and cost tool.

Select an investigation, then choose **Continue to my plan**.

#### The guided AC comparison

For an eligible AC replacement investigation, **Compare costs and savings** opens four focused steps:

1. **Your current AC:** indoor/outdoor model numbers, cooling capacity, yearly label cooling energy and a label link.
2. **The replacement:** the equivalent details for the proposed system, with help finding the right energy-label figures.
3. **Rate & quote:** your flat electricity usage rate, installed price, quote provider/inclusions/date and any extra yearly costs.
4. **Your comparison:** the two systems side by side, required comparability confirmations and supported results.

Details and your current step save automatically. Use **Finish later** to return when you have the remaining information. Blank values remain unknown; zero recurring costs must be entered explicitly when applicable.

The method compares two distinct, equal-capacity, comparable **non-ducted single-split AC systems** using current Zoned Energy Rating Labels for a confirmed **Average climate zone**. It also requires installer confirmation of sizing and comparable features, bedroom-only system scope, installation permission, dated references and a scoped quote. Optional sourced service-life information helps assess payback.

When those checks are complete, the app shows annual label electricity costs, annual net savings, installed price and simple payback where calculable. Negative savings appear as a higher annual cost. Missing details produce an explanation of what still needs checking.

This is a comparison under standard annual label conditions, **not a prediction of your household's actual savings**. Labels and quotes are transcribed by you and are not independently verified. See the [financial method](financial-method.md) for applicability and limitations.

### 6. Save a room plan

Your selected investigation becomes **My room plan**, with a room view, plan summary, practical checklist and supporting assumptions/evidence. Checklist items help you gather information, confirm constraints or arrange the next step; checking them does not prove that installation has occurred.

The **Heatwave-Ready** section groups a few reviewed actions into **Before the hot day**, **During peak heat** and, where supported, **When it’s cooler outside**. Selection is deterministic and uses existing room/equipment eligibility and knowledge-base entries, without a provider call. Curtains and equipment advice require reported coverings/equipment; shading preparation requires an eligible shading investigation. Window-opening advice requires reported opening ability and an explicit no-known-limits answer; reported or unknown constraints omit it. Outdoor temperature, air quality, humidity and security must still be checked each time. With missing facts, only a general reviewed action about avoiding extra indoor heat appears.

These are preparation guides, not weather forecasts or heat-health assessments. They predict no personal savings or temperature reduction. Guidance is derived from the retained assessment when reopening the plan, rather than stored as a new snapshot or tracked with separate completion boxes. The existing longer-term checklist, plan history, check-in and calendar export are unchanged; follow-up notes can record hot-day actions tried.

Choose a check-in in **7 days**, **14 days**, or on a custom date. You can also save without a date. Choose **Save my plan** to preserve the plan and its financial/evidence snapshot. Guest plans remain in this browser; signed-in plans sync to the configured account database.

With a saved plan and check-in date, **Add to calendar** downloads an `.ics` event that you can import into your calendar. The app itself does not send email, SMS or push reminders. Changing the date in the app does not update an event already imported into a calendar.

### 7. Return and record what happened

Open your saved plan and continue to check-in. Record **Not started**, **Started**, **Completed**, **I'm stuck**, or **Deferred**.

If you are stuck, record a barrier such as cost, permissions, installation, time or uncertainty and review a smaller next step. For completed work, you can record the completion details, actual spending, cooling use and comfort, with optional energy readings and period information. Choose **Save update** to save the check-in.

Before/after usage is shown only when both records and comparable-use confirmation are supplied. Comfort ratings use a 1–5 scale and need comparable conditions and times of day. Weather, behaviour and other changes can affect the result, so these observations do not prove the selected action caused a saving or comfort improvement.

Material changes to your room or comparison inputs require reviewing the selection and saving a revised plan. Earlier saved plan snapshots and check-ins remain available in history until the assessment is reset.

## Simple techniques knowledge base

Open **Explore more → Simple techniques** in the navigation or **Browse simple techniques** on the cooling options page. The `/knowledge-base` library contains 14 researched techniques for a room or house:

- Close curtains before direct sun arrives; add external shade; grow suitable shading plants.
- Use cooler outdoor air, seal unwanted gaps and check insulation with qualified help.
- Use fans for occupied spaces, cool rooms in use, choose a comfortable thermostat setting and clean AC filters.
- Choose LEDs, switch off unnecessary electronics, air-dry laundry and shift heat-producing chores away from peak heat.

Search the library or filter by focus and effort. Each entry explains its energy-saving mechanism and expands into practical steps, suitability checks and links to Australian government guidance. Entries were reviewed on **3 October 2026**; the date records our review, not the source's publication date.

The catalogue is checked into `src/features/knowledge-base/catalogue.ts` and renders without a provider request. Live recommendation research receives relevant entries with their steps, checks and source links. It can generate up to four practical technique cards independently of upgrade investigations, plus up to three matching guide links per investigation. The app validates IDs against the room and equipment reports and owns the library links. Reviewed resources remain distinct from freshly searched sources and do not establish personal savings, emissions or temperature predictions. Review linked sources when updating entries.

## Home resilience: prepare for more than heat

Open **Explore more → Home resilience**, or visit `/explore`. The library contains 15 preparation guides across heatwaves, floods, storms, bushfires and earthquakes. Browse all topics, select a hazard, search for a preparation or filter by everyday actions, planning and professional help.

Each card gives you a preparation timeframe, three numbered actions, items to have ready or questions for a professional, an expected practical benefit and an important safety check. Expand the card for official Australian source links. The photos illustrate home care; they do not show a risk assessment of your property.

Examples include planning a flood evacuation route, preparing important belongings for higher storage, securing loose outdoor items before storms, preparing a bushfire leave plan and arranging professional checks for vulnerable building elements. Heatwave guides connect to window shading, safe use of cooler outdoor air and a backup cool place.

The catalogue lives in `src/features/resilience/catalogue.ts`. Sources include NSW Health, Your Home, NSW SES, Victoria SES, NSW Rural Fire Service and Geoscience Australia, reviewed on **4 October 2026**. This is preparation guidance, not live warnings or a property-specific hazard assessment. Earthquakes are geological hazards, included for broader home resilience rather than as a consequence of climate change.

## Rewards and the marketplace

Visit `/rewards` to learn how supported tasks earn task coins. Sign in and save an eligible room assessment to see relevant tasks, submit requested photos and review the result. Automated assessment checks the task's visible criteria; accepted submissions receive a fixed app-defined coin amount. A task can only earn its award once, and unsuccessful submissions explain what needs another look.

The account keeps a private approval and coin history. This is an engagement feature: photo approval does not measure energy savings, certify an installation or establish a carbon reduction.

At `/marketplace`, browse home-efficiency products, follow real retailer links and use the app's coin balance for clearly labelled demo coupon redemptions. **The generated codes are demonstrations: no retailer accepts them, and they issue no real discount or order.** See [Home Rewards](home-rewards.md) for setup and the detailed flow.

## Energy Assistant

Open **Energy Assistant →** in the header, or visit `/energy-assistant`. Choose **Analyse my electricity bill** or **Ask an energy question**. The general assistant answers qualitative household-energy questions; bill analysis is its first specialised capability.

Upload a digital electricity bill with selectable text (PDF only, up to 4 MB / 12 pages). Server-side `unpdf` extracts embedded text, then the existing OpenAI credential is used with `gpt-6-luna` to extract supported values and short bill excerpts. No OCR is included: scans, damaged or password-protected PDFs fail gracefully. Review the important values, correct any errors, then confirm. Missing fields stay unknown and zero stays zero. Recognisable partial bills proceed to review; missing figures remain unknown. For itemised bills, the app can add a complete set of supported import rows in code, excluding solar exports, and show the calculation for confirmation. Imported kWh plus usable billing days or dates are required for the daily average. Multiple tariffs remain separate, with no averaging. Retry a failed upload; corrections are available after extraction.

Answer up to five contextual questions about occupancy, major loads and relevant usage. The assistant branches on your reported equipment, allows unsure/skip, and summarises confirmed imported electricity, billing days and deterministic kWh/day. If only dates are available, the displayed calculation counts both endpoints; check your bill's convention. Imported bill electricity remains unallocated to appliances and rooms. There are no arbitrary high/low benchmarks, personal savings, payback or equipment consumption estimates. A second structured LLM call reads the **full bill text**, confirmed figures, corrections and household answers. It explains relevant charges, tariffs, meter notes, credits and uncertainties, then suggests up to three practical actions with relevant reviewed technique links. Bill observations retain source excerpts. Confirmed figures and deterministic starting points remain usable if this explanation fails, with a retry button.

This page keeps ten recent chat messages and the active bill/household answers in component memory only. **New chat**, refreshing or leaving resets them. It doesn't write bills or chat to localStorage or a database, or intentionally persist original PDFs or extracted text. Bill text and general questions are sent to OpenAI with `store:false`; provider processing/retention policies still apply. Use redacted bills where possible. No new API key or environment variable is required; the existing hosted usage-control guard still applies. Without provider access, the original planner remains available; general chat offers retry and the sourced library. See the [Energy Assistant contract](contracts/energy-assistant.md).

## Independent document review

Visit `/document-import` to read an electricity bill, AC energy label or installation quote from PDF, JPG or PNG (up to 4 MB / 12 PDF pages). The page shows proposed values alongside their page/excerpt, printed unit and climate/period basis. Confirm, correct or reject every field before finishing; missing or ambiguous values stay unknown. You can download the reviewed JSON and reopen edits.

The feature stays separate from assessment screens and never writes to their storage. Printed cents, monthly charges and label climates remain raw proposals; no conversion, cooling-consumption allocation, savings or payback calculation occurs. Files are processed in memory using the existing `OPEN_AI_KEY`, OpenAI structured extraction and `store:false`; provider retention policies still apply. Failure offers retry without altering an assessment. See the [API examples, limits, fixtures and review contract](contracts/document-import.md).

## What the 3D room represents

The diagram gives your answers a visual reference: window directions, roof context, coverings and cooling equipment. You can rotate it, zoom, reset the view and switch to 2D. Equipment and window labels follow your reported details.

Furniture, finishes, dimensions and exact spacing are illustrative. The optional airflow animation is a visual preview, not a physical airflow or temperature simulation. The diagram does not establish consumption, installation suitability or savings.

## Experimental 24-hour cooling scenario

Open the simulator from **Explore a cooling scenario**, or visit `/thermal-scenario`.

Enter explicit room, heat-transfer, ventilation, AC and tariff assumptions plus 24 hourly outdoor-temperature and solar-gain pairs. Alternatively, choose **Load a synthetic example** to explore clearly labelled demonstration data. Try assumed changes to shading, insulation or night ventilation and choose **Compare this day**.

The tool compares a simplified single-room heat balance. Temperature curves use AC-off runs; separate AC-on runs calculate cooling electricity and cost for the supplied conditions. Inputs are page-local, reset when you leave, and do not become confirmed room facts or supported annual savings.

It is an uncalibrated what-if model, not a weather forecast or validated building prediction. It does not model detailed airflow, humidity or neighbouring rooms, and it does not calculate annual savings or payback. See the [thermal scenario documentation](contracts/thermal-scenario.md).

