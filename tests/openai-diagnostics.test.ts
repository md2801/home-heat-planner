import test from "node:test";
import assert from "node:assert/strict";
import { openAIDiagnostic, openAIExceptionBoundary, responseOutput } from "../src/server/openai-diagnostics.ts";
import { generateRoomScene } from "../src/server/room-scene.ts";
import { suggestQuestion } from "../src/server/intake.ts";
import { emptyScene } from "../src/contracts/room-scene.ts";

// Isolated process, synthetic credential only. Never loads an environment file.
process.env.OPEN_AI_KEY = "synthetic-test-only";
process.env.AI_MAX_REQUESTS = "50";
delete process.env.VERCEL;

test("diagnostics log only allowlisted metadata even when errors contain private text", () => {
  const lines: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => { lines.push(args.join(" ")); };
  try {
    const privateText = "SYNTHETIC_PRIVATE_ERROR_TEXT";
    openAIDiagnostic({ endpoint: "room-scene", model: "gpt-6-luna" }, "provider-http", new Response(null, { status: 401, headers: { "x-request-id": "req_0123456789abcdef0123456789abcdef" } }), { error: { code: "invalid_api_key", type: "authentication_error", message: privateText, headers: privateText }, prompt: privateText });
    openAIDiagnostic({ endpoint: "intake", model: "gpt-6-luna" }, "network", undefined, { error: { code: privateText, type: privateText }, status: privateText }, { message: privateText, cause: { code: "EACCES", message: privateText } });
    assert.match(lines[0]!, /invalid_api_key/);
    assert.match(lines[0]!, /req_0123456789abcdef0123456789abcdef/);
    assert.match(lines[1]!, /EACCES/);
    assert.doesNotMatch(lines.join(" "), /SYNTHETIC_PRIVATE_ERROR_TEXT|prompt|headers|message/);
  } finally { console.warn = warn; }
});

test("response extraction tolerates malformed envelopes and detects refusal separately", () => {
  for (const value of [null, "bad", { output: [null, { content: null }, { content: [null] }] }]) assert.equal(responseOutput(value).text, undefined);
  assert.equal(responseOutput({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "private text" }] }] }).refused, true);
  assert.equal(openAIExceptionBoundary(new DOMException("private text", "TimeoutError")), "timeout");
  assert.equal(openAIExceptionBoundary(new TypeError("private text")), "network");
});

test("both providers distinguish HTTP, incomplete, refusal, parsing, validation and connection boundaries", async () => {
  const lines: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => { lines.push(args.join(" ")); };
  const cases: { boundary: string; call: typeof fetch }[] = [
    { boundary: "provider-http", call: async () => Response.json({ error: { code: "invalid_api_key", type: "authentication_error", message: "private text" } }, { status: 401 }) },
    { boundary: "provider-http", call: async () => Response.json({ error: { code: "insufficient_quota", type: "insufficient_quota" } }, { status: 429 }) },
    { boundary: "provider-http", call: async () => Response.json({ error: { code: "model_not_found", type: "invalid_request_error" } }, { status: 404 }) },
    { boundary: "provider-http", call: async () => Response.json({ error: { code: "invalid_json_schema", type: "invalid_request_error" } }, { status: 400 }) },
    { boundary: "incomplete", call: async () => Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }) },
    { boundary: "refusal", call: async () => Response.json({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "private text" }] }] }) },
    { boundary: "missing-output", call: async () => Response.json({ status: "completed", output: [] }) },
    { boundary: "response-json", call: async () => new Response("not-json") },
    { boundary: "output-json", call: async () => Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: "not-json" }] }] }) },
    { boundary: "validation", call: async () => Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: '{"invented":true}' }] }] }) },
    { boundary: "timeout", call: async () => { throw new DOMException("private text", "TimeoutError"); } },
    { boundary: "network", call: async () => { throw new TypeError("private text", { cause: { code: "EACCES" } }); } },
  ];
  try {
    for (const [i, item] of cases.entries()) {
      const scene = await generateRoomScene({ description: "Synthetic diagnostic fixture", current: emptyScene() }, `scene-diagnostic-${i}`, item.call);
      const intake = await suggestQuestion({ complaint: `Synthetic diagnostic fixture ${i}`, allowedQuestionIds: ["heatTiming"] }, `intake-diagnostic-${i}`, item.call);
      assert.equal(scene.ok, false); assert.equal(intake.ok, false);
      assert.ok(lines.at(-2)?.includes(`"boundary":"${item.boundary}"`));
      assert.ok(lines.at(-1)?.includes(`"boundary":"${item.boundary}"`));
    }
    assert.doesNotMatch(lines.join(" "), /private text|Synthetic diagnostic fixture|synthetic-test-only/);
  } finally { console.warn = warn; }
});
