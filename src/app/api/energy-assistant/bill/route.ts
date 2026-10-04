import { createHash } from "node:crypto";
import { boundedPdfBytes, readBillPdf } from "@/server/energy-pdf";
import { extractBill } from "@/server/energy-assistant";
import { sameOriginRequest } from "@/server/request-origin";
import { EnergyError, energyFailure, energyMessages } from "@/server/energy-diagnostics";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return Response.json({ ok: false, message: "Open Energy Assistant in this app." }, { status: 403, headers });
  if (request.headers.get("content-type") !== "application/pdf") { const error = energyFailure("FILE_VALIDATION_FAILED", energyMessages.file, 415); return Response.json({ ok: false, message: error.message }, { status: error.status, headers }); }
  try {
    const bytes = await boundedPdfBytes(request);
    const text = await readBillPdf(bytes);
    const client = createHash("sha256").update(process.env.VERCEL ? request.headers.get("x-forwarded-for") ?? "unknown" : "local-demo").digest("hex");
    const bill = await extractBill(text, client);
    return Response.json({ ok: true, bill, billText: text }, { headers });
  } catch (error) { return Response.json({ ok: false, message: error instanceof EnergyError ? error.message : energyMessages.provider }, { status: error instanceof EnergyError ? error.status : 503, headers }); }
}
