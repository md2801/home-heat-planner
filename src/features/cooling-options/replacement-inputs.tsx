"use client";

import { useEffect, useRef, useState } from "react";
import type { AssessmentDraft } from "../assessment/state";
import type { RoomProfile } from "../../domain/models";
import { plannerClient as assessmentRepository } from "../../services/planner";
import { emptyReplacement, LABEL_SOURCE, type ReplacementCheck, type ReplacementField, type ReplacementStep } from "./replacement";
import { comparisonSteps, fieldCopy, fieldType, resumeReplacementStep } from "./replacement-guide";
import { ReplacementResults } from "./replacement-results";
import styles from "./replacement-guide.module.css";

type GuideProps = { draft: AssessmentDraft; profile: RoomProfile; storageNotice: string | null; onFinishLater: () => void };
export function ReplacementInputForm({ draft, profile, storageNotice, onFinishLater }: GuideProps) {
  const [step, setStep] = useState<ReplacementStep>(() => resumeReplacementStep(draft.replacement));
  const heading = useRef<HTMLHeadingElement>(null);
  const requestedFocus = useRef(false);
  const input = draft.replacement ?? emptyReplacement(new Date().toISOString());
  useEffect(() => { if (requestedFocus.current) { heading.current?.focus(); requestedFocus.current = false; } }, [step]);
  function goTo(next: ReplacementStep) {
    if (step === next) return;
    requestedFocus.current = true; setStep(next);
    if (draft.replacement) assessmentRepository.save({ ...draft, replacement: { ...input, step: next } });
  }
  function update(field: ReplacementField, value: string) {
    assessmentRepository.save({ ...draft, replacement: { ...input, step, updatedAt: new Date().toISOString(), fields: { ...input.fields, [field]: value } } });
  }
  function confirm(check: ReplacementCheck, value: boolean) {
    assessmentRepository.save({ ...draft, replacement: { ...input, step, updatedAt: new Date().toISOString(), confirmations: { ...input.confirmations, [check]: value } } });
  }
  const field = (id: ReplacementField) => <GuideField key={id} id={id} value={input.fields[id] ?? ""} onChange={value => update(id, value)} />;
  const current = step === 0;
  return <section id="replacement-inputs" className={styles.guide} aria-label="Guided AC comparison">
    <nav aria-label="AC comparison steps"><ol className={styles.steps}>{comparisonSteps.map((label, index) => <li key={label}><button type="button" aria-current={step === index ? "step" : undefined} onClick={() => goTo(index as ReplacementStep)}><span className={styles.stepNumber}>{index + 1}</span><span>{label}</span></button></li>)}</ol></nav>
    <div className={styles.stepHeading}><span>STEP {step + 1} OF 4</span><h3 ref={heading} tabIndex={-1}>{["Let’s start with the AC you have", "Which AC are you considering?", "What would it cost you?", "Your AC comparison"][step]}</h3><p>{[
      "Have the model label or manual nearby. Add what you know; you can fill in the rest later.",
      "Use the replacement’s energy label to compare equivalent cooling. Your installer can help confirm the right size.",
      "A few details from your electricity bill and installation quote connect energy use to money.",
      "Review the two systems, then confirm the details needed for a fair comparison."
    ][step]}</p></div>
    {step < 2 ? <div className={styles.workArea}><div>
      <div className={styles.fields}>{field(current ? "existingModel" : "proposedModel")}{field(current ? "existingCapacity" : "proposedCapacity")}{field(current ? "existingKwh" : "proposedKwh")}</div>
      <details className={styles.moreDetails}><summary>Add a link to the energy label <span aria-hidden="true">⌄</span></summary><p>A model-specific label link is needed before savings can be calculated. You can add it later.</p>{field(current ? "existingSource" : "proposedSource")}</details>
    </div><aside className={styles.helper} aria-label="Help with energy label details"><svg viewBox="0 0 64 40" fill="none" aria-hidden="true"><rect x="3" y="3" width="58" height="23" rx="5" /><path d="M10 19H54M17 31V37M32 31V37M47 31V37M14 34L17 37L20 34M29 34L32 37L35 34M44 34L47 37L50 34" /></svg><h4>Finding the right figures</h4><p>Use the Zoned Energy Rating Label for this exact model pair.</p><ol><li><strong>Model numbers</strong><span>Match both the indoor and outdoor units.</span></li><li><strong>Cooling capacity</strong><span>The cooling output in kW at the top of the label.</span></li><li><strong>Yearly cooling energy</strong><span>The blue cooling kWh/year figure in the Average climate zone.</span></li></ol><details><summary>Help me find the label</summary><p>Check the unit’s model sticker, manual or supplier’s product page. If the current model has an older label, ask the supplier for a current Zoned Energy Rating Label. Leave the figures blank if you cannot find one.</p><a href="https://calculator.energyrating.gov.au/" target="_blank" rel="noopener noreferrer">Open Energy Rating Calculator ↗</a></details><a href={LABEL_SOURCE} target="_blank" rel="noopener noreferrer">See how to read the label ↗</a>{!current && input.fields.existingModel && <div className={styles.currentModel}><span>YOU’RE COMPARING WITH</span><strong>{input.fields.existingModel}</strong></div>}</aside></div> : step === 2 ? <div className={styles.workArea}><div>
      <div className={styles.fields}>{field("tariff")}{field("installedCost")}{field("quoteScope")}{field("quoteDate")}</div>
      <h4 className={styles.groupHeading}>Any extra yearly costs?</h4><p className={styles.groupHint}>Include ongoing costs beyond electricity. Enter zero only if there are none.</p><div className={styles.fields}>{field("existingRecurring")}{field("proposedRecurring")}</div>
    </div><aside className={styles.helper}><span className={styles.helperEyebrow}>FROM YOUR BILL TO YOUR COMPARISON</span><h4>Two different kinds of cost</h4><p><strong>Running costs</strong> depend on cooling energy and your electricity usage rate.</p><p><strong>The installed price</strong> is what you would pay upfront to replace the AC.</p><details><summary>Help me find my usage rate</summary><p>Look under electricity usage charges on your bill. If it lists cents per kWh, divide by one hundred to enter dollars per kWh here.</p><p>This calculator supports a flat usage rate. Multiple time-of-use rates and daily supply charges need a different comparison.</p></details><p>You don’t need a quote to save your progress. Add it when a provider has confirmed the price and inclusions.</p></aside></div> : <>
      <ReplacementResults draft={draft} profile={profile} onEdit={goTo} />
      <div className={styles.reviewArea}><div><h4 className={styles.groupHeading}>Before we compare</h4><p className={styles.groupHint}>Confirm only what you have checked. Unchecked details stay incomplete.</p><div className={styles.checkList}>{([
        ["climate", "I checked the climate zone", <>The Energy Rating Calculator confirms Average climate applies to my postcode. <a href="https://calculator.energyrating.gov.au/" target="_blank" rel="noopener noreferrer">Check my zone ↗</a></>],
        ["labels", "I used annual cooling energy", "Both values come from current Zoned Energy Rating Labels, in cooling kWh/year—not heating, electrical kW or cooling capacity."],
        ["sizing", "My installer confirmed these systems are comparable", "Both are non-ducted single-split ACs with the same rated capacity, comparable features and suitable sizing for this bedroom."],
        ["conditions", "Use the label’s standard annual conditions", "Average climate uses 840 cooling hours. This compares standard label costs; my actual use, comfort and bills may differ."],
      ] as const).map(([id, label, detail]) => <label key={id} className={styles.check}><input type="checkbox" checked={input.confirmations[id] ?? false} onChange={event => confirm(id, event.currentTarget.checked)} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}</div>{field("checkedDate")}</div><aside className={styles.helper}><h4>A fair comparison</h4><p>This compares cooling under the same annual label conditions. It does not predict your measured bedroom bill or prove that replacing the unit will improve comfort.</p>{(profile.cooling.status !== "known" || profile.cooling.value.servesOnlyRoom.status !== "known" || !profile.cooling.value.servesOnlyRoom.value) && <p>Confirm which rooms your current AC serves. <a href="/assessment" onClick={() => assessmentRepository.save({ ...draft, currentQuestionId: "servesOnlyRoom", completed: false })}>Review rooms served →</a></p>}{(profile.externalChangesPermitted.status !== "known" || !profile.externalChangesPermitted.value) && <p>Installation permission still needs confirmation. <a href="/assessment" onClick={() => assessmentRepository.save({ ...draft, currentQuestionId: "externalChangesPermitted", completed: false })}>Review permission →</a></p>}<details><summary>Expected service life (optional)</summary><p>A sourced service life helps you assess whether payback is realistic.</p>{field("serviceLife")}{field("serviceLifeSource")}</details></aside></div>
    </>}
    <div className={styles.navigation}><div><p className={styles.saveStatus} role="status">{storageNotice ? "Progress stays in this tab; browser saving is unavailable." : draft.replacement ? "Progress saved in this browser. You can return later." : "Details save automatically in this browser as you add them."}</p><button type="button" className={styles.finishLater} onClick={onFinishLater}>Finish later</button></div><div className={styles.navigationButtons}>{step > 0 && <button type="button" className={styles.back} onClick={() => goTo((step - 1) as ReplacementStep)}>← Back</button>}{step < 3 && <button type="button" className={styles.next} onClick={() => goTo((step + 1) as ReplacementStep)}>{step === 2 ? "Review comparison" : "Continue"}<span aria-hidden="true">→</span></button>}</div></div>
  </section>;
}

function GuideField({ id, value, onChange }: { id: ReplacementField; value: string; onChange: (value: string) => void }) {
  const copy = fieldCopy[id], type = fieldType(id);
  return <div className={`${styles.field} ${id === "existingModel" || id === "proposedModel" || id === "quoteScope" ? styles.wideField : ""}`}><label htmlFor={`replacement-${id}`}>{copy.label}</label><div className={styles.fieldInput}><input id={`replacement-${id}`} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} maxLength={500} aria-describedby={`replacement-${id}-hint`} value={value} onInput={event => onChange(event.currentTarget.value)} />{copy.unit && <span aria-hidden="true">{copy.unit}</span>}</div><small id={`replacement-${id}-hint`}>{copy.hint}{copy.unit && <span className={styles.srOnly}> Unit: {copy.unit}.</span>}</small></div>;
}
