# Guided external-window-shading scenario v1

User-authorised extension, 4 October 2026. This is the first narrow improvement-specific **assumed scenario**, linked to an eligible external-shading investigation and retained with its saved plan. It does not establish validated personalised savings and does not promote synthetic model results into the supported annual financial comparison. The model and its reference inputs are deterministic; the language model supplies no numbers.

## Input and integration contract

`src/features/shading-scenario/model.ts` exports the draft, field metadata, blank/reference factories, persistence shape guard and `evaluateShadingScenario`. A version-1 draft has numeric strings, one of eight compass directions or `unknown`, a blank or `synthetic-hot-day` weather choice, an acceptance flag, a period label, optional-in-meaning installed cost and scope strings, and an ISO UTC update timestamp. Blank numeric inputs stay blank. Explicit reference selection fills demonstration assumptions, which still require acknowledgement before producing results. Existing reported shade does not establish an effective percentage; glazing type does not establish SHGC.

Required numerical inputs and units are defined in `shadingScenarioFields`: combined area of same-facing vertical windows (m²), constant SHGC (0–1), existing/proposed effective incident-solar reductions (%), room volume (m³), fabric conductance (W/K, including glazing conduction), effective thermal capacity (MJ/K), background air changes per hour, internal heat gains (W), initial/setpoint temperatures (°C), thermal cooling capacity (kW output), constant COP, flat electricity rate (AUD/kWh), integer start/end hours, and 1–366 explicitly assumed identical cooling days. The selected window group is the only solar gain modelled; other windows are omitted. No room dimensions or thermal properties are inferred from the decorative 3D illustration.

The parent integration must require reported AC serving only this bedroom and recheck investigation eligibility/permission. The stored input is associated with the material room signature; changed relevant room facts invalidate the scenario. A zero-capacity calculation is allowed mathematically and produces zero electricity, but must not become a claim of savings for someone without existing cooling. Financial results remain outside `annualNetSavings` and payback. Installation cost remains unknown unless a nonnegative amount and source/scope are both supplied. It is stored as user supplied, not an independently verified quote.

`evaluateShadingScenario` returns `status: incomplete` with missing labels/errors, or `status: ready` with daily/period energy and cost before and after, their signed difference, scheduled unmet-target hours per day, peak model temperature, optional scoped installation cost, full assumptions and limitations. Editing inputs requires recalculation; there is no separate trusted result cache. Cost/energy calculations retain full precision; presentation rounds currency only. Negative differences are increases, not forced positive savings.

## Heat balance and control

The one-zone lumped balance is:

`C dT/dt = H (Tout − T) + A × SHGC × Iwindow × (1 − shade/100) + Qinternal − Qcool`

`H = fabric W/K + 1.2 kg/m³ × 1006 J/(kg K) × volume × ACH / 3600`

The existing analytical `heatStep` advances each five-minute interval under constant hourly forcing. The ideal cooling controller calculates the thermal power required to reach the common setpoint at the interval end and limits it to the supplied capacity. Cooling is off outside the schedule. Start is inclusive, end exclusive; crossing midnight is supported and equal hours explicitly mean 24-hour operation. Electricity is delivered thermal cooling energy divided by COP. Both cases have the same temperature objective, schedule, room, weather and efficiency; only the shade percentage changes.

Each case starts at the supplied initial temperature, runs seven repeated warm-up days independently, and then counts the eighth model day. This fixed warm-up reduces initial-state sensitivity but is not a convergence guarantee, particularly for large effective thermal capacities. That day's electricity is multiplied by the stated number of identical cooling days, not extrapolated to a calendar year. No unrelated whole-home or measured cooling bill is reduced by a guessed percentage.

`unmetComfortHours` counts five-minute endpoints above setpoint + 0.1°C **during scheduled cooling only**. Show this for both cases whenever nonzero: equal setpoints do not guarantee equal achieved comfort when capacity or operating times limit cooling. It is a numerical diagnostic, not a health/comfort prediction. Peak model temperature includes off-schedule hours.

## Explicit synthetic weather and solar assumptions

No weather data is fetched. At hourly midpoint `h`, outdoor temperature is `28 + 7 sin((h − 9)π/12)` °C, representing an invented nominal 21–35°C hot day. Solar geometry uses latitude −33.86°, fixed solar declination −21.3°, and hour angle `(h − 12) × 15°`. Hours are an illustrative solar clock, with no longitude, equation-of-time or daylight-saving correction.

With latitude φ, declination δ, and hour angle ω, the sun vector in local east/north/up coordinates is `(-cosδ sinω, cosφ sinδ − sinφ cosδ cosω, sinφ sinδ + cosφ cosδ cosω)`. Window azimuth α is clockwise from north; a vertical window has normal `(sinα, cosα, 0)`. When the sun is above the horizon:

`Iwindow = 650 × max(0, east × sinα + north × cosα) + 120/2 + 20 W/m²`

Otherwise irradiation is zero. **650 W/m² direct normal, 120 W/m² diffuse horizontal, 20 W/m² vertical reflected radiation and the temperature curve are invented scenario assumptions, not measured Sydney values or an official design day.** Diffuse sky is isotropic. SHGC stays constant at all angles; glazing angular optics are not modelled. Both effective shade fractions reduce every solar component during every daylight hour. They are not the percentage of visible glass covered or inferred performance of a particular blind, tree, awning or shade cloth.

The reference-room values are likewise invented: 3 m² west-facing window group, SHGC 0.7, effective shading 0→75%, volume 40 m³, conductance 65 W/K, capacity 3 MJ/K, ACH 0.5, internal gains 100 W, starting temperature 26°C, setpoint 25°C, 2.5 kW thermal capacity, COP 3.5, rate AUD 0.35/kWh, operation 14:00–23:00 and 30 identical assumed hot days. Users deliberately opt in and can edit them. These values have no claim to typical or measured household performance.

## Boundaries and next validation

This single effective-temperature model omits humidity/latent loads, radiant comfort, separate surfaces, adjacent rooms, roof/wall solar absorption, other windows, detailed shading geometry, thermal bridges, variable weather, daylight penalties, winter heating effects, cycling/standby and separate fan energy. There is no calibrated building survey, weather file, independent building-simulation comparison or measured-home validation. No statistical confidence range, annual saving, payback, emissions result or additive combined-improvement saving is returned. Bills use flat usage charges only; supply charges, solar opportunity costs and time-of-use rates are excluded.

Before presenting supported personalised estimates, replace the synthetic weather with a traceable appropriate series, establish room/equipment parameters and shading geometry, calibrate and compare reference cases with a suitable independent building model, define applicability/uncertainty, and validate comfort equivalence. Insulation and ventilation savings remain separate future methods; this extension does not unlock them.

## References and checks

Reviewed 4 October 2026:

- [Your Home: shading](https://www.yourhome.gov.au/passive-design/shading) supports orientation-dependent external shading and seasonal design considerations. It does not supply the demo shade percentage or a bedroom bill reduction factor.
- [Your Home: glazing](https://www.yourhome.gov.au/passive-design/glazing) explains SHGC, conduction and incidence-angle effects. This scenario omits the latter and discloses it.
- [EnergyPlus engineering reference: zone and air system integration](https://bigladdersoftware.com/epx/docs/24-2/engineering-reference/basis-for-the-zone-and-air-system-integration.html) describes the general zone energy-balance approach. This app is a much simpler lumped model; it does not execute EnergyPlus or claim EnergyPlus validation.

The tests include independently calculated constant-load and solar-only reference cases, midnight schedules, capacity bounds, no-sun/identical-shade/zero-SHGC invariants, zero tariff/capacity, window-area sensitivity, negative savings, full provenance, and invalid/missing persisted inputs. They validate implementation behaviour, not actual building performance.
