import { createJourneyHandlers } from "../../../../../server/journey/http.ts";
import { journeyService } from "../../../../../server/journey/runtime.ts";
export const runtime = "nodejs";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return createJourneyHandlers(journeyService).plan(request, (await context.params).id);
}
