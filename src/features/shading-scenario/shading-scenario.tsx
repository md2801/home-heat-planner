"use client";

import Image from "next/image";
import { useId, useMemo, useRef, useState } from "react";
import {
  createReferenceShadingScenario,
  evaluateShadingScenario,
  shadingScenarioFields,
  type ShadingScenarioDraft,
  type ShadingScenarioField,
} from "./model";
import styles from "./shading-scenario.module.css";

type Props = {
  input: ShadingScenarioDraft;
  onChange: (input: ShadingScenarioDraft) => void;
  onChoose: () => void;
  selected: boolean;
};

const steps = ["Your window", "Your cooling", "See the difference"];
const directions: { value: ShadingScenarioDraft["direction"]; label: string }[] = [
  { value: "north", label: "North" }, { value: "north-east", label: "North-east" },
  { value: "east", label: "East" }, { value: "south-east", label: "South-east" },
  { value: "south", label: "South" }, { value: "south-west", label: "South-west" },
  { value: "west", label: "West" }, { value: "north-west", label: "North-west" },
];
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const number = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
const advancedFields: ShadingScenarioField[] = [
  "roomVolumeM3", "fabricWPerK", "thermalMassMjPerK", "backgroundAch", "internalGainsW",
  "initialTempC", "coolingCapacityKw", "cop",
];

function NumericField({ field, input, change, label, help }: {
  field: ShadingScenarioField | "installedCostAud";
  input: ShadingScenarioDraft;
  change: (patch: Partial<ShadingScenarioDraft>) => void;
  label?: string;
  help?: string;
}) {
  const helpId = useId();
  const [fieldLabel, min, max] = field === "installedCostAud"
    ? ["Installed shading cost (AUD)", 0, 1_000_000] as const
    : shadingScenarioFields[field];
  return <label className={styles.field}>
    <span>{label ?? fieldLabel}</span>
    <input type="number" inputMode="decimal" step={["coolingStartHour", "coolingEndHour", "coolingDays"].includes(field) ? "1" : "any"} min={min} max={max} value={input[field]}
      placeholder="Not yet entered" aria-describedby={help ? helpId : undefined}
      onChange={event => change({ [field]: event.target.value })} />
    {help && <small id={helpId}>{help}</small>}
  </label>;
}

export function ShadingScenario({ input, onChange, onChoose, selected }: Props) {
  const [step, setStep] = useState(() => input.assumptionsAccepted ? 2 : 0);
  const [exampleLoaded, setExampleLoaded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const result = useMemo(() => evaluateShadingScenario(input), [input]);

  function change(patch: Partial<ShadingScenarioDraft>) {
    onChange({ ...input, ...patch, assumptionsAccepted: false, updatedAt: new Date().toISOString() });
  }

  function moveTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }

  function loadExample() {
    const reference = createReferenceShadingScenario();
    const merged = { ...reference, ...input };
    for (const field of Object.keys(shadingScenarioFields) as ShadingScenarioField[]) {
      if (!input[field].trim()) merged[field] = reference[field];
    }
    if (!input.periodLabel.trim()) merged.periodLabel = reference.periodLabel;
    if (input.direction === "unknown") merged.direction = reference.direction;
    merged.weatherMode = "synthetic-hot-day";
    merged.assumptionsAccepted = false;
    merged.updatedAt = new Date().toISOString();
    onChange(merged);
    setExampleLoaded(true);
  }

  return <section id="shading-savings" className={styles.section} aria-labelledby={titleId}>
    <div className={styles.intro}>
      <div className={styles.introCopy}>
        <span className={styles.eyebrow}>KEEP HEAT OUT · EXPLORE THE COST DIFFERENCE</span>
        <h2 id={titleId}>A little more shade.<br />What could it change?</h2>
        <p>Compare cooling energy and spending before and after shading one window, with the same cooling schedule and temperature target.</p>
        <span className={styles.scenarioLabel}><span aria-hidden="true">◌</span> Experimental what-if scenario</span>
      </div>
      <div className={styles.introImage}>
        <Image src="/images/techniques/external-shade.png" alt="Illustrative exterior window shading" fill sizes="(max-width: 760px) 100vw, 35vw" />
        <span>Keep sunlight outside, before it reaches the glass.</span>
      </div>
    </div>

    <nav className={styles.steps} aria-label="Shading comparison steps">
      {steps.map((label, index) => <button key={label} type="button" onClick={() => moveTo(index)}
        aria-current={index === step ? "step" : undefined} className={index === step ? styles.activeStep : undefined}>
        <span aria-hidden="true">{index + 1}</span>{label}
      </button>)}
    </nav>

    <div className={styles.body}>
      <div className={styles.stepHeading}>
        <span className={styles.eyebrow}>STEP {step + 1} OF 3</span>
        <h3 ref={heading} tabIndex={-1}>{step === 0 ? "Start with one window." : step === 1 ? "Keep the comparison fair." : "See what changes. Know what’s assumed."}</h3>
        <p>{step === 0 ? "Use the window you want to shade. Multiple windows and other room improvements are outside this comparison." : step === 1 ? "Both versions use the same room, weather, cooling hours and temperature target. Only the window’s shade changes." : "These are scenario costs for the cooling equipment, separate from your measured bill or existing cooling-cost baseline."}</p>
      </div>

      {step === 0 && <>
        <div className={styles.windowGrid}>
          <div className={styles.fields}>
            <NumericField field="windowAreaM2" input={input} change={change} label="Glass area (m²)" help="Glass width × height in metres. Exclude the frame." />
            <label className={styles.field}><span>Which way does it face?</span><select value={input.direction} onChange={event => change({ direction: event.target.value as ShadingScenarioDraft["direction"] })}>
              <option value="unknown">Choose a direction</option>{directions.map(direction => <option key={direction.value} value={direction.value}>{direction.label}</option>)}
            </select><small>Use a known direction or choose an explicit example below.</small></label>
            <NumericField field="glazingShgc" input={input} change={change} label="Window solar heat gain coefficient" help="SHGC from the glazing specification, from 0 to 1. If unknown, the example uses an explicit assumption." />
          </div>
          <div className={styles.shadeComparison}>
            <div className={styles.shadeHeading}><span aria-hidden="true">☀</span><div><h4>Change the shade, keep the window.</h4><p>How much incoming sunlight is blocked by external shade?</p></div></div>
            <div className={styles.fields}>
              <NumericField field="existingShadePercent" input={input} change={change} label="Before: sunlight blocked (%)" />
              <NumericField field="proposedShadePercent" input={input} change={change} label="After: sunlight blocked (%)" />
            </div>
            <p className={styles.hint}>These are assumptions for the whole day, not the percentage of glass covered in a photograph. Actual shade changes with the sun, season and design.</p>
          </div>
        </div>
        <div className={styles.example}>
          <div><strong>Just exploring? Try an example.</strong><p>Fill missing details with a labelled example window, room and cooling setup, plus a synthetic hot day. Details you have already entered stay in place. Review every assumption before calculating.</p></div>
          <button className={styles.secondary} type="button" onClick={loadExample}>{exampleLoaded ? "Fill remaining example details" : "Use example assumptions"}<span aria-hidden="true">↗</span></button>
        </div>
        {exampleLoaded && <p className={styles.successNote} role="status">Example assumptions added. They describe a scenario, not confirmed facts about your room.</p>}
      </>}

      {step === 1 && <>
        <div className={styles.coolingGrid}>
          <div>
            <div className={styles.fields}>
              <NumericField field="tariffAudPerKwh" input={input} change={change} label="Electricity usage rate (AUD/kWh)" help="The flat usage rate, without the daily supply charge." />
              <NumericField field="coolingDays" input={input} change={change} label="How many cooling days?" help="The same example hot day is repeated this many times." />
              <NumericField field="coolingStartHour" input={input} change={change} label="Cooling starts (24-hour clock)" help="For example, 18 means 6 pm." />
              <NumericField field="coolingEndHour" input={input} change={change} label="Cooling ends (24-hour clock)" help="An end before the start runs overnight. Matching times mean 24 hours." />
              <NumericField field="setpointC" input={input} change={change} label="Cooling temperature target (°C)" />
              <label className={styles.field}><span>Name this period</span><input type="text" maxLength={200} value={input.periodLabel} placeholder="For example, 20 hot days this summer" onChange={event => change({ periodLabel: event.target.value })} /></label>
            </div>
          </div>
          <aside className={styles.weather}>
            <span className={styles.weatherIcon} aria-hidden="true">☀</span>
            <span className={styles.eyebrow}>ONE DAY, COMPARED TWICE</span>
            <h4>A synthetic hot day</h4>
            <p>An illustrative daily temperature and sunlight pattern, not a local forecast or recorded weather. Repeating this day explores a period; it doesn’t predict your season.</p>
            <label className={styles.check}><input type="checkbox" checked={input.weatherMode === "synthetic-hot-day"} onChange={event => change({ weatherMode: event.target.checked ? "synthetic-hot-day" : "" })} /><span>Use the synthetic day for this comparison</span></label>
            <button className={styles.textButton} type="button" onClick={loadExample}>Fill missing room and cooling assumptions →</button>
          </aside>
        </div>
        <details className={styles.disclosure}>
          <summary><span><strong>Room and cooling assumptions</strong><small>Review the example values or enter your own</small></span><span aria-hidden="true">+</span></summary>
          <div className={styles.disclosureBody}><p>These parameters describe a simplified single-room heat balance. They are not inferred from your assessment, a bill or a room image. Cooling capacity is thermal output, not electrical input.</p><div className={styles.fields}>{advancedFields.map(field => <NumericField key={field} field={field} input={input} change={change} />)}</div></div>
        </details>
        <details className={styles.disclosure}>
          <summary><span><strong>Have an installed quote?</strong><small>Optional · keep upfront spending separate</small></span><span aria-hidden="true">+</span></summary>
          <div className={styles.disclosureBody}><div className={styles.fields}>
            <NumericField field="installedCostAud" input={input} change={change} label="Installed shading cost (AUD)" help="Leave blank if you don’t have a quote. Zero means a confirmed no-cost change." />
            <label className={styles.field}><span>What does the cost include?</span><input type="text" maxLength={240} value={input.installedCostScope} placeholder="Shading, fitting and any other included work" onChange={event => change({ installedCostScope: event.target.value })} /></label>
          </div><p>We won’t calculate payback from repeated example days. That needs a supported annual comparison.</p></div>
        </details>
      </>}

      {step === 2 && <>
        <div className={styles.reviewSummary}>
          <div><span>Your window</span><strong>{input.windowAreaM2 || "—"} m² · {directions.find(direction => direction.value === input.direction)?.label ?? "Direction needed"}</strong></div>
          <div><span>Assumed sunlight blocked</span><strong>{input.existingShadePercent || "—"}% <span aria-hidden="true">→</span> {input.proposedShadePercent || "—"}%</strong></div>
          <div><span>Comparison period</span><strong>{input.coolingDays || "—"} cooling days</strong><small>{input.periodLabel || "Period not yet entered"}</small></div>
        </div>
        <label className={`${styles.check} ${styles.acknowledgement}`}><input type="checkbox" checked={input.assumptionsAccepted} onChange={event => onChange({ ...input, assumptionsAccepted: event.target.checked, updatedAt: new Date().toISOString() })} /><span>I’ve reviewed the inputs. I understand this uses a synthetic hot day and simplified room assumptions, and is an experimental scenario rather than a prediction of my bills or comfort.</span></label>

        {result.status === "ready" ? <>
          <div className={styles.results}>
            <div className={styles.chart}>
              <span className={styles.eyebrow}>COOLING COST · {result.coolingDays} SCENARIO DAYS</span>
              <h4>Before and after shading</h4>
              {[{ title: "Before", values: result.baseline, shade: styles.beforeBar }, { title: "After", values: result.improved, shade: styles.afterBar }].map(item => <div className={styles.barRow} key={item.title}>
                <div><span>{item.title}</span><strong>{money.format(item.values.periodCostAud)}</strong></div>
                <div className={styles.barTrack} aria-hidden="true"><span className={item.shade} style={{ width: `${Math.max(0, item.values.periodCostAud / (Math.max(result.baseline.periodCostAud, result.improved.periodCostAud) || 1) * 100)}%` }} /></div>
                <small>{number.format(item.values.periodKwh)} kWh of cooling electricity</small>
              </div>)}
              <p>{result.periodLabel} · AUD · flat usage charges only</p>
            </div>
            <div className={styles.savings}>
              <span className={styles.eyebrow}>{result.savingsAud >= 0 ? "SCENARIO COST REDUCTION" : "SCENARIO COST INCREASE"}</span>
              <strong>{money.format(Math.abs(result.savingsAud))}</strong>
              <p>over {result.coolingDays} repeated example {result.coolingDays === 1 ? "day" : "days"}</p>
              <div className={styles.energyDifference}><span aria-hidden="true">{result.savingsKwh >= 0 ? "↘" : "↗"}</span><div><b>{number.format(Math.abs(result.savingsKwh))} kWh {result.savingsKwh >= 0 ? "less" : "more"}</b><span>cooling electricity in this scenario</span></div></div>
              <small>Calculated from the two energy totals × your electricity rate. No personalised savings guarantee or emissions figure.</small>
            </div>
          </div>
          {(result.baseline.unmetComfortHours > 0 || result.improved.unmetComfortHours > 0) && <div className={styles.comfortNote} role="status"><strong>The temperature target wasn’t always met.</strong><p>During scheduled cooling, the model remained above the target for {number.format(result.baseline.unmetComfortHours)} hours before and {number.format(result.improved.unmetComfortHours)} hours after, per example day. These costs do not establish equivalent comfort.</p></div>}
          <div className={styles.resultFooter}><p>{result.installedCostAud === null ? "Upfront cost: add an installed quote when you have one." : `Upfront cost, reported by you: ${money.format(result.installedCostAud)}. ${input.installedCostScope}`}<small>Running costs and installation costs are kept separate.</small></p><button className={styles.primary} type="button" disabled={selected} onClick={onChoose}>{selected ? "Shading is in your plan ✓" : "Add shading to my plan →"}</button></div>
          <details className={styles.disclosure}><summary><span><strong>What this comparison assumes</strong><small>Inputs, method and limits</small></span><span aria-hidden="true">+</span></summary><div className={styles.disclosureBody}><ul>{result.assumptions.map(item => <li key={item}>{item}</li>)}</ul><h4>Keep in mind</h4><ul>{result.limitations.map(item => <li key={item}>{item}</li>)}</ul><p>Method: {result.methodVersion}. <a href="https://www.yourhome.gov.au/passive-design/shading" target="_blank" rel="noopener noreferrer">Read Your Home’s shading guidance ↗<span className={styles.srOnly}> (opens in a new tab)</span></a>. This guidance supports the shading principle, not the numerical result for your room.</p></div></details>
        </> : <div className={styles.incomplete} role="status"><strong>{!input.assumptionsAccepted ? "Review the assumptions to see your comparison." : "A few details still need attention."}</strong><p>Unknowns stay unknown. Add the remaining details or use the labelled example to explore a scenario.</p>{[...result.missing, ...result.errors].length > 0 && <ul>{[...result.missing, ...result.errors].map(item => <li key={item}>{item}</li>)}</ul>}<button className={styles.textButton} type="button" onClick={() => moveTo(0)}>Review my inputs →</button></div>}
      </>}

      <div className={styles.navigation}>
        {step > 0 ? <button className={styles.textButton} type="button" onClick={() => moveTo(step - 1)}>← {steps[step - 1]}</button> : <small>Only this window’s shading changes.</small>}
        {step < 2 && <button className={styles.primary} type="button" onClick={() => moveTo(step + 1)}>{step === 0 ? "Continue to cooling" : "Review the comparison"} <span aria-hidden="true">→</span></button>}
      </div>
    </div>
  </section>;
}
