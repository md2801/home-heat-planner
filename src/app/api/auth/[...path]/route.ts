import { serverAuth } from "@/lib/auth/server";
export const runtime = "nodejs";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const handlers = serverAuth().handler();
    const handler = handlers[request.method as keyof typeof handlers];
    if (!handler) return Response.json({ message: "Method not allowed." }, { status: 405 });
    const response = await handler(request, context);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return Response.json({ message: "Sign-in is temporarily unavailable. Please retry." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
