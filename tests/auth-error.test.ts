import { test } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "../src/features/account/auth-error.ts";
test("returned and thrown auth failures use useful copy without leaking provider details", () => {
  assert.match(authErrorMessage({ status: 401 }, "sign-in"), /doesn’t match/);
  const thrown = Object.assign(new Error("secret provider details"), { status: 429 });
  assert.match(authErrorMessage(thrown, "sign-in"), /Too many attempts/);
  assert.ok(!authErrorMessage(thrown, "sign-in").includes("secret"));
  assert.match(authErrorMessage({ status: 422 }, "sign-up"), /Check your details/);
  assert.match(authErrorMessage(new Error("network"), "forgot"), /retry/);
});

test("both sign-in methods distinguish local setup failures without exposing arbitrary diagnostics", () => {
  for (const mode of ["sign-in", "google"] as const) {
    assert.match(authErrorMessage({ status: 503, code: "AUTH_NOT_CONFIGURED" }, mode), /not configured/);
    const normalized = Object.assign(new Error("Local sign-in needs setup. Run npm run setup:auth, then restart the development server."), { status: 503, code: "feature_not_supported" });
    assert.match(authErrorMessage(normalized, mode), /npm run setup:auth/);
    const unavailable = authErrorMessage({ status: 503, message: "secret upstream credentials" }, mode);
    assert.match(unavailable, /temporarily unavailable/);
    assert.ok(!unavailable.includes("credentials"));
  }
});
