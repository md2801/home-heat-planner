import { createBrowserPersistence } from "../../lib/persistence/browser-storage";
import { isSceneRecord, type SceneRecord } from "./model";
export const sceneStorage = createBrowserPersistence<SceneRecord>("home-heat-planner:room-scene:v1", isSceneRecord);
