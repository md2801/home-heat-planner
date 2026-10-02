/** Enforce the byte limit while streaming, before retaining an entire request. */
export async function boundedBody(request: Request, limit: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new RangeError("Request too large"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}
