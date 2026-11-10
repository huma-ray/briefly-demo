import { test } from "node:test";
import assert from "node:assert/strict";

const { isPrivateAddress, checkBaseUrl }: typeof import("./endpoint") = await import(new URL("./endpoint.ts", import.meta.url).href);
const { encryptSecret, decryptSecret }: typeof import("./secret") = await import(new URL("./secret.ts", import.meta.url).href);

test("private, loopback, link-local and mapped addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.5", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"])
    assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.113.200", "2606:4700:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip);
  assert.equal(isPrivateAddress("not-an-ip"), true);
});

test("base URL rules", () => {
  const pub = { allowPrivate: false };
  assert.deepEqual(checkBaseUrl("https://llm.example.com/v1/", pub), { ok: true, url: "https://llm.example.com/v1" });
  assert.equal(checkBaseUrl("http://llm.example.com/v1", pub).ok, false); // https only in public mode
  assert.equal(checkBaseUrl("https://localhost:4000/v1", pub).ok, false);
  assert.equal(checkBaseUrl("https://169.254.169.254/latest", pub).ok, false);
  assert.equal(checkBaseUrl("https://[::1]/v1", pub).ok, false);
  assert.equal(checkBaseUrl("https://user:pw@llm.example.com", pub).ok, false);
  assert.equal(checkBaseUrl("ftp://llm.example.com", pub).ok, false);
  assert.equal(checkBaseUrl("nonsense", pub).ok, false);
  assert.deepEqual(checkBaseUrl("http://localhost:4000/v1", { allowPrivate: true }), { ok: true, url: "http://localhost:4000/v1" });
});

test("API keys round-trip and fail with the wrong secret", () => {
  const secret = "a-long-enough-test-secret";
  const sealed = encryptSecret("sk-live-123456", secret);
  assert.notEqual(sealed, "sk-live-123456");
  assert.equal(decryptSecret(sealed, secret), "sk-live-123456");
  assert.throws(() => decryptSecret(sealed, "another-long-test-secret"));
  assert.throws(() => encryptSecret("x", "short"));
});
