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
