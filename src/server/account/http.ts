import { sameOriginRequest } from "../request-origin.ts";
import { boundedBody } from "../request-body.ts";
import { validAccountDraft, type createAccountStore } from "./store.ts";

type Store = ReturnType<typeof createAccountStore>;
export function createAccountHandler(getUserId: (request: Request) => Promise<string | null>, getStore: () => Store) {
  return async (request: Request) => {
    const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie", "Referrer-Policy": "no-referrer" } });
    if (!sameOriginRequest(request) || request.headers.get("sec-fetch-site") === "cross-site") return respond({ message: "Open this page on Home Heat Planner and retry." }, 403);
    try {
      const userId = await getUserId(request);
      if (!userId) return respond({ message: "Sign in to access your saved journey." }, 401);
      // A shared browser can change its cookie in another tab. Never apply the old tab's draft to the new account.
      if (request.headers.get("x-account-user") !== userId) return respond({ message: "Your signed-in account changed. Reload this page before saving." }, 401);
      const store = getStore();
      if (request.method === "GET") return respond(await store.load(userId));
      if (request.method !== "PUT") return respond({ message: "Method not allowed." }, 405);
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return respond({ message: "Send a JSON journey." }, 415);
      let body: unknown;
      try { body = JSON.parse(await boundedBody(request, 512000)); }
      catch (error) { return respond({ message: error instanceof RangeError ? "This journey is too large to save." : "Review the journey and retry." }, error instanceof RangeError ? 413 : 400); }
      if (typeof body !== "object" || body === null || Array.isArray(body)) return respond({ message: "Invalid journey." }, 400);
      const value = body as Record<string, unknown>;
      if (Object.keys(value).length !== 2 || !validAccountDraft(value.draft) || typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0) return respond({ message: "Invalid journey." }, 400);
      const revision = await store.save(userId, value.draft, value.revision);
      if (revision === null) return respond({ message: "Your account has a newer saved journey. Choose which version to keep." }, 409);
      return respond({ saved: true, revision });
    } catch {
      // Never log credentials, room details or provider diagnostics.
      return respond({ message: "Account saving is unavailable. Your progress stays on this device; retry when connected." }, 503);
    }
  };
}
