import { createHash } from "node:crypto";
import { isEnergyAnalysisInput } from "@/contracts/energy-analysis";
import { analyseEnergyBill } from "@/server/energy-assistant";
import { boundedBody } from "@/server/request-body";
import { sameOriginRequest } from "@/server/request-origin";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, message: "Open Energy Assistant in this app." }, { status: 403, headers });
  try {
    const input: unknown = JSON.parse(await boundedBody(request, 240000));
    if (!isEnergyAnalysisInput(input)) return Response.json({ ok: false, message: "Review your bill details before requesting an explanation." }, { status: 400, headers });
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    return Response.json({ ok: true, advice: await analyseEnergyBill(input, client) }, { headers });
  } catch (error) { return Response.json({ ok: false, message: error instanceof RangeError ? "This bill has too much text to analyse." : "The full bill explanation couldn't finish. Retry below; your confirmed figures and practical starting points are still here." }, { status: error instanceof RangeError ? 413 : 503, headers }); }
}
