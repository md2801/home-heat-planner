import { createBrowserPersistence, type Persistence } from "../../lib/persistence/browser-storage.ts";
import { assessmentJourney, emptyAssessment, isAssessmentDraft, resumeAssessment, type AssessmentDraft } from "./state.ts";

export const ASSESSMENT_STORAGE_KEY = "home-heat-planner:assessment:v1";
export interface AssessmentSnapshot { ready: boolean; draft: AssessmentDraft; notice: string | null }
const initialSnapshot: AssessmentSnapshot = { ready: false, draft: emptyAssessment(), notice: null };
/** Storage lives behind the existing abstraction; UI never reads localStorage. */
export function createAssessmentRepository(persistence: Persistence<AssessmentDraft>) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initialSnapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate() {
      if (snapshot.ready) return;
      const loaded = persistence.load();
      snapshot = { ready: true, draft: loaded.ok && loaded.value ? resumeAssessment(loaded.value) : emptyAssessment(), notice: loaded.ok ? null : loaded.reason === "invalid-data" ? "Saved answers could not be read. Start again or clear this assessment." : "Answers will stay in this tab, but browser saving is unavailable. Refreshing may lose them." };
      notify();
    },
    save(draft: AssessmentDraft) {
      if (!isAssessmentDraft(draft)) throw new Error("Invalid assessment draft");
      const result = persistence.save(draft);
      snapshot = { ready: true, draft, notice: result.ok ? null : "Answers will stay in this tab, but could not be saved. Refreshing may lose them." };
      notify();
    },
    clear() {
      const result = persistence.remove();
      snapshot = { ready: true, draft: emptyAssessment(), notice: result.ok ? null : "Answers cleared in this tab. Browser storage could not be cleared; previously saved answers may return after a refresh." };
      notify();
    },
    getJourney: () => assessmentJourney(snapshot.draft),
  };
}
export const assessmentRepository = createAssessmentRepository(createBrowserPersistence(ASSESSMENT_STORAGE_KEY, isAssessmentDraft));
