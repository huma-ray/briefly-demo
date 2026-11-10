import { test } from "node:test";
import assert from "node:assert/strict";

const { costUsd, priceOf }: typeof import("./pricing") = await import(new URL("./pricing.ts", import.meta.url).href);

test("gpt-4o-mini costs $0.15 / $0.60 per 1M tokens", () => {
  assert.deepEqual(priceOf("gpt-4o-mini"), { input: 0.15, output: 0.6 });
  assert.equal(costUsd("gpt-4o-mini", 1_000_000, 1_000_000), 0.75);
  assert.ok(Math.abs(costUsd("gpt-4o-mini", 2_000, 500) - 0.0006) < 1e-12);
  assert.equal(costUsd("gpt-4o-mini", 0, 0), 0);
});

test("unknown model throws", () => {
  assert.throws(() => costUsd("nope", 1, 1), /No price for model/);
});
