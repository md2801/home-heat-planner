# Independent document import v1

Visit `/document-import` directly. Upload, processing, failure and review states are independent of the assessment screens. This feature has no assessment repository, storage key, database write or automatic financial calculation. Existing journey DTOs and financial definitions remain unchanged.

## Endpoint and setup

`POST /api/document-import?kind=…&acRole=…` accepts raw file bytes, **not multipart or JSON**. Set `Content-Type` to `application/pdf`, `image/jpeg` or `image/png`. `kind` is required: `electricity-bill`, `ac-label` or `installation-quote`. `acRole` is optional, defaults to `existing`, and can be `existing` or `proposed`; it selects AC field identities. Other/duplicate parameters fail validation. Browser requests must be same-origin.

Configure the existing server-only `OPEN_AI_KEY`. On Vercel, keep assistance disabled until external/account-wide usage and abuse controls exist, then set `AI_DISTRIBUTED_LIMITS_CONFIRMED=true`. No database or new provider credential is needed. The page reports failure and permits retry when extraction is unavailable.

The Node route has `maxDuration=60`. Limits: 4 MiB streamed bytes, 12 PDF pages, 48,000 embedded-text characters, 20 megapixels and 12,000 pixels per image dimension. The browser checks extensions, MIME and size; the server independently checks MIME, signatures, page count and image dimensions. Image decoding is completed by the provider, not proven by a signature check. PDF inspection reuses `unpdf`, allows two parsers per process and has a ten-second asynchronous deadline; it is not a hard CPU sandbox. Scanned/sparse PDF pages and images use visual extraction.

OpenAI Responses receives an inline PDF or image, a strict JSON schema, `gpt-6-luna`, low reasoning effort, `store:false`, a 40-second deadline and at most 4,500 output tokens. Browser timeout is 55 seconds. Demo counters allow three calls/client/minute and twenty per process, with at most 1,000 active client buckets. These counters reset on restart and are not distributed spend controls.

## Proposed fields

Types, strict schema and guards live in `src/contracts/document-import.ts`. Field identities reuse `BillKey` and `ReplacementField` from the existing catalogues; `currency` is import-specific metadata.

| Document | Field identities |
| --- | --- |
| Electricity bill | `usageRateAud`, `periodStart`, `periodEnd`, `tariffType` |
| Existing AC label | `existingModel`, `existingKwh` |
| Proposed AC label | `proposedModel`, `proposedKwh` |
| Installation quote | `installedCost`, `currency`, `quoteScope`, `quoteDate`, `proposedRecurring` |

Every expected field appears, including unknowns. A proposal has these required properties:

| Property | Meaning |
| --- | --- |
| `field` | Existing field identity or `currency` |
| `value` | Printed number/string, or `null` for unknown |
| `unit` | Printed unit meaning, or `null`; dates/text have no unit |
| `sourcePage` | One-based PDF page or `1` for an image; nullable for missing evidence |
| `sourceExcerpt` | Short original excerpt, at most 1,000 characters; nullable |
| `needsConfirmation` | Always `true` in endpoint proposals |
| `calculationBasis` | Verbatim printed climate/period/recurrence phrase, at most 500 characters; nullable |

**These are raw document proposals, not canonical calculator inputs.** In this endpoint, `usageRateAud: 30` with `unit: "c/kWh"` means thirty cents, despite the legacy field name. Similarly, `proposedRecurring: 10` with `unit: "AUD/month"` is monthly, not annual. `existingKwh` with a printed Cold-climate basis is not an Average-zone comparison input. A later integration must validate units, scope, climate, currency, provenance and the financial method's user declarations before mapping anything into calculator inputs.

Supported rates retain `c/kWh`, `cents/kWh`, `AUD/kWh` or `$/kWh`; energy retains `kWh/year`, `kWh/annum` or bare `kWh`. Upfront units are `AUD`, `USD`, `EUR`, `GBP`, `NZD` or `$`. Recurring units retain supported currency plus `/year` or `/month`; AUD and `$` also support `/visit`. Explicit supported currency codes are separate metadata. `$` alone never establishes AUD. Unsupported or ambiguous units stay unknown rather than being converted.

## Evidence and unknowns

- Embedded PDF excerpts must match their actual page text with whitespace equivalence. Visual excerpts cannot be independently matched against embedded text; the user must compare them with the original. `evidenceMode` distinguishes `pdf-text` and `visual`.
- Numerical quantities must be associated with the stated unit in the excerpt. A different number elsewhere on the page cannot establish a rate or recurring charge. Basis phrases must be present verbatim. These checks improve traceability; they do not prove semantic accuracy or OCR correctness.
- Full unambiguous printed dates become valid ISO dates. Missing years are never invented. Reversed billing dates become unknown.
- Bills supply a usage rate and dates/tariff, never cooling consumption. Supply charges, solar credits and whole-home kWh are excluded. Time-of-use/multiple-rate bills retain the tariff type but leave the scalar usage rate unknown; rates are not averaged or selected as flat rates.
- AC energy must be explicitly cooling energy. Heating, combined totals, electrical input and cooling capacity are excluded. A single explicit climate/period is preserved. When multiple climate figures are present, extraction selects the clearly associated Average-zone figure for the existing identity or returns unknown. Bare kWh does not acquire an annual basis or assumed operating hours.
- Quotes use an explicit upfront total, currency and inclusions. Deposits, financing instalments and individual line items are not an inferred installed total. Missing recurring costs are unknown, not zero. Monthly/per-visit charges are not annualised. No savings, payback or other financial result is generated.
- Missing fields are completed as unknown. Unsupported numeric values/units become unknown; malformed shapes, foreign/duplicate fields, invalid source pages and unconfirmed provider output fail safely.

## Example requests and responses

With the development server running:

```sh
curl -X POST 'http://localhost:3000/api/document-import?kind=electricity-bill' \
  -H 'Content-Type: application/pdf' \
  --data-binary @tests/fixtures/document-import/electricity-bill.pdf

curl -X POST 'http://localhost:3000/api/document-import?kind=ac-label&acRole=existing' \
  -H 'Content-Type: image/png' \
  --data-binary @tests/fixtures/document-import/ac-label.png

curl -X POST 'http://localhost:3000/api/document-import?kind=installation-quote' \
  -H 'Content-Type: image/jpeg' \
  --data-binary @tests/fixtures/document-import/installation-quote.jpg
```

On Windows use `curl.exe` and the appropriate shell's line-continuation syntax. Provider wording/excerpt boundaries may vary; this representative bill response preserves fixture values:

```json
{
  "ok": true,
  "result": {
    "schemaVersion": 1,
    "documentKind": "electricity-bill",
    "acRole": "existing",
    "pageCount": 1,
    "evidenceMode": "pdf-text",
    "fields": [
      {
        "field": "usageRateAud",
        "value": 30,
        "unit": "c/kWh",
        "sourcePage": 1,
        "sourceExcerpt": "Electricity usage rate: 30 c/kWh",
        "needsConfirmation": true,
        "calculationBasis": null
      },
      {
        "field": "periodStart",
        "value": "2026-09-01",
        "unit": null,
        "sourcePage": 1,
        "sourceExcerpt": "Billing period: 01/09/2026 to 30/09/2026",
        "needsConfirmation": true,
        "calculationBasis": null
      },
      {
        "field": "periodEnd",
        "value": "2026-09-30",
        "unit": null,
        "sourcePage": 1,
        "sourceExcerpt": "Billing period: 01/09/2026 to 30/09/2026",
        "needsConfirmation": true,
        "calculationBasis": null
      },
      {
        "field": "tariffType",
        "value": "Flat",
        "unit": null,
        "sourcePage": 1,
        "sourceExcerpt": "Tariff type: Flat",
        "needsConfirmation": true,
        "calculationBasis": null
      }
    ]
  }
}
```

A missing proposal is `{field:"installedCost",value:null,unit:null,sourcePage:null,sourceExcerpt:null,needsConfirmation:true,calculationBasis:null}`. An unsupported proposal may retain its excerpt/page while clearing its value/unit. A scanned PDF/image has `evidenceMode:"visual"`.

Failures use `{ok:false,message:"…"}` and private/no-store headers. Statuses: 400 invalid parameters/empty or unreadable file, 403 origin, 413 size/dimensions, 415 MIME, 429 usage limit, 502 unreliable extraction, 503 provider/configuration/processing failure. Provider bodies, raw exception messages and document contents are never returned as failure messages.

## Review and temporary processing

Each field starts pending. The user can confirm the original proposal, correct its value/unit/basis, or reject it to unknown. Unknowns can be entered manually or explicitly kept unknown. Every field needs a decision before Finish review becomes available; opening an edit makes that field pending again. Corrections preserve the original source excerpt and are labelled as user corrections. Users can reopen completed review and download the reviewed JSON.

The downloaded snapshot contains each decision, timestamp and origin (`document-proposal-confirmed`, `user-corrected` or `unknown`) alongside source metadata. It is not a journey DTO and is not submitted to an assessment endpoint. Confirmation means human review, not verified financial applicability.

Uploads and text remain in request memory; no filesystem write, Files API upload, document cache, database write or content log is introduced. The request's upload buffer is cleared in `finally`; copies/text become eligible for collection, without a secure-erasure guarantee. Responses use `Cache-Control: private, no-store`. Original filenames are not sent to OpenAI. Browser file previews use revocable object URLs, and page state is cleared on reset/unmount. The user explicitly chooses any reviewed JSON download. OpenAI receives the original document; `store:false` does not override provider processing/retention policies. Prefer redacted documents and do not configure platform request-body logging.

## Fixtures and checks

`tests/fixtures/document-import/` contains synthetic PDF bills (flat and time-of-use), an AC-label PNG, a quote JPG and an incomplete quote PDF. `examples.json` holds source lines, structured provider fixture output and expected values. No customer documents are committed. Regenerate with `python scripts/generate-document-import-fixtures.py` (Pillow is a fixture-generation tool, not an app dependency). `.gitattributes` preserves PDF byte offsets on Windows.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:document-import-ui
```

Alternatively set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome. Browser tests mock the extraction endpoint and exercise correction/export, unknown/rejected values, mobile layout, failure/retry and cancellation. Node tests cover real fixture parsing/upload, units and quantity association, missing values, climate/period preservation, provider refusals/errors/timeouts, limits, response shape, cleanup and review provenance. No live provider credential is required for tests; provider mocks do not establish live extraction quality.

Provider references: [PDF input](https://developers.openai.com/api/docs/guides/file-inputs), [image input](https://developers.openai.com/api/docs/guides/images-vision), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
