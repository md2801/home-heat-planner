# Home Heat Planner — Codex Instructions

## Before You Work

Before making substantial changes to this repository:

1. Read `docs/PRD.md`.
2. Read `docs/BUILD_SPEC.md`.
3. Inspect the relevant approved screen(s) in `docs/design/`.
4. Understand existing code before modifying it.

Do not make product or architecture decisions that contradict these sources.

## Sources of Truth

Use this priority:

1. `docs/PRD.md` — product requirements, rules, calculations and evidence requirements.
2. `docs/BUILD_SPEC.md` — hackathon implementation architecture and engineering decisions.
3. `docs/design/` — approved visual design for the seven screens.
4. `docs/contracts/` — frontend/backend contracts once defined.

If implementation details are unclear, prefer the simplest solution that preserves these requirements rather than inventing new product behaviour.

## Product Goal

Build Home Heat Planner as a polished, responsive web application that helps a Greater Sydney homeowner understand bedroom overheating, compare suitable cooling improvements, choose an action and follow through.

The core user journey must work end to end.

This is a hackathon prototype. Prioritise reliability, clarity and demo readiness over unnecessary infrastructure.

## Visual Implementation

The seven images in `docs/design/` are approved UI references.

Match them closely.

Preserve their:

- layout
- hierarchy
- spacing
- typography
- colour palette
- architectural visual language
- controls
- information density

Do not independently redesign the application.

Do not turn the interface into a generic SaaS dashboard.

Avoid unnecessary:
- cards
- gradients
- glassmorphism
- badges
- dashboard widgets
- decorative animations
- generic AI visual language

Reuse components where doing so does not compromise visual fidelity.

## Product Integrity

Never invent:

- room facts
- user inputs
- evidence
- sources
- financial savings
- payback periods
- temperature reductions
- cooling-performance claims

Unknown values must remain unknown.

Do not silently replace missing information with convenient assumptions.

Supported estimates, what-if scenarios and insufficient-evidence results must remain distinguishable.

Before/after follow-up data is observational and must not be presented as proof of causation.

## AI

AI may assist with bounded language and classification tasks defined in the PRD and build specification.

AI must not become the source of numerical truth.

Do not use AI to invent or calculate unsupported savings, payback or building-performance claims.

Do not expose unnecessary implementation terminology such as:
- LLM
- model confidence
- AI recommendation
- computer vision confidence

Provider secrets must remain server-side.

## Architecture

Follow `docs/BUILD_SPEC.md`.

Use strict TypeScript.

Keep:

- UI components
- business/calculation logic
- persistence
- API/service calls
- DTO/contracts

appropriately separated.

Do not scatter hard-coded demo data throughout page components.

Temporary mocks must use the same contracts as the eventual backend.

Do not add major dependencies without a clear need.

Do not introduce authentication, databases or other production infrastructure unless explicitly requested.

## Working Behaviour

When given a focused task:

1. inspect the relevant existing implementation;
2. make the smallest coherent set of changes;
3. preserve unrelated working functionality;
4. run appropriate validation;
5. fix errors introduced by the change.

Do not rewrite unrelated screens simply because another implementation is possible.

When modifying shared components, check their effect on all screens that use them.

## Validation

After meaningful implementation changes, run appropriate checks such as:

- TypeScript/type checking
- linting
- relevant tests
- production build when appropriate

Do not claim a check passed unless it was actually run.

If something cannot be run, state that clearly.

## Demo Reliability

The hackathon demo must not depend entirely on an external AI/provider call succeeding live.

Where appropriate, ensure the core journey has graceful fallback behaviour.

The seven-screen journey should remain demonstrable.

## Scope Control

Core functionality comes before stretch features.

Do not begin optional computer vision until the core seven-screen experience is substantially functional.

Do not implement out-of-scope features merely because they might be useful.

## When Requirements Conflict

Do not silently choose between conflicting requirements.

Identify the conflict and preserve the safer/current working behaviour until it is resolved.

For visual details, use the approved screen image.

For product behaviour and numerical rules, the PRD takes precedence.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
