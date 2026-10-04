"use client";

import Link from "next/link";
import { useState } from "react";
import type { AssessmentDraft } from "../assessment/state";
import { plannerClient } from "../../services/planner";
import { selectCoolingOption } from "../cooling-options/model";
import { currentShadingInput, hasRoomOnlyCooling, hasShadingCooling, initialShadingInput, saveShadingInput, shadingRoomSignature } from "./integration";
import { ShadingScenario } from "./shading-scenario";
import styles from "./shading-scenario.module.css";

export function ShadingComparison({ draft, selected }: { draft: AssessmentDraft; selected: boolean }) {
  const [openedAt] = useState(() => new Date().toISOString());
  if (!hasShadingCooling(draft)) return null;
  if (!hasRoomOnlyCooling(draft)) return <section id="shading-savings" className={styles.scopeNotice}><h2>What could window shade save?</h2><p>This room comparison needs a cooling system that serves just this bedroom. Confirm the rooms it serves before comparing electricity costs.</p><Link href="/assessment" onClick={() => plannerClient.save({ ...draft, currentQuestionId: "servesOnlyRoom", completed: false })}>Review rooms served →</Link></section>;
  const current = currentShadingInput(draft);
  return <div>
    {draft.shadingScenario && !current && <p role="status">Your room details changed. Review the shading assumptions again before using a new result. Earlier saved estimates remain in your plan history.</p>}
    <ShadingScenario key={shadingRoomSignature(draft)} input={current ?? initialShadingInput(draft, openedAt)} selected={selected} onChange={input => plannerClient.save(saveShadingInput(plannerClient.getSnapshot().draft, input))} onChoose={() => plannerClient.save(selectCoolingOption(plannerClient.getSnapshot().draft, "external-shading", new Date().toISOString()))} />
  </div>;
}
