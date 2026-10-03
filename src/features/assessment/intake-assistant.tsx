"use client";
import { useState } from "react";
import type { AssessmentDraft } from "./state";
import { answerFor, updateAnswer } from "./state";
import { questions } from "./questions";
import { allowedIntakeQuestions } from "./intake-questions";
import { plannerClient } from "../../services/planner";
import { isIntakeSuggestion, type IntakeSuggestion } from "../../contracts/intake";
import styles from "./assessment.module.css";
export function IntakeAssistant({ draft }: { draft: AssessmentDraft }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState<IntakeSuggestion | null>(null);
  const complaint = draft.answers.complaint?.status === "known" ? String(draft.answers.complaint.value) : "";
  const allowed = allowedIntakeQuestions(draft);
  const currentSuggestion = suggestion && allowed.includes(suggestion.questionId) ? suggestion : null;
  const saveComplaint = (text: string) => {
    const question = questions.find(q => q.id === "complaint")!;
    const current = plannerClient.getSnapshot().draft;
    if (text.trim()) plannerClient.save(updateAnswer(current, question, answerFor(question, text, new Date().toISOString())));
    else { const answers = { ...current.answers }; delete answers.complaint; plannerClient.save({ ...current, answers }); }
    setSuggestion(null);
  };
  const requestSuggestion = async () => {
    setPending(true); setMessage(""); setSuggestion(null);
    try {
      const response = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ complaint, allowedQuestionIds: allowed }), signal: AbortSignal.timeout(12000) });
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "ok" in data && data.ok === true && "suggestion" in data && isIntakeSuggestion(data.suggestion, allowedIntakeQuestions(plannerClient.getSnapshot().draft))) setSuggestion(data.suggestion);
      else setMessage("Assistance is unavailable or the question has changed. Retry or continue manually; your answers are retained.");
    } catch { setMessage("Assistance could not finish. Retry or continue manually."); }
    finally { setPending(false); }
  };
  return <details className={styles.assistant}>
    <summary>Describe the problem to help choose a question</summary>
    <p>Your description is saved in this browser for review. Suggest a question sends it to OpenAI. Leave out addresses and personal details. No room facts or savings are inferred.</p>
    <label htmlFor="heat-complaint">What feels uncomfortable?</label>
    <textarea id="heat-complaint" rows={3} maxLength={500} value={complaint} onChange={event => saveComplaint(event.target.value)} />
    <button type="button" disabled={pending || !complaint.trim() || !allowed.length} onClick={requestSuggestion}>{pending ? "Choosing a question…" : "Suggest a question"}</button>
    {currentSuggestion && <p>Suggested question: {questions.find(q => q.id === currentSuggestion.questionId)?.title} <button type="button" onClick={() => {
      const current = plannerClient.getSnapshot().draft;
      if (allowedIntakeQuestions(current).includes(currentSuggestion.questionId)) plannerClient.save({ ...current, currentQuestionId: currentSuggestion.questionId, completed: false });
    }}>Answer this question</button></p>}
    <p role="status">{message}</p>
  </details>;
}
