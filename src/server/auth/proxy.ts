import { AuthConfigurationError } from "../../lib/auth/config.ts";

type Context = { params: Promise<{ path: string[] }> };
type Handler = (request: Request, context: Context) => Promise<Response>;
type Handlers = Partial<Record<"GET" | "POST" | "PUT" | "DELETE" | "PATCH", Handler>>;

export function createAuthProxy(getHandlers: () => Handlers, development: boolean, report: (event: { boundary: "configuration" | "request"; issues?: readonly string[] }) => void) {
  return async (request: Request, context: Context) => {
    try {
      const handlers = getHandlers();
      const handler = handlers[request.method as keyof Handlers];
      if (!handler) return Response.json({ message: "Method not allowed." }, { status: 405 });
      const response = await handler(request, context);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    } catch (error) {
      const missingConfiguration = error instanceof AuthConfigurationError;
      report(missingConfiguration ? { boundary: "configuration", issues: error.issues } : { boundary: "request" });
      return Response.json({
        code: missingConfiguration ? "AUTH_NOT_CONFIGURED" : "AUTH_UNAVAILABLE",
        message: missingConfiguration
          ? development ? "Local sign-in needs setup. Run npm run setup:auth, then restart the development server." : "Sign-in is not configured on this server. Ask the site owner to finish setup."
          : "Sign-in is temporarily unavailable. Please retry.",
      }, { status: 503, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    }
  };
}
