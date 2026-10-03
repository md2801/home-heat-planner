import { createHash } from "node:crypto";
import { calculationDraft } from "../../../contracts/journey";
import { isPlannerCommand } from "../../../contracts/validation";
import { briefFocuses, financialBrief, type BriefFocus } from "../../../features/cooling-options/financial-brief";
import { orderFinancialBrief } from "../../../server/financial-brief";
import { boundedBody } from "../../../server/request-body";
import { sameOriginRequest } from "../../../server/request-origin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOriginRequest(request)) return Response.json({ ok: false }, { status: 403, headers });
  try {
    const input = JSON.parse(await boundedBody(request, 128000));
    if (!input || typeof input !== "object" || Object.keys(input).some(k => !["command", "focus"].includes(k)) || !isPlannerCommand(input.command) || !briefFocuses.includes(input.focus)) return Response.json({ ok: false }, { status: 400, headers });
    // Recompute all facts server-side; never trust client-supplied comparison amounts.
    const cards = financialBrief(calculationDraft(input.command.assessment));
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    return Response.json(await orderFinancialBrief(cards, input.focus as BriefFocus, client), { headers });
  } catch (error) { return Response.json({ ok: false }, { status: error instanceof RangeError ? 413 : 400, headers }); }
}
