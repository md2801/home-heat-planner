import { createJourneyHandlers } from "../../../../../server/journey/http.ts";
import { journeyService } from "../../../../../server/journey/runtime.ts";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createJourneyHandlers(journeyService).checkIn(request, (await context.params).id);
}
