import { createBrowserPersistence, type Persistence } from "../../lib/persistence/browser-storage.ts";
import { assessmentJourney, emptyAssessment, isAssessmentDraft, resumeAssessment, type AssessmentDraft } from "./state.ts";
import { materialSignature } from "../../domain/material-signature.ts";

export const ASSESSMENT_STORAGE_KEY = "home-heat-planner:assessment:v1";
export interface AssessmentSnapshot { ready: boolean; draft: AssessmentDraft; notice: string | null }
const initialSnapshot: AssessmentSnapshot = { ready: false, draft: emptyAssessment(), notice: null };
/** Storage lives behind the existing abstraction; UI never reads localStorage. */
export function createAssessmentRepository(persistence: Persistence<AssessmentDraft>) {
  let activePersistence = persistence;
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initialSnapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate() {
      if (snapshot.ready) return;
      const loaded = activePersistence.load();
      snapshot = { ready: true, draft: loaded.ok && loaded.value ? resumeAssessment(loaded.value) : emptyAssessment(), notice: loaded.ok ? null : loaded.reason === "invalid-data" ? "Saved answers could not be read. Start again or clear this assessment." : "Answers will stay in this tab, but browser saving is unavailable. Refreshing may lose them." };
      notify();
    },
    save(draft: AssessmentDraft) {
      if (!isAssessmentDraft(draft)) throw new Error("Invalid assessment draft");
      const previous = snapshot.draft;
      const oldPlan = previous.coolingPlanDraft;
      const materialChange = JSON.stringify(previous.selectedTechniques) !== JSON.stringify(draft.selectedTechniques) || materialSignature(previous) !== materialSignature(draft) || previous.selectedOption?.recordedAt !== draft.selectedOption?.recordedAt;
      if (oldPlan?.savedAt.status === "known" && materialChange) {
        const priorEntry = previous.history?.find(entry => entry.plan.id === oldPlan.id);
        const checkIns = [...(priorEntry?.checkIns ?? []), ...(previous.followUpCheckIn?.savedAt.status === "known" ? [previous.followUpCheckIn] : [])].filter((c, i, all) => all.findIndex(other => other.updatedAt === c.updatedAt) === i).slice(-50);
        draft = { ...draft, history: [...(previous.history ?? []).filter(entry => entry.plan.id !== oldPlan.id), { plan: priorEntry?.plan ?? oldPlan, checkIns, archivedAt: new Date().toISOString(), reason: "Comparison inputs or selected action changed. Original estimate retained." }].slice(-50) };
      }
      const result = activePersistence.save(draft);
      snapshot = { ready: true, draft, notice: result.ok ? null : "Answers will stay in this tab, but could not be saved. Refreshing may lose them." };
      notify();
    },
    clear() {
      const result = activePersistence.remove();
      snapshot = { ready: true, draft: emptyAssessment(), notice: result.ok ? null : "Answers cleared in this tab. Browser storage could not be cleared; previously saved answers may return after a refresh." };
      notify();
    },
    getJourney: () => assessmentJourney(snapshot.draft),
    /** Account transitions replace the whole store, without archiving another user's plan. */
    switchPersistence(next: Persistence<AssessmentDraft>) {
      activePersistence = next;
      snapshot = initialSnapshot;
      this.hydrate();
    },
  };
}
export const assessmentRepository = createAssessmentRepository(createBrowserPersistence(ASSESSMENT_STORAGE_KEY, isAssessmentDraft));
