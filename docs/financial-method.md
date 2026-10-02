# Comparable AC label method v1

Reviewed 2026-10-03. Method: `zerl-comparable-ac-v1`. AUD. Period: `standardised-year`, annual cooling under Zoned Energy Rating Label (ZERL) standard conditions. This is an equipment-label comparison, not a personalised bedroom forecast.

## Authority and limits

The Australian Energy Rating regulator explains annual energy × electricity price running-cost comparisons, comparing products of similar capacity/features, and standard usage versus actual usage: [Understand the Zoned Energy Rating Label](https://www.energyrating.gov.au/consumer-information/understand-zoned-energy-rating-label). Average zone uses Richmond near Sydney and 840 standard cooling hours/year. Users must confirm their postcode's zone in the [Energy Rating Calculator](https://www.energyrating.gov.au/calculator); the app does not infer a zone.

The source supports annual energy × flat tariff. Subtracting costs, adjusting supplied recurring costs and dividing a quote by positive annual net savings are deterministic arithmetic. The app does not derive a shading reduction, indoor temperature change, comfort gain or household-use multiplier from this source.

## Required applicability and inputs

- Existing AC serves only this bedroom; external installation permission confirmed.
- Two distinct complete indoor/outdoor model identifiers, HTTPS label URLs and date checked.
- Both current ZERL labels' **cooling kWh/year for Average zone**; no heating energy, cooling capacity or electrical-input substitutions.
- Equal positive rated cooling capacity up to 30 kW; installer confirms non-ducted single-split configuration, comparable features/service and appropriate bedroom sizing.
- Explicit acceptance of standard annual conditions, which may differ from actual use.
- Supplied flat tariff, nonnegative installed quote, dated quote provider/inclusions and additional recurring annual costs for both systems. Enter zero explicitly if none; do not count electricity twice.
- Optional expected service life with a supporting reference. Without both, service-life suitability is unestablished.

The app does not crawl or independently verify user-transcribed labels or quotes. Provenance remains user-reported, with references, dates, assumptions and method version saved in the plan. Invalid, missing, noncomparable or unconfirmed inputs produce insufficient-evidence and unknown numeric savings/payback. No model or price is prefilled.

## Equations

Before electricity cost = existing label cooling kWh/year × flat tariff AUD/kWh.

After electricity cost = proposed label cooling kWh/year × the same flat tariff.

Annual net savings = before − after + existing additional recurring costs − proposed additional recurring costs.

Simple payback years = installed quote AUD ÷ positive supported annual net savings AUD/year.

Negative savings display as higher annual cost. Zero/negative savings, missing inputs, nonannual periods and zero upfront quote have no payback figure. A supported service life shorter than payback triggers a warning. Excludes discounting, financing, fixed supply charges, heating, time-of-use and solar opportunity costs. Uses the full replacement quote, not an incremental comparison against another mandatory replacement.

## Synthetic verification fixture

Tests use synthetic model names and example.org URLs: existing 1,000 kWh/year, proposed 600, tariff 0.30 AUD/kWh, recurring costs 0 before/20 after, quote 1,200 AUD. Independent arithmetic: 300 before, 180 after, 100/year net savings, 12-year payback. These are not appliance data, market prices or UI defaults.

PRD electrical-input scenarios still return 54 and 36 AUD for stated periods, labelled what-if; these do not derive intervention savings. Follow-up is observational: weather, behaviour and other factors prevent attributing a usage or comfort change to an intervention.
