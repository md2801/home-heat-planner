import { DynamicRoom as RoomScene } from "./dynamic-room";
import type { AssessmentDraft } from "../assessment/state";
import { assessmentScene, type SceneFocus } from "./assessment-scene";
import { equipmentPlacement } from "./equipment-details";

/** All journey screens project the same confirmed room; highlights never install an action. */
export function JourneyRoom({ draft, focus = "none" }: { draft: AssessmentDraft; focus?: SceneFocus }) {
  return <RoomScene scene={assessmentScene(draft.answers, draft.sceneDetails)} placement={equipmentPlacement(draft.answers)} focus={focus} />;
}
