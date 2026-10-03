"use client";

import { useRef, useState } from "react";
import type { RoomProfile } from "../../domain/models";
import type { AssessmentDraft } from "../assessment/state";
import { ReplacementInputForm } from "./replacement-inputs";
import styles from "./cooling-options.module.css";

export function ReplacementComparison({ draft, profile, storageNotice }: { draft: AssessmentDraft; profile: RoomProfile; storageNotice: string | null }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [finishedLater, setFinishedLater] = useState(false);
  function finishLater() {
    if (disclosure.current) {
      disclosure.current.open = false;
      disclosure.current.querySelector("summary")?.focus();
    }
    setFinishedLater(true);
  }
  return <>
    <details ref={disclosure} id="ac-cost-comparison" className={styles.optionalSection}>
      <summary><span><strong>Considering an AC replacement?</strong><small>Compare costs and savings after reviewing room improvements</small></span><span aria-hidden="true">⌄</span></summary>
      <div className={styles.optionalBody}>
        <p>Compare your current AC with a replacement, one step at a time. Add only details you can confirm.</p>
        <ReplacementInputForm draft={draft} profile={profile} storageNotice={storageNotice} onFinishLater={finishLater} />
      </div>
    </details>
    {finishedLater && <p role="status" className={styles.notice}>{storageNotice ? "You can return to your progress in this tab. Browser saving is unavailable." : draft.replacement ? "Your comparison progress is saved in this browser. Return when you have the remaining details." : "You can come back to this comparison when you’re ready."}</p>}
  </>;
}
