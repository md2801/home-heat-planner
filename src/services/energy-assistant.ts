import { isBill, MAX_BILL_TEXT, type BillResponse, type ChatMessage, type ChatResponse } from "../contracts/energy-assistant";
import { isEnergyAdvice, type EnergyAnalysisInput, type EnergyAnalysisResponse } from "../contracts/energy-analysis";
async function post(url: string, body: BodyInit, contentType: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body, signal, cache: "no-store" });
  return response.json() as Promise<unknown>;
}
function failure(v: unknown): { ok: false; message: string } {
  return { ok: false, message: v && typeof v === "object" && "message" in v && typeof v.message === "string" ? v.message : "Assistance couldn't finish. Retry or continue manually." };
}
export async function uploadBill(file: File, signal: AbortSignal): Promise<BillResponse> {
  const v = await post("/api/energy-assistant/bill", file, "application/pdf", signal);
  return v && typeof v === "object" && "ok" in v && v.ok === true && "bill" in v && isBill(v.bill) && "billText" in v && typeof v.billText === "string" && v.billText.length <= MAX_BILL_TEXT ? { ok: true, bill: v.bill, billText: v.billText } : failure(v);
}
export async function analyseBill(input: EnergyAnalysisInput, signal: AbortSignal): Promise<EnergyAnalysisResponse> {
  const result = await post("/api/energy-assistant/analysis", JSON.stringify(input), "application/json", signal);
  return result && typeof result === "object" && "ok" in result && result.ok === true && "advice" in result && isEnergyAdvice(result.advice) ? { ok: true, advice: result.advice } : failure(result);
}
export async function askEnergy(messages: ChatMessage[], signal: AbortSignal): Promise<ChatResponse> {
  const v = await post("/api/energy-assistant/chat", JSON.stringify({ mode: "general", messages }), "application/json", signal);
  return v && typeof v === "object" && "ok" in v && v.ok === true && "answer" in v && typeof v.answer === "string" && v.answer.length <= 3000 ? { ok: true, answer: v.answer } : failure(v);
}
