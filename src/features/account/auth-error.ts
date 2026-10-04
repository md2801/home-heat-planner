/** The Neon SDK may return API errors or throw them; both use this bounded copy. */
export function authErrorMessage(error: unknown, mode: "sign-in" | "sign-up" | "forgot"): string {
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
  if (status === 429) return "Too many attempts. Wait a little, then try again.";
  if (mode === "sign-in" && status === 401) return "The email or password doesn’t match. Try again or reset your password.";
  if (mode === "sign-up" && typeof status === "number" && status < 500) return "We couldn’t create this account. Check your details, or sign in if you already have an account.";
  return "We couldn’t complete this request. Your details are still here; please retry.";
}
