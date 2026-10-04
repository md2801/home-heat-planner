import { createJourneyHandlers } from "../../../server/journey/http.ts";
import { journeyService } from "../../../server/journey/runtime.ts";
export const runtime = "nodejs";
export const POST = createJourneyHandlers(journeyService).create;
