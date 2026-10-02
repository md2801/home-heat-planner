"use client";
import { useState } from "react";
import type { AssessmentDraft } from "./state";
import { activeQuestions, questions, CORE_QUESTION_IDS } from "./questions";
import { plannerClient } from "../../services/planner";
import { isIntakeSuggestion, type IntakeSuggestion } from "../../contracts/intake";
import styles from "./assessment.module.css";
export function IntakeAssistant({ draft }: { draft: AssessmentDraft }) {
  const [complaint, setComplaint] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const [suggestion, setSuggestion] = useState<IntakeSuggestion | null>(null);
  const missingCore = CORE_QUESTION_IDS.filter(id => !draft.answers[id]);
  const allowed = missingCore.length ? [missingCore[0]!] : activeQuestions(draft.answers).filter(q => !draft.answers[q.id]).map(q => q.id);
  return <details className={styles.assistant}><summary>Describe the problem to help choose a question</summary><p>Optional: this sends your description to OpenAI to suggest a question. Leave out addresses and personal details. It does not fill in room facts or calculate savings.</p><label htmlFor="heat-complaint">What feels uncomfortable?</label><textarea id="heat-complaint" rows={3} maxLength={500} value={complaint} onChange={event => { setComplaint(event.target.value); setSuggestion(null); }} /><button type="button" disabled={pending || !complaint.trim() || !allowed.length} onClick={async () => { setPending(true); setMessage(""); setSuggestion(null); try { const response = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complaint, allowedQuestionIds: allowed }), signal: AbortSignal.timeout(12000) }); const data: unknown = await response.json(); if (data && typeof data === "object" && "ok" in data && data.ok && "suggestion" in data && isIntakeSuggestion(data.suggestion, allowed)) setSuggestion(data.suggestion); else setMessage("Assistance is unavailable. Retry or continue with the manual questions; your answers are retained."); } catch { setMessage("Assistance could not finish. Retry or continue manually."); } finally { setPending(false); } }}>{pending ? "Choosing a question…" : "Suggest a question"}</button>{suggestion && <p>Suggested question: {questions.find(q => q.id === suggestion.questionId)?.title} <button type="button" onClick={() => plannerClient.save({ ...draft, currentQuestionId: suggestion.questionId, completed: false })}>Answer this question</button></p>}<p role="status">{message}</p></details>;
}
