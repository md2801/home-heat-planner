import { createHash } from "node:crypto";
import { isSceneRequest } from "../../../contracts/room-scene";
import { boundedBody } from "../../../server/request-body";
import { generateRoomScene } from "../../../server/room-scene";
import { sameOriginRequest } from "../../../server/request-origin";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, message: "Open the diagram from this app." }, { status: 403, headers });
  try {
    const value: unknown = JSON.parse(await boundedBody(request, 8000));
    if (!isSceneRequest(value)) return Response.json({ ok: false, message: "Use a description of up to 1,000 characters and a valid room." }, { status: 400, headers });
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    return Response.json(await generateRoomScene(value, client), { headers });
  } catch (error) { return Response.json({ ok: false, message: "The diagram request could not be read. You can edit manually." }, { status: error instanceof RangeError ? 413 : 400, headers }); }
}
