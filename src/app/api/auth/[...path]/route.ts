import { serverAuth } from "@/lib/auth/server";
import { createAuthProxy } from "@/server/auth/proxy";
export const runtime = "nodejs";
const handle = createAuthProxy(() => serverAuth().handler(), process.env.NODE_ENV === "development", event => console.error("[auth]", JSON.stringify(event)));
export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
