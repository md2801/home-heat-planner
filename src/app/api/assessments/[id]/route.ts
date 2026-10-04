import { createJourneyHandlers } from "../../../../server/journey/http.ts";
import { journeyService } from "../../../../server/journey/runtime.ts";
export const runtime = "nodejs";
const handlers = createJourneyHandlers(journeyService);
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return handlers.restore(request, (await context.params).id); }
export async function DELETE(request: Request, context: Context) { return handlers.clear(request, (await context.params).id); }
