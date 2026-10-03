import { isRoomScene, type SceneRequest, type SceneResponse } from "../contracts/room-scene";
export async function requestRoomScene(input: SceneRequest, signal: AbortSignal): Promise<SceneResponse> {
  try {
    const response = await fetch("/api/room-scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal });
    const data: unknown = await response.json();
    if (response.ok && data && typeof data === "object" && "ok" in data && data.ok === true && "scene" in data && isRoomScene(data.scene)) return { ok: true, scene: data.scene };
    if (data && typeof data === "object" && "ok" in data && data.ok === false && "message" in data && typeof data.message === "string" && data.message.length <= 250) return { ok: false, message: data.message };
  } catch { /* No generated text or provider errors are surfaced. Manual input remains available. */ }
  return { ok: false, message: "We couldn’t build a proposal from that description. Retry or use the manual controls; your diagram is unchanged." };
}
