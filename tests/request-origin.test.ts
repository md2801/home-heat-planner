import test from "node:test";
import assert from "node:assert/strict";
import { sameOriginRequest } from "../src/server/request-origin.ts";
const request = (origin?: string, host = "127.0.0.1:3002", extra = {}) => new Request("http://localhost:3002/api/room-scene", { headers: { host, ...(origin === undefined ? {} : { origin }), ...extra } });
test("browser origin matches actual Host even when Next's internal URL uses localhost", () => {
  assert.equal(sameOriginRequest(request("http://127.0.0.1:3002")), true);
  assert.equal(sameOriginRequest(request("http://localhost:3002", "localhost:3002")), true);
  assert.equal(sameOriginRequest(request(undefined)), true);
  assert.equal(sameOriginRequest(new Request("https://example.org/api/intake", { headers: { origin: "https://example.org", host: "example.org:443" } })), true);
});
test("cross-origin, port/scheme mismatches, malformed hosts and spoofed forwarded hosts stay blocked", () => {
  for (const origin of ["http://localhost:3002", "http://127.0.0.1:3001", "https://127.0.0.1:3002", "https://example.org", "null", "", "http://127.0.0.1:3002/", "http://user@127.0.0.1:3002"]) assert.equal(sameOriginRequest(request(origin)), false);
  for (const host of ["example.org,127.0.0.1:3002", "user@127.0.0.1:3002", "127.0.0.1:3002/path", "127.0.0.1:3002\\path", "", "127.0.0.1:99999"]) assert.equal(sameOriginRequest(request("http://127.0.0.1:3002", host)), false);
  assert.equal(sameOriginRequest(request("https://example.org", "127.0.0.1:3002", { "x-forwarded-host": "example.org" })), false);
});
