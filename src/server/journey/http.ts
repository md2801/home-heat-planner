import { boundedBody } from "../request-body.ts";
import { sameOriginRequest } from "../request-origin.ts";
import type { JourneyService } from "./service.ts";
import { JourneyError, validAccessToken } from "./service.ts";
import { isJourneyInput, isPlanSaveRequest, isCheckInSaveRequest } from "./validation.ts";

const headers = { "Cache-Control": "private, no-store", "Vary": "Authorization", "Referrer-Policy": "no-referrer" };
function response(value: unknown, status = 200) { return Response.json(value, { status, headers }); }
function accessToken(request: Request): string {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("authorization") ?? "");
  if (!match?.[1] || !validAccessToken(match[1])) throw new JourneyError(401, "unauthorized", "An assessment access token is required.");
  return match[1];
}
async function body(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") throw new JourneyError(415, "unsupported-media-type", "Send journey values as application/json.");
  try { return JSON.parse(await boundedBody(request, 128000)); }
  catch (error) { throw new JourneyError(error instanceof RangeError ? 413 : 400, "invalid-input", "Invalid journey request."); }
}
export function createJourneyHandlers(getService: () => JourneyService) {
  async function handle(request: Request, operation: () => Promise<Response>) {
    try {
      if (!sameOriginRequest(request)) throw new JourneyError(403, "forbidden", "Use the same site to save or restore a journey.");
      return await operation();
    } catch (error) {
      const failure = error instanceof JourneyError ? error : new JourneyError(503, "unavailable", "Journey saving is unavailable. Keep your local progress and retry later.");
      // Never expose/log credentials, request bodies or database diagnostics.
      return response({ ok: false, error: { code: failure.code, message: failure.message, retryable: failure.status === 503 || failure.status === 409 } }, failure.status);
    }
  }
  return {
    create: (request: Request) => handle(request, async () => {
      const id = new URL(request.url).searchParams.get("assessmentId");
      const token = id !== null ? accessToken(request) : null;
      const input = await body(request);
      if (!isJourneyInput(input)) throw new JourneyError(400, "invalid-input", "Invalid assessment request.");
      const service = getService();
      return response(id !== null ? await service.saveAssessment(id, token!, input) : await service.create(input), id !== null ? 200 : 201);
    }),
    restore: (request: Request, id: string) => handle(request, async () => {
      const token = accessToken(request);
      return response({ assessmentId: id, ...await getService().restore(id, token) });
    }),
    plan: (request: Request, id: string) => handle(request, async () => {
      const token = accessToken(request);
      const input = await body(request);
      if (!isPlanSaveRequest(input, id)) throw new JourneyError(400, "invalid-input", "Invalid plan request.");
      return response(await getService().savePlan(id, token, input));
    }),
    checkIn: (request: Request, id: string) => handle(request, async () => {
      const token = accessToken(request);
      const input = await body(request);
      if (!isCheckInSaveRequest(input, id)) throw new JourneyError(400, "invalid-input", "Invalid check-in request.");
      return response(await getService().saveCheckIn(id, token, input));
    }),
    clear: (request: Request, id: string) => handle(request, async () => {
      const token = accessToken(request);
      return response(await getService().clear(id, token));
    }),
  };
}
