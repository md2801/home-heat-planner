import { emptyAssessment, type AssessmentDraft } from "../../features/assessment/state.ts";
import { rewardTasks, type RewardTask } from "../../features/rewards/catalogue.ts";
import type { PhotoDecision, RewardsSnapshot } from "../../contracts/rewards.ts";
import { sameOriginRequest } from "../request-origin.ts";
import type { createRewardStore } from "./store.ts";
import { boundedForm, prepareProofPhoto, type ProofPhoto } from "./photos.ts";
import { boundedBody } from "../request-body.ts";
import { demoRewards } from "../../features/marketplace/catalogue.ts";

interface Dependencies {
  getUser: (request: Request) => Promise<string | null>;
  store: () => ReturnType<typeof createRewardStore>;
  draft: (user: string) => Promise<AssessmentDraft | null>;
  available: () => boolean;
  assess: (task: RewardTask, photos: ProofPhoto[], notes: string) => Promise<PhotoDecision | null>;
  prepare?: typeof prepareProofPhoto;
}
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie", "Referrer-Policy": "no-referrer" } });
async function identity(request: Request, deps: Dependencies) {
  if (!sameOriginRequest(request) || request.headers.get("sec-fetch-site") === "cross-site") return respond({ message: "Open Home Rewards on Home Heat Planner and retry." }, 403);
  const user = await deps.getUser(request);
  if (!user) return respond({ message: "Sign in to keep your rewards private." }, 401);
  if (request.headers.get("x-account-user") !== user) return respond({ message: "Your signed-in account changed. Reload this page." }, 401);
  return user;
}
async function snapshot(user: string, deps: Dependencies): Promise<RewardsSnapshot> {
  const [wallet, draft] = await Promise.all([deps.store().read(user), deps.draft(user)]);
  return { ...wallet, tasks: rewardTasks(draft ?? emptyAssessment()), assessmentAvailable: deps.available() };
}
export function createRewardsHandler(deps: Dependencies) {
  return async (request: Request) => {
    try {
      const user = await identity(request, deps);
      if (user instanceof Response) return user;
      if (request.method === "GET") return respond(await snapshot(user, deps));
      if (request.method !== "POST") return respond({ message: "Method not allowed." }, 405);
      if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") return respond({ message: "Send a JSON reward request." }, 415);
      let value: unknown;
      try { value = JSON.parse(await boundedBody(request, 2000)); } catch { return respond({ message: "Review your reward request." }, 400); }
      if (!value || typeof value !== "object" || Array.isArray(value)) return respond({ message: "Invalid reward request." }, 400);
      const body = value as Record<string, unknown>;
      if (Object.keys(body).length !== 3 || body.action !== "redeem" || body.demoConsent !== true || !demoRewards.some(item => item.id === body.rewardId)) return respond({ message: "Choose a listed reward and acknowledge that coupons are demos." }, 400);
      if (await deps.store().redeem(user, String(body.rewardId)) === "insufficient") return respond({ message: "You need more coins for this demo coupon." }, 409);
      return respond(await snapshot(user, deps));
    } catch { return respond({ message: "Your rewards could not be loaded. Retry when connected; your saved balance is kept." }, 503); }
  };
}
export function createProofHandler(deps: Dependencies) {
  let active = 0;
  return async (request: Request) => {
    let admitted = false;
    try {
      const user = await identity(request, deps);
      if (user instanceof Response) return user;
      if (request.method !== "POST") return respond({ message: "Method not allowed." }, 405);
      if (!deps.available()) return respond({ message: "Photo assessment is unavailable. No coins have been awarded; try again later." }, 503);
      if (active >= 2) return respond({ message: "Photo assessment is busy. Try again shortly." }, 429);
      if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) return respond({ message: "Choose your task photos." }, 415);
      active++; admitted = true;
      let form: FormData;
      try { form = await boundedForm(request); }
      catch (error) { return respond({ message: error instanceof RangeError ? "Choose smaller photos and retry." : "Choose your task photos again." }, error instanceof RangeError ? 413 : 400); }
      const taskId = form.get("taskId"), notes = form.get("notes"), consent = form.get("consent");
      if (typeof taskId !== "string" || typeof notes !== "string" || notes.length > 500 || consent !== "yes" || [...form.keys()].some(key => !["taskId", "notes", "consent", "photo1", "photo2"].includes(key)) || [...form.keys()].some(key => form.getAll(key).length !== 1)) return respond({ message: "Choose a task, add your photos and consent to photo assessment." }, 400);
      const task = rewardTasks(await deps.draft(user) ?? emptyAssessment()).find(item => item.id === taskId);
      if (!task) return respond({ message: "This task is no longer in your saved recommendations. Refresh Home Rewards." }, 409);
      const files = [form.get("photo1"), ...(task.photoCount === 2 ? [form.get("photo2")] : [])];
      if (files.some(file => !(file instanceof File)) || task.photoCount === 1 && form.has("photo2")) return respond({ message: `Choose ${task.photoCount} task photo${task.photoCount === 2 ? "s" : ""}.` }, 400);
      let photos: ProofPhoto[];
      try { photos = await Promise.all((files as File[]).map(deps.prepare ?? prepareProofPhoto)); }
      catch { return respond({ message: "Use clear, still JPG, PNG or WebP photos under 1.5 MB each." }, 400); }
      if (new Set(photos.map(photo => photo.hash)).size !== photos.length) return respond({ message: "Choose different photos for the two views." }, 400);
      const store = deps.store();
      const attempt = await store.begin(user, task, photos.map(photo => photo.hash));
      const messages: Record<string, string> = { "already-claimed": "This task is already being checked or has earned its coins.", "duplicate-proof": "These photos were already used for another task. Take photos of this task.", limit: "You've reached today's 12 photo submissions. Try again tomorrow." };
      if (attempt.result !== "started") return respond({ message: messages[attempt.result] ?? "Refresh your rewards and retry." }, attempt.result === "limit" ? 429 : 409);
      let decision: PhotoDecision | null = null;
      try { decision = await deps.assess(task, photos, notes); } catch { /* An unavailable assessment never awards coins. */ }
      await store.finish(user, attempt.id, decision ? decision.decision === "approve" ? "approved" : "needs-evidence" : "unavailable", decision?.reason ?? "service-unavailable");
      return respond(await snapshot(user, deps));
    } catch { return respond({ message: "Your photo assessment could not finish. Refresh to check its status before retrying." }, 503); }
    finally { if (admitted) active--; }
  };
}
