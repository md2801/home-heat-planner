import { createHash } from "node:crypto";
import { calculationDraft } from "../../../contracts/journey";
import { isPlannerCommand } from "../../../contracts/validation";
import { coolingResearchContext } from "../../../features/cooling-options/research-context";
import { searchCoolingGuidance } from "../../../server/cooling-research";
import { boundedBody } from "../../../server/request-body";
import { sameOriginRequest } from "../../../server/request-origin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOriginRequest(request)) return Response.json({ ok: false }, { status: 403, headers });
  try {
    const input: unknown = JSON.parse(await boundedBody(request, 128000));
    if (!input || typeof input !== "object" || Object.keys(input).length !== 1 || !("command" in input) || !isPlannerCommand(input.command) || input.command.operation !== "recommend") return Response.json({ ok: false }, { status: 400, headers });
    // Eligibility and the minimal provider context are recomputed from validated answers.
    const context = coolingResearchContext(calculationDraft(input.command.assessment));
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    return Response.json(await searchCoolingGuidance(context, client), { headers });
  } catch (error) { return Response.json({ ok: false }, { status: error instanceof RangeError ? 413 : 400, headers }); }
}
