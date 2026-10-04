import { createHash } from "node:crypto";
import { isChatRequest } from "@/contracts/energy-assistant";
import { answerEnergy } from "@/server/energy-assistant";
import { boundedBody } from "@/server/request-body";
import { sameOriginRequest } from "@/server/request-origin";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, message: "Open Energy Assistant in this app." }, { status: 403, headers });
  try {
    const input: unknown = JSON.parse(await boundedBody(request, 40000));
    if (!isChatRequest(input)) return Response.json({ ok: false, message: "Enter a short household-energy question." }, { status: 400, headers });
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    return Response.json({ ok: true, answer: await answerEnergy(input, client) }, { headers });
  } catch (error) { return Response.json({ ok: false, message: error instanceof RangeError ? "That message is too long." : "Energy assistance is unavailable. Retry or browse Simple techniques." }, { status: error instanceof RangeError ? 413 : 503, headers }); }
}
