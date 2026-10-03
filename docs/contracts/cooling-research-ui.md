# Cooling research UI contract v4

The model selects relevant actions and writes concise room-specific content for two closed components: `improvement-card` for eligible investigations and `technique-card` for practical library actions. The app renders layout, icons, names, sources and controls. It accepts no generated HTML, CSS, scripts, arbitrary navigation URLs or event handlers. Candidate IDs are a bounded vocabulary, not a mandatory list to display.

```json
{
  "schemaVersion": 4,
  "suggestions": [{
    "component": "improvement-card",
    "optionId": "external-shading",
    "headline": "Keep afternoon sun outside",
    "whyForRoom": "You reported west-facing windows without external shade.",
    "potentialBenefit": "Could reduce sunlight entering your room.",
    "nextAction": {
      "label": "Confirm permission for exterior work",
      "detail": "Ask the responsible owner or strata manager about suitable external shading."
    },
    "checks": ["Check window access with an installer", "Keep light and ventilation in mind"],
    "sourceUrls": ["https://www.yourhome.gov.au/passive-design/shading"],
    "techniqueIds": ["close-curtains", "external-shade"]
  }],
  "techniques": [{
    "component": "technique-card",
    "techniqueId": "cooler-air",
    "headline": "Let cooler air release stored heat",
    "whyForRoom": "You reported windows that can open.",
    "potentialBenefit": "Could help release stored heat with suitable outdoor air.",
    "nextAction": {
      "label": "Check outdoor conditions before opening windows",
      "detail": "Open safe windows only when outdoor air is cooler and air quality is suitable."
    },
    "checks": ["Retain your security and noise constraints"],
    "sourceUrls": ["https://www.yourhome.gov.au/passive-design/passive-cooling"]
  }]
}
```

This is an illustrative contract example, not live evidence or a recommendation for a particular house. The server requires each cited URL to appear in the completed search's retrieved source list before returning it to the browser as `{url,title}`.

| Field | Purpose | Maximum characters / words |
| --- | --- | --- |
| headline | Scannable takeaway, distinct from the app-owned option title | 52 / 7 |
| whyForRoom | One sentence tied to reported room categories | 120 / 20 |
| potentialBenefit | Cautious qualitative benefit using may/could | 100 / 17 |
| nextAction.label | Verb-led label for one practical next check | 56 / 9 |
| nextAction.detail | One sentence explaining that check | 130 / 23 |
| checks | One or two unique prerequisites, each concise | 90 / 16 each |
| sourceUrls | One to three unique, retrieved government URLs | Validated HTTPS URLs |
| techniqueIds | Zero to three unique guides from the relevant app-reviewed library entries | Known IDs, validated for the option and room context |

The prompt specifies the role of each content slot and both length limits. JSON Schema enforces the component vocabulary, field shape, character limits, cautious benefit wording and array bounds. Citation URL enums contain only retrieved pages. Runtime validation additionally enforces word limits, rejects multiline copy and numeric claims, and verifies source provenance. These restrictions use the [supported Structured Outputs schema properties](https://developers.openai.com/api/docs/guides/structured-outputs). Missing facts stay unknown. The contract adds no financial inputs, performance predictions, installation ranking or permission assumptions.

The response adds `ok:true` and `retrievedAt`. Both server and browser validate version 4, permitting up to four investigations and four techniques, with at least one card overall. Cache keys include the UI version, room categories, catalogue content and review date. Before search, reviewed starting points remain usable. **Personalise my recommendations** generates a selected subset with new headlines, room context, qualitative benefits, actions and checks. Only returned investigations occupy the main generated grid; if none are returned, reviewed upgrade investigations remain available in a secondary disclosure. Simple technique cards appear first and link to their full library guide. They do not introduce new saved-plan action IDs. `Choose this investigation` retains the existing validated plan flow. Matching skeletons replace the grid while searching. Failures retain existing guidance. Financial methods and their gates are unchanged.

Equipment is a hard constraint in both prompts and server/browser runtime validation. If AC is not explicitly reported (including unknown equipment), no AC, replacement, compressor, split-system or heat-pump references are accepted in card copy or source labels. Fan recommendations similarly require a reported fan. There is no AC comparison disclosure or spending-coach request for a room without reported AC. Reviewed ventilation copy is also equipment-aware. This is not an instruction to buy missing equipment.

Before either provider request, `recommendationResources` selects a bounded set of library entries by eligible investigation and typed room reports. `techniqueIds` provides standalone candidates, so rooms without equipment or upgrade investigations can still receive guidance. Curtains require reported coverings, ventilation requires reported opening capability, fans require reported fans, and equipment-specific habits require reported AC. Exterior shade and insulation techniques require their relevant investigation. Each entry includes its reviewed summary, steps, checks and original government sources. Window count and covering categories are included in the minimal provider context; addresses, free text and financial inputs are excluded.

The formatting model may select `techniqueIds` only from the supplied per-option set. JSON Schema restricts the ID vocabulary; runtime validation checks duplicates, bounds, option association and room-based exclusions. The renderer resolves titles and `/knowledge-base#id` links from the catalogue, labels them **Simple techniques to try**, and shows the library review date. The model cannot supply arbitrary resource URLs or labels. `sourceUrls` retain their separate completed-search requirement: a library URL is not presented as freshly retrieved unless the search actually returned it. Library guides do not enable unsourced research to pass validation, establish numerical savings, add eligible options or change the user's selected plan.

The contract/schema/limits live in `src/contracts/cooling-research.ts`. Content comes from separate bounded search and formatting calls in `src/server/cooling-research.ts`, using GPT-5.5 with low reasoning. Search has a tool-call cap; formatting has no tools, an output cap and a shared deadline. The formatter schema requires benefit copy to start with May or Could. See [model capabilities](https://developers.openai.com/api/docs/models/gpt-5.5). The React renderer and CSS are in `src/features/cooling-options/cooling-research.*`.
