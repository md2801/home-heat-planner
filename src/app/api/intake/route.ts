import { createHash } from "node:crypto";
import { isIntakeRequest } from "../../../contracts/intake";
import { suggestQuestion } from "../../../server/intake";
import { boundedBody } from "../../../server/request-body";
import { sameOriginRequest } from "../../../server/request-origin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, message: "Use assistance from this app." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const text = await boundedBody(request, 5000);
    const input: unknown = JSON.parse(text);
    if (!isIntakeRequest(input)) return Response.json({ ok: false, message: "Enter a short description and continue manually if needed." }, { status: 400 });
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    const result = await suggestQuestion(input, client);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ ok: false, message: "Assistance unavailable. Continue manually." }, { status: error instanceof RangeError ? 413 : 400 }); }
}
