/** The Neon SDK may return API errors or throw them; both use this bounded copy. */
export function authErrorMessage(error: unknown, mode: "sign-in" | "sign-up" | "forgot" | "google"): string {
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  const message = typeof error === "object" && error !== null && "message" in error ? error.message : null;
  // The SDK normalizes unknown codes, but preserves this route's bounded setup message.
  if (status === 503 && typeof message === "string" && message.startsWith("Local sign-in needs setup.")) return "Local sign-in needs setup. Run npm run setup:auth, then restart the development server.";
  if (status === 503 && (code === "AUTH_NOT_CONFIGURED" || typeof message === "string" && message.startsWith("Sign-in is not configured on this server."))) return "Sign-in is not configured on this server yet. Ask the site owner to finish setup.";
  if (status === 503) return "Sign-in is temporarily unavailable on this server. Please retry later.";
  if (status === 429) return "Too many attempts. Wait a little, then try again.";
  if (mode === "google") return "Google sign-in couldn’t connect. Retry or use your email and password.";
  if (mode === "sign-in" && status === 401) return "The email or password doesn’t match. Try again or reset your password.";
  if (mode === "sign-up" && typeof status === "number" && status < 500) return "We couldn’t create this account. Check your details, or sign in if you already have an account.";
  return "We couldn’t complete this request. Your details are still here; please retry.";
}
