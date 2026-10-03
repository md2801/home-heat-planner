/** Server-only metadata. Never log prompts, output, error messages, headers or credentials. */
export type OpenAIBoundary = "missing-config" | "hosting-guard" | "local-limit" | "provider-http" | "timeout" | "network" | "response-json" | "incomplete" | "refusal" | "missing-output" | "output-json" | "validation" | "success";
type Context = { endpoint: "intake" | "room-scene" | "financial-brief" | "cooling-research"; model: "gpt-4.1-mini" | "gpt-6-luna" | "gpt-5.5" };
const errorCodes = new Set(["invalid_api_key", "insufficient_quota", "model_not_found", "invalid_json_schema", "unsupported_value", "unsupported_parameter", "invalid_request_error", "rate_limit_exceeded", "permission_denied", "access_denied", "billing_hard_limit_reached", "organization_restricted"]);
const errorTypes = new Set(["invalid_request_error", "authentication_error", "permission_error", "rate_limit_error", "server_error", "insufficient_quota"]);
const statuses = new Set(["completed", "incomplete", "failed", "cancelled", "queued", "in_progress"]);
const incompleteReasons = new Set(["max_output_tokens", "content_filter"]);
const errorParams = new Set(["model", "tools", "tools[0].type", "tools[0].filters", "tools[0].search_context_size", "text.format", "text.format.type", "text.format.schema", "max_tool_calls", "tool_choice", "include"]);
const networkCodes = new Set(["EACCES", "EPERM", "ENETUNREACH", "EHOSTUNREACH", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "ERR_INVALID_CHAR", "UND_ERR_INVALID_ARG", "CERT_HAS_EXPIRED", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID", "SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT"]);
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const member = (value: unknown, allowed: Set<string>) => typeof value === "string" && allowed.has(value) ? value : undefined;
export function openAIDiagnostic(context: Context, boundary: OpenAIBoundary, response?: Response, body?: unknown, error?: unknown) {
  const value = record(body), providerError = record(value.error), cause = record(record(error).cause);
  const errorMessage = typeof providerError.message === "string" ? providerError.message : "";
  const requestId = response?.headers.get("x-request-id");
  const metadata = {
    ...context, boundary,
    ...(response ? { httpStatus: response.status } : {}),
    ...(requestId && /^req_[a-f0-9]{16,64}$/i.test(requestId) ? { requestId } : {}),
    errorCode: member(providerError.code, errorCodes), errorType: member(providerError.type, errorTypes), errorParam: member(providerError.param, errorParams),
    errorHint: /web.?search.*(?:json|structured)|(?:json|structured).*web.?search/i.test(errorMessage) ? "search-format-combination" : /(?:not supported|unsupported)/i.test(errorMessage) ? "unsupported-feature" : undefined,
    responseStatus: member(value.status, statuses), incompleteReason: member(record(value.incomplete_details).reason, incompleteReasons),
    networkCode: member(cause.code, networkCodes) ?? member(record(error).code, networkCodes),
  };
  if (boundary === "success") console.info("[openai]", JSON.stringify(metadata));
  else console.warn("[openai]", JSON.stringify(metadata));
}
export function openAIExceptionBoundary(error: unknown): "timeout" | "network" {
  return ["TimeoutError", "AbortError"].includes(String(record(error).name)) ? "timeout" : "network";
}
export function responseOutput(body: unknown): { status: string | undefined; text: string | undefined; refused: boolean } {
  const data = record(body);
  const contents = Array.isArray(data.output) ? data.output.flatMap(item => { const content = record(item).content; return Array.isArray(content) ? content : []; }).map(record) : [];
  const text = contents.find(item => item.type === "output_text")?.text;
  return { status: typeof data.status === "string" ? data.status : undefined, text: typeof text === "string" ? text : undefined, refused: contents.some(item => item.type === "refusal") };
}
