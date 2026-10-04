import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { JourneyInput, PlanSaveRequest, CheckInSaveRequest, SaveResponse } from "../../contracts/journey.ts";
import { calculationDraft } from "../../contracts/journey.ts";
import { materialSignature } from "../../domain/material-signature.ts";
import { safeJson } from "../../domain/history.ts";
import { coolingPlan, isPlanForSelection, canSavePlan } from "../../features/cooling-plan/model.ts";
import { followUp, isCheckInForPlan } from "../../features/follow-up/model.ts";
import { isJourneyInput, isPlanSaveRequest, isCheckInSaveRequest, selectionForPlan } from "./validation.ts";
import type { AssessmentReceipt, JourneyStore, SavedJourney } from "./types.ts";

export class JourneyError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export const validAssessmentId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
export const validAccessToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const invalid = () => new JourneyError(400, "invalid-input", "Review the supplied journey values.");
const conflict = (message: string) => new JourneyError(409, "conflict", message);
const saved: SaveResponse = { saved: true, scope: "server" };

export function createJourneyService(store: JourneyStore, now = () => new Date().toISOString()) {
  async function read(id: string, token: string) {
    if (!validAccessToken(token)) throw new JourneyError(401, "unauthorized", "An assessment access token is required.");
    if (!validAssessmentId(id)) throw new JourneyError(404, "not-found", "Saved journey not found.");
    const result = await store.read(id, digest(token));
    if (!result) throw new JourneyError(404, "not-found", "Saved journey not found.");
    return result;
  }
  async function mutate(id: string, token: string, update: (document: SavedJourney) => SavedJourney) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await read(id, token);
      const next = update(current.document);
      if (await store.replace(id, digest(token), current.revision, next)) return;
    }
    throw conflict("The journey changed while saving. Restore it and retry.");
  }
  function archive(document: SavedJourney): SavedJourney {
    if (!document.plan) return document;
    return { ...document, plan: null, followUp: null, checkIns: [], selection: {}, history: [...document.history, { plan: document.plan, checkIns: document.checkIns, archivedAt: now(), reason: "Assessment inputs or selected action changed. Original snapshot retained." }].slice(-50) };
  }
  return {
    async create(input: JourneyInput): Promise<AssessmentReceipt> {
      if (!isJourneyInput(input)) throw invalid();
      const id = randomUUID(), token = randomBytes(32).toString("base64url");
      await store.create(id, digest(token), { assessment: input.assessment, selection: {}, plan: null, followUp: null, checkIns: [], history: [] });
      return { ...saved, assessmentId: id, accessToken: token };
    },
    async restore(id: string, token: string): Promise<SavedJourney> { return (await read(id, token)).document; },
    async saveAssessment(id: string, token: string, input: JourneyInput): Promise<AssessmentReceipt> {
      if (!isJourneyInput(input)) throw invalid();
      await mutate(id, token, document => {
        const changed = materialSignature(document.assessment) !== materialSignature(input.assessment);
        return { ...(changed ? archive(document) : document), assessment: input.assessment };
      });
      return { ...saved, assessmentId: id };
    },
    async savePlan(id: string, token: string, input: PlanSaveRequest): Promise<SaveResponse> {
      if (!isPlanSaveRequest(input, id)) throw invalid();
      await mutate(id, token, document => {
        const plan = input.plan;
        const selection = selectionForPlan(document.assessment, plan);
        if (!selection) throw conflict("The plan does not match the saved assessment.");
        const expected = coolingPlan({ ...calculationDraft(document.assessment), ...selection }, now()).plan;
        if (!expected || !safeJson(plan) || !isPlanForSelection(plan, expected) || plan.savedAt.status !== "known" || !canSavePlan(plan)) throw invalid();
        const current = document.plan;
        if (current?.id === plan.id && current.selectionSignature !== plan.selectionSignature || document.history.some(entry => entry.plan.id === plan.id)) throw conflict("Use a new plan identity for a changed selection.");
        if (current?.id === plan.id && (current.createdAt !== plan.createdAt || Date.parse(plan.updatedAt) < Date.parse(current.updatedAt))) throw conflict("This plan update is older than the saved plan.");
        if (current?.id === plan.id) {
          const editable = new Set(["updatedAt", "savedAt", "checkInChoice", "checkInDate", "checklist"]);
          if (Object.keys(current).filter(key => !editable.has(key)).some(key => JSON.stringify(current[key as keyof typeof current]) !== JSON.stringify(plan[key as keyof typeof plan]))) throw conflict("Saved plan evidence and baseline observations cannot change. Choose a new plan instead.");
        }
        if (current?.id === plan.id && plan.updatedAt === current.updatedAt && JSON.stringify(plan) !== JSON.stringify(current)) throw conflict("This plan version is already saved with different values.");
        const next = current && current.id !== plan.id ? archive(document) : document;
        return { ...next, selection, plan };
      });
      return saved;
    },
    async saveCheckIn(id: string, token: string, input: CheckInSaveRequest): Promise<SaveResponse> {
      if (!isCheckInSaveRequest(input, id)) throw invalid();
      await mutate(id, token, document => {
        const checkIn = input.checkIn;
        if (!document.plan || document.plan.id !== checkIn.planId) throw conflict("This check-in does not belong to the current saved plan.");
        const expected = followUp({ ...calculationDraft(document.assessment), ...document.selection, coolingPlanDraft: document.plan }, now()).checkIn;
        if (!expected || !isCheckInForPlan(checkIn, expected) || checkIn.savedAt.status !== "known" || checkIn.status.status !== "known") throw invalid();
        const existing = document.checkIns.find(c => c.id === checkIn.id && c.updatedAt === checkIn.updatedAt);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(checkIn)) throw conflict("This check-in version is already saved with different observations.");
          return document;
        }
        if (document.checkIns.some(c => c.id === checkIn.id && c.createdAt !== checkIn.createdAt)) throw conflict("The check-in creation date cannot change.");
        const checkIns = [...document.checkIns, checkIn].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt)).slice(-50);
        return { ...document, checkIns, followUp: checkIns.at(-1)! };
      });
      return saved;
    },
    async clear(id: string, token: string): Promise<SaveResponse> {
      await read(id, token);
      if (!await store.remove(id, digest(token))) throw new JourneyError(404, "not-found", "Saved journey not found.");
      return saved;
    },
  };
}
export type JourneyService = ReturnType<typeof createJourneyService>;
