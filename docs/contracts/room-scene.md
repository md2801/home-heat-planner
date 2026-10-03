# Bedroom scene contract

The assessment builds a live room preview from its answers, using `RoomShell`, `Wall`, `Roof`, `Window`, `Shade`, `Bed`, `CoolingEquipment` and `Annotation`. Geometry belongs to the renderer. No generated code, HTML, SVG paths or arbitrary component names are executed. The current question highlights the relevant region. Updates are local and require no model call.

`assessmentScene` projects canonical assessment answers into the scene. Window count is a core question; zero windows skips window-specific questions. Unknown counts stay unknown; more than four is recorded explicitly but remains beyond the drawing limit. Mixed directions and partial shading are not assigned to individual windows without confirmation. Generic fans, air conditioners and external shade use generic symbols rather than inventing a type. Furniture is illustrative: a bed is shown when its presence is unknown, omitted when explicitly absent, and never written into assessment facts by rendering. Captions disclose this; generic cooling symbols show categories without claiming a model. Unknown directions are described in supporting text rather than question marks inside the drawing. The editor opens on Current room, with a separate Proposed improvement view above the diagram. Positions and sizes are schematic.

The optional room-baseline editor can refine individual details. Confirming a scene updates the canonical assessment answers and saves per-window details in `AssessmentDraft.sceneDetails` through the assessment repository. Each detail is linked to the answers on which it was based: unrelated edits preserve it, while changes to relevant answers replace it. Descriptions and unconfirmed proposals are not saved. Resetting or discarding an editor draft does not change saved assessment answers. Save failures are disclosed. The previous standalone `home-heat-planner:room-scene:v1` record is no longer read or written by this UI; it is not silently merged into assessment facts.

`POST /api/room-scene` accepts `{ description, current }`. Description is 1–1000 characters; current conforms to `RoomScene` in `src/contracts/room-scene.ts`. The same module exports the provider JSON Schema and strict runtime validators. Responses are `{ ok: true, scene }` or `{ ok: false, message }`. Requests are same-origin checked, body-limited to 8,000 bytes and responses use no-store. Invalid input returns 400, oversized input 413, foreign origin 403; provider unavailability returns a manual-fallback result.

Example scene:

```json
{"version":1,"above":"unknown","bed":"present","windows":[{"direction":"west","covering":"curtains","shade":"none"}],"equipment":["split-ac"]}
```

Null window/equipment arrays mean unknown. Empty arrays mean explicitly absent. Compass direction is a label, not physical placement. No dimensions, roof shape, thermal performance or financial claims are generated. The backend assessment DTO includes confirmed `sceneDetails` (bounded scene plus answer basis), validated with the same strict validator as browser storage. The backend resolves these against current answers and populates `RoomProfile.windows` with individual direction, shading presence, coverings and opening facts. Mixed opening answers remain unknown per window. Stale scene details never override newer answers. Unconfirmed AI proposals do not enter this DTO. Contributors, plan and follow-up use the same resolved scene and equipment placement as assessment. Plan highlights identify an investigation area; they do not show an improvement as installed.

The server uses the user-requested `gpt-6-luna` model and existing `OPEN_AI_KEY` with structured Responses API output. Model availability requires a successful live call; no alternate model is silently substituted. Provider errors and keys are not exposed. The local diagram limit is 30 requests per process, three per client per minute, 2,000 output tokens per call and an 18-second provider timeout. It is not a distributed/account-wide spending limit. Production assistance remains disabled unless distributed limits are confirmed. Manual editing works without a provider.

Model output remains an unconfirmed proposal. Confirmed edits can change assessment suitability; a drawing itself supplies no financial benefit estimate. The external-awning preview is temporary and cannot save itself as the current room. Permissions, feasibility and numerical benefits are not asserted by a visual preview.

Source: https://developers.openai.com/api/docs/guides/structured-outputs

The architectural renderer uses per-instance gradient definitions for timber, plaster, glass and linen. Roof-above answers use an illustrative pitched cutaway; another room or dwelling uses a flat section. Geometry, finishes and equipment silhouettes do not establish physical specifications. No heat-flow or sun-direction simulation is inferred.


## Answer-driven 3D room

The shared DynamicRoom component lazy-loads Three.js and same-origin GLB assets. It is used in assessment, review/editor, contributors, cooling plan and follow-up, with a manual 2D switch and a WebGL/load-failure fallback. room-layout.ts projects the existing scene and equipment answers into a disposable visual layout; it never writes back positions or financial inputs.

- North is -Z, east is +X. Known window directions choose a side; curtains/blinds/shutters stay with their window and the shell opening is rebuilt with it.
- Diagonal bearings are explicitly labelled as approximate on a four-wall schematic. Spacing, dimensions, furniture and ceiling-equipment positions remain illustrative.
- Zero windows produces no openings. Unknown window directions remain unplaced and appear in the unconfirmed-details list.
- Portable fans use reported beside-bed, foot-of-bed or near-window positions. Unknown positions, elsewhere and near-door (door position not collected) stay unplaced. With multiple windows, near-window uses the first known window, explicitly disclosed.
- Wall-mounted and window/wall AC units use the reported AC wall. Unknown AC types/walls and portable AC locations stay unplaced. Ducted vents and ceiling fans use a labelled illustrative ceiling position.
- The nearest two walls and their attached objects hide during orbit. Vertical drag is inverted. Buttons support keyboard rotation/reset.
- Editor proposals remain unconfirmed until confirmation; no automatic persistence comes from the 3D engine. Confirmed equipment positions survive window-only editor changes.
- The renderer releases WebGL resources on unmount, ignores stale asset requests, and loads no external model URLs. No sunlight or cooling simulation is added.


## Optional airflow preview

The shared 3D renderer provides an opt-in illustrative stream overlay for placed fans and AC units. Blue identifies AC; teal identifies fans. The overlay assumes equipment is on, uses schematic directions and unscaled animation speeds, and does not solve a velocity field, collisions or heat transfer. It never changes recommendations or numerical estimates. Unknown equipment placement produces no stream; window airflow is excluded without opening and wind inputs. Reduced-motion preferences produce static paths and particles. Resources are disposed on scene rebuild/unmount.
