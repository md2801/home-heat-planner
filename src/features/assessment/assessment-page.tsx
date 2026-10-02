"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BedroomCrossSection } from "@/components/illustrations/bedroom-cross-section";
import type { AnswerValue } from "@/domain/models";
import { activeQuestions, CORE_QUESTION_IDS, type Question } from "./questions";
import { answerFor, assessmentDestination, canContinue, canSeeAssessment, finishAssessment, moveAssessment, updateAnswer, validValue } from "./state";
import { assessmentRepository } from "./repository";
import styles from "./assessment.module.css";
import { IntakeAssistant } from "./intake-assistant";

function AnswerIcon({ kind }: { kind?: string }) {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
    {kind === "unknown" ? <g stroke="var(--color-line)" strokeWidth="1.6"><circle cx="20" cy="20" r="15" /><text x="20" y="27" textAnchor="middle" fill="var(--color-muted)" stroke="none" fontSize="24" fontWeight="600">?</text></g> : kind === "overnight" ? <path d="M22 5C10 4 4 15 7 25C11 38 28 38 34 25C21 29 14 16 22 5Z" fill="#bfc3c2" /> : kind ? <g stroke="var(--color-heat-light)" strokeWidth="1.6" strokeLinecap="round">
      <path d="M20 4V8M4 20H8M32 20H36M8 8L11 11M29 11L32 8" />
      {kind === "morning" ? <><circle cx="20" cy="20" r="9" fill="var(--color-heat-light)" /><path d="M20 32V36M8 32L11 29M29 29L32 32" /></> : <><path d="M11 23A9 9 0 0 1 29 23Z" fill="var(--color-heat-light)" /><path d="M7 27H33M12 31H28M17 35H23" /></>}
    </g> : <g stroke="var(--color-cooling)" strokeWidth="1.3"><path d="M7 20L20 9L33 20V33H7Z" /><path d="M17 33V23H23V33" /></g>}
  </svg>;
}
function Mark({ selected }: { selected: boolean }) {
  return <span className={styles.mark} aria-hidden="true">{selected && <svg viewBox="0 0 24 24" fill="none"><path d="M6 12L10 16L18 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>;
}
function QuestionInput({ question }: { question: Question }) {
  const { draft } = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const answer = draft.answers[question.id];
  const [raw, setRaw] = useState(answer?.status === "known" ? String(answer.value) : "");
  const setAnswer = (value: AnswerValue | null) => assessmentRepository.save(updateAnswer(draft, question, answerFor(question, value, new Date().toISOString())));
  const unsure = answer?.status === "unknown";
  const selectedValues = answer?.status === "known" ? answer.value : undefined;
  const unknownControl = <label className={`${styles.option} ${unsure ? styles.selected : ""}`}>
    <input type={question.multiple ? "checkbox" : "radio"} name={question.id} checked={unsure} onChange={() => { setRaw(""); setAnswer(null); }} />
    <AnswerIcon kind="unknown" /><span>Not sure</span><Mark selected={unsure} />
  </label>;
  if (question.kind === "choice") return <fieldset className={styles.answers} aria-describedby={question.hint ? "question-hint" : undefined}>
    <legend className="sr-only">{question.title}</legend>
    {question.choices?.map(choice => {
      const selected = Array.isArray(selectedValues) ? selectedValues.includes(String(choice.value)) : selectedValues === choice.value;
      return <label key={String(choice.value)} className={`${styles.option} ${selected ? styles.selected : ""}`}>
        <input type={question.multiple ? "checkbox" : "radio"} name={question.id} checked={selected} onChange={() => {
          if (!question.multiple) { setAnswer(choice.value); return; }
          const previous = Array.isArray(selectedValues) ? selectedValues : [];
          const value = String(choice.value);
          const next = selected ? previous.filter(item => item !== value) : value === "none" ? [value] : [...previous.filter(item => item !== "none"), value];
          if (next.length) setAnswer(next);
          else { const answers = { ...draft.answers }; delete answers[question.id]; assessmentRepository.save({ ...draft, answers, completed: false }); }
        }} />
        <AnswerIcon {...(choice.icon ? { kind: choice.icon } : {})} /><span>{choice.label}</span><Mark selected={selected} />
      </label>;
    })}
    {unknownControl}
  </fieldset>;
  const invalid = raw !== "" && !validValue(question, question.kind === "number" ? Number(raw) : raw.trim());
  const start = draft.answers.periodStart;
  const dateOrderInvalid = question.id === "periodEnd" && !!raw && start?.status === "known" && raw < String(start.value);
  return <fieldset className={styles.answers} aria-describedby={question.hint ? "question-hint" : undefined}>
    <legend className="sr-only">{question.title}</legend>
    <label className={styles.fieldLabel} htmlFor={`answer-${question.id}`}>{question.unit ?? (question.kind === "date" ? "Date" : "Your answer")}</label>
    <input id={`answer-${question.id}`} className={styles.textInput} type={question.kind === "text" ? "text" : question.kind} value={raw} min={question.kind === "number" ? question.min ?? 0 : undefined} max={question.max} step={question.kind === "number" ? question.integer ? "1" : "any" : undefined} maxLength={question.maxLength} aria-describedby={question.hint ? "question-hint input-error" : "input-error"} aria-invalid={invalid || dateOrderInvalid} onInput={event => {
      const text = event.currentTarget.value;
      setRaw(text);
      const value = question.kind === "number" ? Number(text) : text.trim();
      if (text.trim() && validValue(question, value)) setAnswer(value);
      else { const answers = { ...draft.answers }; delete answers[question.id]; assessmentRepository.save({ ...draft, answers, completed: false }); }
    }} />
    <p id="input-error" className={styles.inputError} aria-live="polite">{dateOrderInvalid ? "Choose an end date on or after the start date, or Not sure." : invalid ? question.kind === "number" ? `Enter a non-negative ${question.integer ? "whole " : ""}number${question.max !== undefined ? ` up to ${question.max}` : ""}, or choose Not sure.` : "Enter a valid answer, or choose Not sure." : ""}</p>
    {unknownControl}
  </fieldset>;
}
export function AssessmentPage() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(assessmentRepository.subscribe, assessmentRepository.getSnapshot, assessmentRepository.getServerSnapshot);
  const { draft, ready, notice } = snapshot;
  const active = activeQuestions(draft.answers);
  const index = active.findIndex(q => q.id === draft.currentQuestionId);
  const question = active[index] ?? active[0]!;
  const optional = canSeeAssessment(draft);
  const coreProgress = Math.min(index + 1, CORE_QUESTION_IDS.length);
  const heading = useRef<HTMLHeadingElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearCount, setClearCount] = useState(0);
  useEffect(() => { assessmentRepository.hydrate(); }, []);
  useEffect(() => { if (ready) heading.current?.focus(); }, [question.id, ready]);
  const heatTiming = draft.answers.heatTiming;
  const heat = heatTiming?.status === "known" && Array.isArray(heatTiming.value) ? heatTiming.value : [];
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="4" fill="var(--color-heat-light)" stroke="var(--color-forest)" strokeWidth="2" /><path d="M8 25C9 9 19 15 25 7C26 20 19 25 12 23M7 26L21 13M12 21L13 15M16 18L22 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Home Heat Planner</span></Link>
      <nav aria-label="Main navigation" className={styles.navigation}><Link href="/cooling-plan">My Plan</Link><Link href="/#how-it-works">How it works</Link><Link href="/#help">Help</Link></nav>
    </header>
    <div className={styles.layout}>
      <section className={styles.questionPanel} aria-labelledby="assessment-question">
        <div className={styles.progress}><span>{optional ? `Optional details · ${question.context}` : `${index + 1} of ${CORE_QUESTION_IDS.length} · ${question.context}`}</span><div className={styles.progressTrack} role="progressbar" aria-label="Core assessment progress" aria-valuemin={0} aria-valuemax={CORE_QUESTION_IDS.length} aria-valuenow={coreProgress}><i style={{ width: `${(coreProgress / CORE_QUESTION_IDS.length) * 100}%` }} /></div></div>
        <h1 id="assessment-question" ref={heading} tabIndex={-1}>{question.title}</h1>
        {ready && <IntakeAssistant draft={draft} />}
        {question.hint && <p id="question-hint" className={`${styles.hint} ${question.id === "heatTiming" ? styles.heatHint : ""}`}>{question.hint}</p>}
        {ready ? <form onSubmit={event => {
          event.preventDefault();
          if (!canContinue(question, draft.answers)) return;
          const next = moveAssessment(draft, "continue");
          assessmentRepository.save(next);
          const destination = assessmentDestination(next);
          if (destination) router.push(destination);
        }}>
          <QuestionInput key={`${question.id}-${clearCount}`} question={question} />
          <details key={`why-${question.id}`} className={styles.why}><summary>Why this matters <span aria-hidden="true">⌄</span></summary><p>{question.why}</p></details>
          {optional && <p className={styles.optionalNote}>You’ve given us enough to continue. More answers can refine your assessment.</p>}
          <div className={styles.actions}><button type="submit" className={styles.continue} disabled={!canContinue(question, draft.answers)}>Continue <span aria-hidden="true">→</span></button><button type="button" className={styles.back} onClick={() => {
            if (index === 0) router.push("/");
            else assessmentRepository.save(moveAssessment(draft, "back"));
          }}>Back</button>{optional && <button type="button" className={styles.seeAssessment} onClick={() => {
            const next = finishAssessment(draft);
            assessmentRepository.save(next);
            const destination = assessmentDestination(next);
            if (destination) router.push(destination);
          }}>See my assessment</button>}</div>
        </form> : <p role="status" className={styles.hint}>Loading your answers…</p>}
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        <div className={styles.saved}><span>You can leave details unknown.</span>{ready && (confirmClear ? <span>Clear saved answers? <button onClick={() => { assessmentRepository.clear(); setClearCount(count => count + 1); setConfirmClear(false); }}>Clear</button><button onClick={() => setConfirmClear(false)}>Cancel</button></span> : <button onClick={() => setConfirmClear(true)}>Clear assessment</button>)}</div>
      </section>
      <aside className={styles.roomVisual} aria-label="Illustrative bedroom">
        <figure><BedroomCrossSection /><figcaption>Illustrative room · not a simulation of your home</figcaption></figure>
        <div className={styles.timeline} aria-label="Illustrative sun timeline"><span>Sun</span><div className={styles.timelineTrack}><div className={styles.timelineLine} />{["morning", "midday", "afternoon"].map((time, i) => <span key={time} className={heat.includes(time) ? styles.activeTime : ""} style={{ left: `${[5, 50, 87][i]}%` }}><i aria-hidden="true" />{time[0]!.toUpperCase() + time.slice(1)}</span>)}<i className={styles.endDot} aria-hidden="true" /></div></div>
      </aside>
    </div>
  </div>;
}
