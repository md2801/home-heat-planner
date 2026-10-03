import { questions } from "../features/assessment/questions.ts";
export interface IntakeRequest { complaint: string; allowedQuestionIds: string[] }
export interface IntakeSuggestion { category: "timing" | "shade" | "roof" | "cooling" | "unclear"; questionId: string }
export function isIntakeRequest(value: unknown): value is IntakeRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as IntakeRequest;
  return typeof v.complaint === "string" && !!v.complaint.trim() && v.complaint.length <= 500 && Array.isArray(v.allowedQuestionIds) && v.allowedQuestionIds.length > 0 && v.allowedQuestionIds.length <= questions.length && new Set(v.allowedQuestionIds).size === v.allowedQuestionIds.length && v.allowedQuestionIds.every(id => questions.some(q => q.id === id));
}
export function isIntakeSuggestion(value: unknown, allowed: string[]): value is IntakeSuggestion {
  if (!value || typeof value !== "object") return false;
  const v = value as IntakeSuggestion;
  return Object.keys(v).length === 2 && ["timing", "shade", "roof", "cooling", "unclear"].includes(v.category) && allowed.includes(v.questionId);
}
