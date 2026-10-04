import { createNeonAuth } from "@neondatabase/auth/next/server";
import { authConfiguration } from "./config.ts";

let instance: ReturnType<typeof createNeonAuth> | undefined;
export function serverAuth() {
  if (instance) return instance;
  instance = createNeonAuth(authConfiguration(process.env));
  return instance;
}
