# Home Heat Planner Product Requirements Document

Status: Draft for hackathon implementation  
Date: 1 October 2026  
Primary track: Resilient Cities and Buildings  
Initial audience: Homeowners in Greater Sydney  
Initial assessment scope: One bedroom in an existing home

Home Heat Planner helps a homeowner decide which bedroom cooling improvement is worth paying for. It compares current cooling costs, upfront improvement costs, supported potential savings and simple payback while accounting for comfort and practical constraints. Follow-ups help the user complete the chosen improvement and review actual costs, usage and comfort. This PRD defines the core prototype, its acceptance criteria and the limits of its estimates. Computer vision is an optional extension described in the final section.

## Product objective

Help a Greater Sydney homeowner choose a suitable cooling improvement by understanding its upfront cost, potential running-cost savings and simple payback, then support follow-through and review.

The central user question is:

> Before I spend money on cooling, which change is worth paying for, and what could it save me?

The user should leave knowing:

- What their current cooling use costs over a stated period, where sufficient inputs are available.
- What each suitable improvement costs, what it could save and how long it could take to recover its upfront cost, where evidence supports those estimates.
- Which aspects of their room may contribute to the problem, and which unknowns affect the comparison.
- What they can do next, including any information, permission or professional assessment required.
- When they will revisit the plan, how to record progress and what to do if they get stuck.

Financial value is the primary motivation. Comfort, suitability and affordability remain essential constraints. The prototype supports decisions; estimates do not certify a building's performance or guarantee savings or a temperature reduction.

## Problem and product hypothesis

A homeowner may know that a room gets hot without knowing whether to spend on shading, insulation, existing cooling or replacement equipment. General guidance can be difficult to translate into upfront costs and ongoing bills for a particular room. Our product hypothesis is that a credible financial comparison, with comfort and practical constraints visible, will make that decision easier and encourage action.

Existing assessment services and home upgrade platforms already provide guidance and recommendations. Our proposed distinction is a focused journey from a specific room complaint to a transparent spending decision, followed by completion and a review of costs and comfort. This distinction and customer demand have not been market validated. The hackathon will demonstrate the workflow and test its behaviour; it will not claim verified adoption or environmental savings.

## Primary user and use case

The primary user is a homeowner in Greater Sydney who has a bedroom that feels uncomfortably hot and is considering practical improvements. They may not know building terminology or details such as insulation quality. Ownership does not imply permission to modify every part of a property; apartments and shared building elements may require additional approval.

Example user statement:

> My bedroom gets hot and the air conditioner runs for hours. Would improving the room be worth the money, or should I consider replacing the air conditioner?

The first release covers one room and one assessment at a time. Renters, builders, council planners, whole-home renovations and national coverage are future audiences or scopes.

## Scope and priorities

| Priority | Capability | Requirement |
| --- | --- | --- |
| Required | Guided room assessment | Collect the complaint, room details and constraints through text and structured controls. |
| Required | Adaptive clarification | Ask relevant follow-up questions and allow explicit unknown answers. |
| Required | Confirmed room profile | Let the user review and correct the facts used by the planner. |
| Required | Evidence-backed explanation | Explain plausible contributors using relevant sources and visible assumptions. |
| Required | Current cooling cost | Calculate a baseline over a stated period from traceable consumption and tariff inputs, or clearly explain missing information. |
| Required | Financial comparison | Show up to three suitable options with upfront costs, supported potential savings, simple payback and comfort trade-offs. |
| Required | Personal action plan | Create a checklist for one selected action and preserve the assessment. |
| Required | Input changes | Reassess when the user edits a fact, budget or permission. |
| Required | Follow-up and review | Set a check-in date, offer a calendar reminder, help resolve barriers and review completed work, costs, usage and comfort. |
| Optional | Voice | Offer speech input and spoken explanations while retaining the full text flow. |
| Optional | Computer vision | Add photo assistance only after the core journey works; requirements appear at the end. |

The core release excludes hourly indoor-temperature simulation, guaranteed savings or cooling predictions, emissions predictions, automated floor-plan reconstruction, product marketplaces, live quote comparison, contractor booking, finance applications, sensor hardware, custom model training, badges, streaks, leaderboards and social sharing.

## Core user journey

1. **Describe the problem.** The user enters a suburb or postcode, selects the bedroom and describes when it becomes uncomfortable.
2. **Provide room and cooling details.** The app collects relevant room information, current cooling use and electricity price, asking targeted follow-ups.
3. **Confirm the profile and baseline.** The user reviews facts, unknowns, budget, permissions and the inputs used to estimate current cooling costs.
4. **Understand the assessment.** The app explains plausible contributors and identifies the evidence needed to estimate the benefit of each action.
5. **Compare financial value.** The user compares upfront cost, potential savings, payback and comfort trade-offs for up to three eligible actions. They can inspect assumptions and edit inputs to see the comparison update.
6. **Choose a next step.** The app creates a practical checklist for the selected action or for obtaining missing information.
7. **Set a check-in.** The user chooses when to revisit their action and can download a calendar reminder. The app saves their plan and date in the same browser.
8. **Follow through and review.** At the check-in, the user identifies obstacles or records completion and actual spending. After a completed change, the app invites a review of cooling use and comfort over comparable periods.

The core screens are an introduction, guided assessment, profile and baseline review, financial comparison with supporting explanations, and saved action plan with a follow-up review. These are required product states rather than prescribed visual designs.

## Assessment inputs

| Input | Collection and handling |
| --- | --- |
| Location | Suburb or postcode in Greater Sydney. A full street address is unnecessary. Ask the user to confirm an ambiguous location. |
| Heat timing | Morning, afternoon, evening, overnight, multiple periods or unsure; accept a natural-language description. |
| Goal | Capture the spending decision, such as reducing cooling bills while retaining evening comfort, and whether equipment replacement is being considered. |
| Room position | Ground floor, upper floor or unsure; whether the room is directly below the roof or another dwelling. |
| Window orientation | Collect each relevant window's direction when known. Do not infer compass direction from a room description. |
| Existing shading | Ask about external shading and internal coverings. Distinguish absent, present and unknown. |
| Insulation | Ask whether ceiling or roof insulation is known to exist; retain unknown when it cannot be confirmed. |
| Openings and ventilation | Ask whether windows open and whether there are constraints such as security, noise or outdoor conditions. |
| Existing cooling | Record fans, air conditioning, whether the system serves only this room, and how it is used. Collect a model identifier or consumption information when available. |
| Cooling energy use | Prefer cooling-specific kWh for a stated period, or explicitly sourced or user-assumed average electrical input power and operating hours. Whole-home bills cannot automatically be attributed to this bedroom. |
| Tariff and period | Record the electricity usage rate in AUD/kWh and the number of cooling days or measured date range. The initial calculator supports a flat usage rate. |
| Improvement cost | Accept an installed quote, user-entered estimate or sourced range with inclusions and date. Capture recurring costs where relevant. |
| Replacement alternative | If the user is considering replacement AC, collect model-specific consumption assumptions and an installed quote where available. Retain unknowns. |
| Budget | Accept an AUD amount, a user-selected range or unsure. Separate spending now from a larger improvement to investigate. |
| Permissions and preferences | Record restrictions on external or shared-building changes and the user's willingness to obtain quotes or arrange professional work. |

Not every field must be answered before the user receives value. The app should request information only when it affects a potential action or explanation. Unknown data must remain unknown throughout storage, assessment and display.

## Functional requirements and acceptance criteria

| Requirement | Acceptance criteria |
| --- | --- |
| FR1 Guided intake | Users can complete the core flow with text and controls. They can skip questions using an explicit unknown option. |
| FR2 Adaptive questions | Questions come from a defined set. The app avoids asking for information already confirmed and presents one follow-up at a time. |
| FR3 Profile review | Facts extracted from free text are shown for correction. Conflicting answers trigger clarification rather than silent replacement. |
| FR4 Contributor explanation | Each explanation identifies the user facts it relies on, supporting guidance and relevant unknowns. It uses conditional language where the cause has not been established. |
| FR5 Suitable actions | The planner checks action conditions, permissions and known costs before presenting options. It can return fewer than three options when evidence is insufficient. |
| FR6 Cost honesty | Numeric costs have a source, scope and date. Missing prices display as quote required or cost unknown and are never presented as within budget. |
| FR7 Comparison | Options show upfront cost, supported savings and simple payback alongside suitability, comfort trade-offs and required checks. Unknown values remain visible. If no responsible action can be selected, the app prioritises obtaining missing information. |
| FR8 Editable results | Changing a relevant input updates the assessment and explains the reason. Unrelated input changes do not produce arbitrary changes. |
| FR9 Action plan | The selected option produces concrete next steps and prerequisites. Users can save, revisit and change their choice. |
| FR10 Completion and review | Users can mark an action as planned, started, completed or deferred, record actual spending and optionally review usage and comfort. Self-reported information is labelled accordingly. |
| FR11 Recovery | When an API fails, entered information remains available. Users receive a retry option or continue through the structured form. |
| FR12 Follow-up | Users can choose, change or clear a check-in date and download an optional calendar reminder. On returning, the app shows whether the check-in is due. It does not promise a notification unless a delivery mechanism is actually enabled. |
| FR13 Barriers | A check-in can capture cost, permission, installation, time or uncertainty barriers and offer a relevant smaller next step. |
| FR14 Baseline and savings | Calculate running costs and savings in code. Action-specific energy reductions require an applicable documented method or source; user-selected what-if assumptions are identified separately. |
| FR15 Payback | Calculate simple payback only when upfront cost and positive annual net savings are supported. Handle missing, zero and negative savings without displaying a misleading return period. |
| FR16 Estimate provenance | Users can inspect the baseline, comparison period, tariff, intervention assumptions, recurring costs, evidence and calculation method. Unsupported effects never become precise numbers. |
| FR17 No existing cooling | Users without relevant cooling expenditure can still compare improvement costs and comfort considerations. The app does not invent an existing bill or savings against it. |

## Financial comparison and savings

Financial comparison is a core feature. Each option card should lead with upfront cost, potential running-cost savings over a clearly stated period and simple payback where calculable. It must also explain suitability, the expected type of comfort benefit, evidence limitations and the next step. An option can be useful even when its financial return is unknown or poor.

### Current cooling cost

Use cooling-specific measured energy where available:

`Cooling electricity cost = cooling energy in kWh × AUD per kWh`

If measured energy is unavailable, a scenario may use sourced or explicitly assumed average electrical input power:

`Cooling electricity cost = average electrical input in kW × hours per day × cooling days × AUD per kWh`

Record whether each input is measured, sourced, user-reported or assumed. Cooling capacity is different from electrical input power; advertised cooling kW must not be used as electricity draw. Rated input power is not automatically average consumption. Shared systems and whole-home bills require attribution evidence before claiming a bedroom-specific baseline. If inputs are missing, show the missing information and allow the user to continue with non-quantified comparisons.

The initial calculator supports a flat electricity usage rate. It excludes fixed supply charges, time-of-use tariffs and solar opportunity costs. Use the same baseline, period and tariff for comparable options.

### Potential savings from an improvement

Select one or two initial improvements for which an applicable documented savings method can be established during implementation. A source must support the particular effect being calculated and state the relevant climate, building, equipment and operating assumptions. General statements that shading or insulation help do not supply a numerical energy-reduction factor. OpenAI and Jev must not invent these factors.

Where evidence supports an estimated change in energy use, calculate baseline and post-improvement energy costs in code. Include additional energy use and recurring operating costs where relevant. Show a supported range or clearly stated scenarios; do not present arbitrary ranges as statistical confidence intervals.

Keep three result types visibly distinct:

| Result type | Meaning and display |
| --- | --- |
| Supported estimate | An applicable documented method connects the improvement to estimated energy use. Display the range or result with its inputs, method and limitations. |
| What-if scenario | The user changes assumed operating hours or energy use. Label the output as conditional on that assumption, without attributing it to an improvement. |
| Insufficient evidence | Required consumption or intervention evidence is absent. Show savings as unavailable and explain the next information-gathering step. |

For example, an illustrative 1 kW average electrical input at AUD 0.30/kWh costs AUD 54 over 30 cooling days at six hours per day, or AUD 36 at four hours per day. The AUD 18 difference is a what-if result; it does not establish that shading saves two AC hours per day. These are demonstration assumptions, not default household estimates. Annual figures require a supported or explicitly assumed annual cooling schedule, rather than multiplying a summer month by twelve.

Combined improvements may interact. Do not add their individual savings unless the method supports the combination. Preserve the same comfort objective in comparisons; reducing cooling while accepting a less comfortable room must be disclosed as a trade-off.

### Upfront costs and simple payback

Show installed improvement costs separately from running costs, using a user quote or sourced range with inclusions and date. Do not imply that an unpriced option is affordable.

`Annual net savings = baseline annual operating cost − proposed annual operating cost − additional annual recurring costs`

`Simple payback in years = upfront improvement cost ÷ positive annual net savings`

Avoid double-counting recurring costs already included in operating costs. Label payback as a simple, undiscounted estimate under the displayed assumptions; it excludes financing and future price changes. A zero-cost action has no upfront cost to recover. Zero or negative net savings has no positive financial payback under that scenario. Missing inputs produce no payback figure. If the estimated payback exceeds a supported expected service life, flag that limitation rather than presenting the option as a good financial return.

### Comparing an air conditioner replacement

When relevant evidence is available, compare room improvements with a model-specific replacement option using comparable service and climate assumptions. Show installed costs and operating costs separately. A larger unit must not automatically receive higher bills or be labelled inferior; appropriate sizing, efficiency and the building's cooling needs matter. [YourHome heating and cooling](https://www.yourhome.gov.au/energy/heating-and-cooling).

Replacement comparison can remain unquantified when equipment data or a quote is missing. The product must support the user's spending decision without assuming that an improvement always beats suitable cooling equipment.

### Delivery priority

Establish the baseline calculator and the evidence method for at least one narrowly defined improvement before expanding the catalogue or adding optional features. A generic usage slider alone does not fulfil the action-specific savings objective. If no defensible intervention estimate can be established within the hackathon, disclose that gap and describe the delivered feature as a cost scenario explorer; do not claim that personalised improvement savings have been implemented.

## Follow-up and review

The follow-up feature is called **My Cooling Plan**. It helps the user complete the chosen improvement, record actual spending and review cooling use and comfort. Its role is practical support for the financial decision.

### Plan and check-in

When selecting an action, save the financial comparison and its assumptions, then let the user choose a realistic first step and check-in date. Offer a seven-day suggestion that can be changed or skipped. Capture optional baseline comfort using a consistent scale, the time of day and cooling use.

The hackathon version saves the date and plan in the browser, shows a due check-in when the user returns and offers a downloadable calendar reminder. The user must import that reminder into their calendar for an alert outside the app. Its description should contain a generic return link and avoid personal home details. Email, SMS and push notifications are future integrations requiring a delivery service and explicit opt-in.

At the check-in, ask whether the user completed the first step, started work, completed the change or wants to defer it. If they are stuck, ask what prevented progress and provide a relevant response:

| Barrier | Product response |
| --- | --- |
| Too expensive | Revisit the budget and surface a supported lower-cost action or an information-gathering step. |
| Permission needed | Help prepare a concise request or a list of questions for the relevant owner or building manager. |
| Unsure what to buy or arrange | Explain specifications or questions to ask an installer using the reviewed guidance. |
| Not enough time | Offer a smaller next step and let the user choose a new date. |
| Change did not help | Gather context, review the original assumptions and reconsider the plan. |

OpenAI can explain the next step using confirmed facts and retrieved guidance. The app can handle structured barrier choices directly; an additional model call is unnecessary when the user has already selected an explicit category.

### Reviewing costs and comfort

After completion, let the user enter actual installed cost, the completion date and any available cooling-specific energy readings or operating records. Invite a comfort review using the same scale and time-of-day questions as the baseline. Preserve the original estimate so users can see how actual spending and reported use compare with it.

A lower bill alone does not establish savings caused by the improvement. Changes in weather, occupancy, tariffs, other appliances and cooling habits affect comparisons. Label simple before-and-after changes as observed or self-reported differences. Claim attributed savings only if an appropriate comparison method has been implemented and its limits are explained. Users can revise the plan when comfort does not improve or costs differ from expectations.

## Recommendation content and evidence

Start with one or two narrowly defined improvements whose financial estimates can be supported. Candidate action families include window shading, suitable use of existing openings, fan-based comfort measures and investigating ceiling insulation. Catalogue inclusion and numerical savings eligibility are separate decisions: an action may have useful qualitative guidance without sufficient evidence for a savings estimate.

Each catalogue entry must contain:

- An action identifier and plain-language description.
- The room facts and conditions needed to consider it.
- Permission requirements, relevant exclusions and information to confirm.
- A supported explanation of the mechanism and its limitations.
- Effort and cost information, with assumptions and sources where available.
- The energy-effect method, applicability conditions, input requirements, recurring costs and provenance needed for any numerical savings or payback calculation.
- A practical first step and any professional assessment required.
- Source URLs, source excerpts, review date and content version.

Use Australian government guidance such as YourHome as the initial evidence base. Relevant guidance must be retrieved before an explanation is generated. The app must not invent references, prices, hidden construction details or numerical cooling benefits.

First filter options for suitability and permissions, then compare known affordability, supported net savings, simple payback and readiness to act in line with the user's goal. Avoid one opaque score that hides these trade-offs. Unknown price, savings or permission must remain visible; an unquantified option may be presented for investigation without being labelled the best financial choice.

Model confidence is an internal signal for deciding when to clarify. It must not be shown as a probability that a room has a particular physical fault or that an action will succeed. Recommendations involving ventilation must preserve the outdoor-condition and other applicability constraints in their source guidance.

## AI roles and technical approach

| Resource | Role in the core prototype |
| --- | --- |
| OpenAI API | Extract structured facts from conversation, generate understandable explanations from retrieved evidence and draft the selected action checklist. The available budget is $250. |
| Jev from TypeSafe AI | Use bounded classifications to identify the reported complaint and select the next relevant question from a fixed set. Include unclear or unknown outcomes. |
| Application logic | Validate inputs and model outputs; apply documented energy-effect methods; calculate baseline costs, savings and payback; resolve eligibility, permissions, catalogue retrieval and saving. |
| Codex | Build the interface and application directly, implement integrations and verify the complete flow. |
| ElevenLabs | Optional transcription and text-to-speech, using the available 50,000 credits subject to account access and actual consumption. |

The server prepares relevant context, calls the appropriate model and validates the response before it changes application state. API keys stay on the server. Jev's first integration is limited to adaptive intake; broader scoring or source checking is optional and must earn its place through testing. Arithmetic, documented numerical methods and explicit eligibility checks remain in code. Models explain the calculated results and must not invent savings, payback periods or energy-reduction assumptions.

The prototype does not need account creation. It can persist a room profile, financial inputs and their provenance, calculated comparison, selected action, check-in date, completion status, actual spending and optional usage and comfort records in the user's browser, with a clear reset or delete option. Store only information needed for the journey. Backend logs should contain operational diagnostics without unnecessary room descriptions or personal details. A manual questionnaire must remain available if adaptive intake is unavailable. Calendar export can provide an external reminder without building an account or messaging system; imported reminders are managed in the user's calendar.

## Quality and operational requirements

- The interface must work on mobile and desktop, use plain language and provide accessible labels, keyboard controls and readable comparison cards.
- Display loading and retry states and preserve answers during failed requests.
- Proposed performance target: show a result within 15 seconds under normal demo conditions. Measure this during implementation; it is not an established model guarantee.
- Proposed journey target: complete a basic assessment and select a next step in about five minutes, excluding time spent finding missing home information.
- Track API usage and enforce configurable request and spending limits. Voice must be optional, and repeated unchanged assessments should avoid unnecessary calls.
- Every recommendation and financial estimate must be traceable to confirmed inputs, their provenance, a catalogue or method version and evidence references. Calculation results must be reproducible independently of generated wording.

## Success measures

These are prototype acceptance targets, not claims of market validation.

| Measure | Target or interpretation |
| --- | --- |
| Complete journey | At least one narrowly defined, evidence-supported improvement reaches a baseline, action-specific savings comparison, payback where meaningful and a saved plan. Missing-data scenarios produce useful information-gathering steps. |
| Constraint compliance | No tested case presents an action as affordable or permitted when its known constraints contradict that claim. |
| Evidence coverage | Every substantive recommendation has a relevant source and exposes important unknowns. |
| Personalisation | Relevant edits produce explainable changes; repeated unchanged inputs preserve material conclusions. |
| Recovery | An API failure does not erase the profile or prevent access to the manual flow. |
| Follow-up completion | In observed test sessions, record the proportion of saved plans that receive a check-in and a user-reported first step or completed improvement. Wider measurement would require consented aggregate event collection. Treat any observed rate as prototype usage, not evidence of causality. |
| Financial correctness | Baseline, savings and payback calculations pass reference examples and edge cases. No action-specific savings claim relies only on a user-adjusted usage slider. |
| Cost transparency | Every cost comparison exposes its inputs and evidence type and correctly handles missing data, zero usage and increases as well as decreases in cost. |
| Early user outcome | Record actual spending, optional usage and comfort feedback, and barriers. Observed differences do not by themselves establish attributed savings or emissions reductions. |

Longer-term impact would require evidence about completed changes, comfort, weather and energy use. The hackathon pitch may explain the intended pathway to climate resilience and reduced cooling demand, but must not report invented savings or adoption figures.

## Verification scenarios

After building begins, verify the complete journey against realistic scenarios. Example profiles are demonstration inputs, not a labelled training dataset.

1. **Afternoon heat with limited shading.** A user reports afternoon discomfort and an unshaded west-facing window. Relevant shading options can be considered with a source-backed explanation and confirmed permissions.
2. **Permission restriction.** The same profile disallows external changes. Restricted actions cannot be labelled ready to implement; the revised result explains the constraint.
3. **Unknown insulation.** An upper-floor room has unknown ceiling insulation. The app preserves that unknown and provides an inspection or information-gathering step when relevant.
4. **Budget change.** Reducing the budget changes affordability only where cost evidence exists. Unknown prices remain unknown.
5. **Already shaded window.** The user confirms effective existing external shading. The app avoids blindly repeating the same improvement and seeks other relevant information.
6. **Conflicting answers.** A conversation contradicts an earlier structured response. The app asks for confirmation before changing the profile.
7. **API outage.** Intake or explanation generation fails. The user retains their data and can retry or use the manual flow.
8. **Saved plan.** Reloading the same browser restores the confirmed profile, financial inputs and estimate version, selected action, check-in date and completion records. Deleting the assessment clears the app's stored information.
9. **Blocked improvement.** A user reports that the action is too expensive or needs approval. The check-in offers a relevant next step and allows rescheduling while preserving the plan history.
10. **Follow-up reminder.** A chosen date appears correctly in the saved plan and exported calendar event. Clearing an in-app date stops due prompts; the interface explains that an imported calendar event is managed separately.
11. **Baseline and what-if arithmetic.** The illustrative six-hour and four-hour scenarios calculate AUD 54 and AUD 36 respectively. Missing electrical input produces no personalised estimate; increased usage can produce higher cost rather than forced positive savings. The AUD 18 difference remains labelled as a what-if result.
12. **Unsupported improvement effect.** General shading guidance without an applicable energy-effect method produces no action-specific savings number or payback. The app requests relevant information or shows qualitative advice.
13. **Simple payback.** A calculation fixture with AUD 300 upfront cost, AUD 80 annual avoided operating cost and AUD 20 additional annual recurring cost produces AUD 60 annual net savings and five-year simple payback. These fixture values are not product claims. Zero or negative savings produces no positive payback; missing values remain unknown.
14. **Supported financial estimate.** For the selected improvement method, verify the baseline, post-improvement energy calculation, applicability checks and displayed bounds against an independently calculated reference case.
15. **No cooling baseline.** A user has no relevant existing cooling expenditure. The app compares upfront costs and comfort considerations without inventing savings against current bills.
16. **Post-improvement review.** A lower subsequent electricity bill with different weather or tariff is recorded as an observed difference, not automatically attributed to the improvement. Actual spending updates the comparison while preserving the original estimate.
17. **Interacting improvements.** Selecting two actions does not sum standalone savings unless the documented method supports their combination.

Review both the recommendation logic and generated wording. Passing these checks verifies prototype behaviour; it does not establish a measured cooling benefit.

## Hackathon demonstration and delivery

The main demonstration should fit within two minutes and work entirely through text:

- Start with a clearly labelled example homeowner profile, a hot-bedroom complaint and a current cooling-cost baseline.
- Show the confirmed inputs and compare upfront cost, supported potential savings, simple payback and comfort considerations for suitable actions.
- Open the assumptions and change a meaningful input such as tariff or an installed quote to show the financial comparison updating.
- Select an action and set its first step and check-in date.
- Open a clearly labelled simulated later check-in, enter actual spending and review reported usage or comfort. Do not imply that demo results represent a real completed improvement or verified savings.

The demonstrable deliverable is a working application with baseline cost calculation, at least one documented action-specific savings method, simple payback where meaningful, a short reviewed action catalogue, source links, follow-up and the verified scenarios above. Establishing a defensible savings method is a core implementation dependency. Voice and computer vision must not delay that deliverable.

The participant guide permits research and ideation before the event and requires building from scratch after the hackathon starts. This document is a planning deliverable. Generate application code, UI designs and demo assets only once building is permitted. Disclose external APIs, pretrained models, libraries, templates, datasets and AI assistance in the submission as required by the guide. The implementation handoff at the end records Monal's backend contract responsibility.

## Assumptions and unresolved decisions

- Homeowners' need for this particular workflow and the motivational effect of financial comparisons remain hypotheses.
- Vercel is available and is the intended application hosting platform. The frontend framework and exact OpenAI model will be chosen during implementation based on access and deployment feasibility. Codex will be used to build the interface directly.
- Jev access is available according to the supplied resource list; latency, accuracy and thresholds for our cases still need testing.
- Numeric price coverage may be limited. The core product must remain useful with quote-required actions and clear information-gathering steps.
- An applicable method and evidence for estimating the energy effect of the first one or two improvements still need to be selected. No intervention-specific savings factor has been established by this PRD. Baseline electricity arithmetic alone does not resolve this dependency.
- Availability of cooling-specific consumption may limit personalised estimates, particularly for shared systems. Explicit illustrative scenarios must remain distinguishable from supported household estimates.
- The initial rule catalogue needs review for climate applicability and interactions between actions. The prototype must not imply that every cooling measure fits every home.

## Reference sources

- [YourHome passive cooling](https://www.yourhome.gov.au/passive-design/passive-cooling) supports the initial cooling guidance and climate-dependent conditions.
- [YourHome shading](https://www.yourhome.gov.au/passive-design/shading) supports orientation-dependent window shading considerations.
- [YourHome heating and cooling](https://www.yourhome.gov.au/energy/heating-and-cooling) supports appropriate appliance sizing, efficiency comparisons and the role of building improvements.
- [NatHERS existing homes delivery model](https://www.nathers.gov.au/sites/default/files/2025-03/NatHERS%20for%20Existing%20Homes%20Delivery%20Model%20-%20March%202025.pdf) provides context for existing assessment and upgrade-advice services.
- [BOOM Power platform](https://boompower.com.au/platform) provides competitor context for home-upgrade recommendations and delivery connections.
- [TypeSafe introduction](https://docs.typesafe.ai/introduction) and [confidence documentation](https://docs.typesafe.ai/confidence) describe Jev's typed decisions and uncertainty signals.
- [TypeSafe documented limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13) supports keeping arithmetic and explicit checks in application code.
- [ElevenLabs transcription](https://elevenlabs.io/docs/overview/capabilities/speech-to-text) and [text-to-speech](https://elevenlabs.io/docs/overview/capabilities/text-to-speech) describe the optional voice capabilities.
- Participant Guide.pdf in this workspace is the source for hackathon scope, timing, build rules and submission requirements.

These sources support particular mechanisms or capabilities. They do not establish customer demand for Home Heat Planner or a quantified benefit for a particular home.

## Optional computer vision extension

Computer vision is an optional feature at the end of the product scope. The complete core assessment, recommendation and action-plan journey must remain usable without uploading a photo or running a CV model.

### Purpose and user flow

Help the user provide room information by proposing visible windows and shading features from photos. This can reduce manual description and make the assessment easier to understand.

1. The user optionally uploads a bedroom-window photo and an exterior view where available.
2. A pretrained detector proposes bounding boxes and labels for relevant visible objects.
3. The user confirms, corrects or rejects each finding; they can mark visibility as insufficient.
4. Confirmed findings update the room profile. Direction, permissions and hidden construction details still require separate answers.
5. The app regenerates options from the confirmed profile and explains any resulting change.

### Candidate models

| Option | Proposed use | Implementation priority |
| --- | --- | --- |
| Grounding DINO | Text-prompted candidate detection of windows and visible coverings or shading structures. Target categories must be tested on our photos. | Preferred separate CV component if deployment and response time are practical. |
| SAM 2 | Refine a user-selected point or detected box into an object outline. | Optional enhancement after detection and confirmation work. |
| OpenAI vision | Describe visible features and support photo-assisted intake through an API. | Simpler alternative if a separate CV service cannot be integrated reliably. |

The official [Grounding DINO repository](https://github.com/IDEA-Research/GroundingDINO), [SAM 2 repository](https://github.com/facebookresearch/sam2) and [OpenAI vision documentation](https://developers.openai.com/api/docs/guides/images-vision) describe these capabilities. Use pretrained models and disclose them; do not claim that the team trained them or that general capabilities establish accuracy on home photos.

### Requirements and acceptance criteria

- Photo upload is optional and requires an explanation of which service will process it. Provide a remove option and avoid retaining photos longer than necessary.
- Detection output is a proposal until the user confirms it. Failed or ambiguous detections lead to manual input.
- Draw overlays only where the selected method provides coordinates or masks we can validate; generic image descriptions do not establish precise localisation.
- The feature must not infer hidden insulation, glazing performance, compass direction, physical dimensions or exact cooling benefits from appearance alone.
- A photographic shadow describes the captured moment; it does not establish annual shading effectiveness. Do not generate a thermal heat map from a normal photograph.
- Correcting a visible feature updates recommendations only through the same reviewed rules used by the core app.
- After building begins, evaluate a small, varied set of roughly 10–20 authorised test photos for missed objects, false detections and response time. Include poorly lit, partially obscured and ambiguous cases.
- Accept the extension only if uploads, detection, correction and recommendation updates work end to end, and CV failure leaves the core product usable.

## Implementation handoff and backend contracts

The teammate available on Friday will use this PRD to build the complete app experience. Vercel is available for hosting. The full backend will be implemented later against agreed contracts; any temporary mock data or local persistence must be clearly identified.

Monal is responsible for defining and documenting the backend DTOs (Data Transfer Objects) alongside the app build so that the complete backend can be implemented later without redesigning the frontend integration.

- Define request and response DTOs for the core flows: room assessment, clarification answers, confirmed home profile, recommendations, financial comparisons, saved action plans and follow-up check-ins. Include optional photo-analysis contracts only if CV is implemented.
- Specify field names, types, required and optional fields, units, allowed values, identifiers and validation rules. Distinguish missing values from zero and record currency and calculation periods explicitly.
- Preserve the PRD's evidence requirements in the contracts: input provenance, assumptions, sources, calculation method version, estimate ranges and supported-estimate versus what-if versus insufficient-evidence status.
- Document the intended API operations, error responses and representative request and response examples. Keep API DTOs separate from database schema decisions.
- Make frontend service calls and any temporary mocks use the same contracts, with a clear integration boundary for replacing them with the complete backend later. Provider API keys must remain server-side even during the prototype.

The handoff deliverable is a checked-in contract specification with schemas or shared types and example payloads covering the core user journey. These contracts prepare the later backend implementation; they do not imply that persistence, authentication or production backend services have already been built.


## Authorised extension: thermal what-if scenario (3 October 2026)

The user requested addressing the lack of thermal simulation. A separate experimental 24-hour single-zone scenario is now permitted in addition to the core release. It requires explicit physical assumptions, offers only an opt-in labelled synthetic example, and never promotes results into supported savings or known room facts. No annualisation, payback, CFD or calibrated home-temperature claims. See `docs/contracts/thermal-scenario.md` for the model, limitations and acceptance checks. This overrides the earlier simulation exclusion only for this bounded experimental feature.


## Heat-reduction journey update - 3 October 2026

The AC-and-shading financial example remains the featured homepage demonstration. The product goal is to reduce bedroom heat and cooling energy while retaining comfort, with money as a motivation. Present eligible shading and insulation investigations, then ventilation review, then conditional AC replacement. Retain all four eligible paths rather than dropping a passive option to satisfy the earlier three-option limit. This is a reading order, not an effectiveness ranking. Core intake includes window coverings, opening ability and constraints before equipment questions. Every option has a mechanism, room evidence and a practical next step without requiring an AI call. AC label calculations remain separate; personal passive savings and emissions are not invented. Follow-up reviews comfort, usage and spending as observations.

## Dynamic recommendations update - 3 October 2026

The user requested room-specific recommendations generated through structured LLM responses. Optional research selects relevant practical techniques from the reviewed library and eligible investigations, with short generated explanations, energy/comfort mechanisms, actions, checks and retrieved sources. This supersedes displaying every candidate as a main generated recommendation. Rooms without AC receive no AC references, comparisons or replacement suggestions; unknown equipment is not assumed present. Reported fans, coverings and window-opening ability similarly constrain guidance. Reviewed starting points remain usable if generation fails. Existing financial methods, investigation selections and plan persistence retain their contracts; general techniques link to practical guides without adding unsupported numerical claims.


## Final positioning and Heatwave-Ready plan — 4 October 2026

The product story now leads with understanding overheating, keeping unnecessary heat out, reducing cooling demand and preparing for hotter days. This supersedes earlier whole-journey cooling/financial-first naming; equipment-specific cost calculations retain cooling terminology and their evidence rules. The existing AC-and-shading homepage scenario remains illustrative, with heat entry and reduced demand leading the story.

Add a small deterministic Heatwave-Ready guide inside the existing room-plan screen, alongside the selected longer-term investigation. Group a few applicable reviewed knowledge-base actions before a hot day, during peak heat and conditionally when outdoors is cooler. Reuse existing eligibility and source references. Require explicit reported equipment for equipment advice. Omit window-opening advice when opening ability or constraints are unknown or limiting; never assume night conditions are suitable. Missing facts permit only a restrained generally applicable reviewed starting point. Do not infer absent insulation, weather, health risk, performance or numerical benefits.

Guidance is derived from retained room facts on revisit; it introduces no new saved action IDs, completion state, DTO, provider calls or API. Existing investigation checklist, saved financial/evidence snapshots, history, calendar date and observational follow-up remain intact. The next action precedes supporting financial information. Follow-up notes can record preparation actions tried. No weather service, health prediction, savings percentage, temperature reduction or quantified climate-target contribution is added.


## Selectable everyday actions — 4 October 2026

User authorised simple actions as first-class plan items, alone or alongside one optional investigation. This supersedes the earlier investigation-only continuation requirement and guidance-only techniques restriction. Persist optional selectedTechniques (catalogue IDs, material assessment signature, recordedAt) in AssessmentDraft. Recheck room eligibility when projecting selections; changed material facts invalidate stale actions. Selected actions contribute reviewed checklist steps and evidence to the existing saved plan and observational follow-up. Technique-only plans have unknown financial comparison/cost, never zero or invented savings. Changes to selected actions archive prior saved plans. Equipment comparison remains optional; passive room investigations and practical actions lead the options screen.
