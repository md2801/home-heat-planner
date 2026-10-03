# Cooling research UI contract v3

The explanation model fills a closed `improvement-card` component. The app renders its layout, icons, option names, sources and controls. It accepts no generated HTML, CSS, scripts, component names outside the vocabulary, navigation URLs or event handlers.

```json
{
  "schemaVersion": 3,
  "suggestions": [{
    "component": "improvement-card",
    "optionId": "external-shading",
    "headline": "Keep afternoon sun outside",
    "whyForRoom": "You reported west-facing windows without external shade.",
    "potentialBenefit": "External shade may reduce sunlight entering your room.",
    "nextAction": {
      "label": "Confirm permission for exterior work",
      "detail": "Ask the responsible owner or strata manager about suitable external shading."
    },
    "checks": ["Check window access with an installer", "Keep light and ventilation in mind"],
    "sourceUrls": ["https://www.yourhome.gov.au/passive-design/shading"],
    "techniqueIds": ["close-curtains", "external-shade"]
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

The prompt specifies the role of each content slot and both length limits. JSON Schema enforces the component vocabulary, field shape, character limits and array bounds; runtime validation additionally enforces word limits, rejects multiline copy and numeric claims, and verifies source provenance. Missing facts stay unknown. The contract adds no financial inputs, performance predictions, installation ranking or permission assumptions.

The response adds `ok:true` and `retrievedAt`. Both server and browser validate version 3. Cache keys include the UI version and the selected catalogue content and review date. Improvement cards are the primary options view and appear immediately from the app's reviewed guidance. A successful optional search enriches matching cards; omitted options retain their reviewed guidance. While searching, matching skeleton cards replace the grid. Cards show an icon, takeaway, reported room context, next action, checks and linked sources; searched cards also show the sourced possible benefit. `Choose this investigation` invokes the existing validated selection flow. The app owns all controls. AC financial inputs and supported figures live in a separate, initially collapsed `Compare costs and savings` section. Missing figures produce a next-step prompt rather than empty financial columns.

Before either provider request, `recommendationResources` selects a bounded set of library entries by eligible investigation and typed room reports. Each entry includes its reviewed summary, steps, checks and original government sources. A fan guide is included only when a fan is reported; the cooler-outdoor-air guide is excluded when windows cannot open; external-work guides are excluded when permission is reported absent. This supplements the existing minimal provider context without sending addresses, free text or financial inputs.

The formatting model may select `techniqueIds` only from the supplied per-option set. JSON Schema restricts the ID vocabulary; runtime validation checks duplicates, bounds, option association and room-based exclusions. The renderer resolves titles and `/knowledge-base#id` links from the catalogue, labels them **Simple techniques to try**, and shows the library review date. The model cannot supply arbitrary resource URLs or labels. `sourceUrls` retain their separate completed-search requirement: a library URL is not presented as freshly retrieved unless the search actually returned it. Library guides do not enable unsourced research to pass validation, establish numerical savings, add eligible options or change the user's selected plan.

The contract/schema/limits live in `src/contracts/cooling-research.ts`. Content comes from the separate bounded search/explanation calls in `src/server/cooling-research.ts`. The React renderer and CSS are in `src/features/cooling-options/cooling-research.*`.
