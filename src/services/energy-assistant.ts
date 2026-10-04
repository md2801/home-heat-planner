import { isBill, type BillResponse, type ChatMessage, type ChatResponse } from "../contracts/energy-assistant";
async function post(url: string, body: BodyInit, contentType: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body, signal, cache: "no-store" });
  return response.json() as Promise<unknown>;
}
function failure(v: unknown): { ok: false; message: string } {
  return { ok: false, message: v && typeof v === "object" && "message" in v && typeof v.message === "string" ? v.message : "Assistance couldn't finish. Retry or continue manually." };
}
export async function uploadBill(file: File, signal: AbortSignal): Promise<BillResponse> {
  const v = await post("/api/energy-assistant/bill", file, "application/pdf", signal);
  return v && typeof v === "object" && "ok" in v && v.ok === true && "bill" in v && isBill(v.bill) ? { ok: true, bill: v.bill } : failure(v);
}
export async function askEnergy(messages: ChatMessage[], signal: AbortSignal): Promise<ChatResponse> {
  const v = await post("/api/energy-assistant/chat", JSON.stringify({ mode: "general", messages }), "application/json", signal);
  return v && typeof v === "object" && "ok" in v && v.ok === true && "answer" in v && typeof v.answer === "string" && v.answer.length <= 3000 ? { ok: true, answer: v.answer } : failure(v);
}
