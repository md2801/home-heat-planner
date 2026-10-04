export type AuthEnvironment = Record<string, string | undefined>;

export class AuthConfigurationError extends Error {
  readonly code = "AUTH_NOT_CONFIGURED";
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) {
    super(`Authentication setup: ${issues.join("; ")}`);
    this.name = "AuthConfigurationError";
    this.issues = issues;
  }
}

/** Configuration errors contain setting names and checks, never their values. */
export function authConfiguration(environment: AuthEnvironment) {
  const baseUrl = environment.NEON_AUTH_BASE_URL?.trim();
  const secret = environment.NEON_AUTH_COOKIE_SECRET;
  const issues: string[] = [];
  if (!baseUrl) issues.push("NEON_AUTH_BASE_URL is missing");
  else {
    try {
      const url = new URL(baseUrl);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { issues.push("NEON_AUTH_BASE_URL must be an HTTPS Auth URL without credentials, query or fragment"); }
  }
  if (!secret?.trim()) issues.push("NEON_AUTH_COOKIE_SECRET is missing");
  else if (secret.trim().length < 32) issues.push("NEON_AUTH_COOKIE_SECRET must contain at least 32 characters");
  if (issues.length) throw new AuthConfigurationError(issues);
  return { baseUrl: baseUrl!, cookies: { secret: secret! } };
}
