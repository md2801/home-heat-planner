import { executePlanner } from "../../../services/journey-adapters";
import { isPlannerCommand } from "../../../contracts/validation";
import { boundedBody } from "../../../server/request-body";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const text = await boundedBody(request, 128000);
    const input: unknown = JSON.parse(text);
    if (!isPlannerCommand(input)) return Response.json({ ok: false, error: { code: "invalid-input", message: "Invalid assessment request.", retryable: false } }, { status: 400 });
    return Response.json(executePlanner(input), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ ok: false, error: { code: "invalid-input", message: "Invalid assessment request.", retryable: false } }, { status: error instanceof RangeError ? 413 : 400 }); }
}
