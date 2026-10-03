/** Next's internal request URL can use localhost even when the browser uses another host. */
export function sameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true; // Preserve non-browser/API clients; this is not authentication.
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    if (!host || /[\s,/@\\?#]/.test(host)) return false;
    const target = new URL(`${url.protocol}//${host}`);
    if (!["http:", "https:"].includes(target.protocol)) return false;
    // Do not trust arbitrary forwarded-host headers or introduce an extra-origin allowlist.
    return origin === target.origin;
  } catch { return false; }
}
