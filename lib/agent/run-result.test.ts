import { test } from "node:test";
import assert from "node:assert/strict";

const { classifyRun }: typeof import("./run-result") = await import(new URL("./run-result.ts", import.meta.url).href);

const s = (...status: ("ok" | "error" | "blocked" | "pending")[]) => status.map((x) => ({ status: x }));

test("classifyRun precedence: blocked > error > await > read", () => {
  assert.equal(classifyRun(s(), false), "read");
  assert.equal(classifyRun(s("ok", "ok"), false), "read");
  assert.equal(classifyRun(s("ok", "pending"), false), "await");
  assert.equal(classifyRun(s("pending", "error"), false), "error");
  assert.equal(classifyRun(s("pending", "error", "blocked"), false), "blocked");
  assert.equal(classifyRun(s("ok"), true), "error");
  assert.equal(classifyRun(s("blocked"), true), "blocked");
});
