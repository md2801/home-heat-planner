// Test process preload only. Production has no test switch or approval bypass.
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url === "https://api.openai.com/v1/responses" && typeof init?.body === "string") {
    const body = JSON.parse(init.body);
    if (body.text?.format?.name === "home_task_photo") {
      const text = body.input?.[0]?.content?.find(item => item.type === "input_text")?.text;
      const notes = JSON.parse(text ?? "{}").untrustedNotes ?? "";
      await new Promise(resolve => setTimeout(resolve, 4500));
      if (notes.includes("test: unavailable")) return Response.json({ error: { code: "rate_limit_exceeded" } }, { status: 429 });
      const decision = notes.includes("test: needs evidence") ? { decision: "needs-evidence", reason: "unclear" } : { decision: "approve", reason: "visible-action" };
      return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(decision) }] }] });
    }
  }
  return original(input, init);
};
